const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');
const { v4: uuidv4 } = require('uuid');

class ChatRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sqlRequests = new QueryHelper('chat_requests');
    this.sqlConversations = new QueryHelper('conversations');
    this.sqlMembers = new QueryHelper('conversation_members');
    this.sqlMessages = new QueryHelper('messages');
    this.sqlAttachments = new QueryHelper('message_attachments');
    this.sqlReceipts = new QueryHelper('message_receipts');
    this.sqlBlocks = new QueryHelper('user_blocks');
    this.sqlUsers = new QueryHelper('users');
  }

  // ---- Requests ----
  async createChatRequest(senderUuid, receiverUuid) {
    const uuid = uuidv4();
    const query = this.sqlRequests.insert({
      uuid,
      sender_uuid: senderUuid,
      receiver_uuid: receiverUuid,
      status: 'pending'
    });
    const result = await this.execute(query);
    return result.rows[0];
  }

  async getChatRequest(uuid) {
    const query = this.sqlRequests
      .select()
      .field('*')
      .where('uuid', '=', uuid);
    return this.runQueryFirst(query);
  }

  async getChatRequests(userUuid) {
    const query = this.sqlRequests
      .select()
      .field('chat_requests.*')
      .field('s.email as sender_email')
      .field('sd.display_name as sender_name')
      .field('sd.profile_image_url as sender_image')
      .field('r.email as receiver_email')
      .field('rd.display_name as receiver_name')
      .field('rd.profile_image_url as receiver_image')
      .join('users as s', 'chat_requests.sender_uuid', 's.uuid')
      .leftJoin('user_details as sd', 's.uuid', 'sd.user_uuid')
      .join('users as r', 'chat_requests.receiver_uuid', 'r.uuid')
      .leftJoin('user_details as rd', 'r.uuid', 'rd.user_uuid')
      .whereRaw('(chat_requests.sender_uuid = ? OR chat_requests.receiver_uuid = ?)', [userUuid, userUuid])
      .orderBy('chat_requests.created_at', 'desc');

    return this.runQuery(query);
  }

  async updateChatRequestStatus(uuid, status) {
    const query = this.sqlRequests
      .update({ status, responded_at: new Date(), updated_at: new Date() })
      .where('uuid', '=', uuid);
    const result = await this.execute(query);
    return result.rows[0];
  }

  // ---- Conversations ----
  async createConversation(isGroup, createdByUuid = null, name = null, description = null, profileImageUrl = null) {
    const uuid = uuidv4();
    const query = this.sqlConversations.insert({
      uuid,
      is_group: isGroup,
      name,
      description,
      profile_image_url: profileImageUrl,
      created_by_uuid: createdByUuid
    });
    const result = await this.execute(query);
    return result.rows[0];
  }

  async addConversationMember(conversationUuid, userUuid) {
    const existing = await this.runQueryFirst(
      this.sqlMembers
        .select()
        .field('uuid')
        .where('conversation_uuid', '=', conversationUuid)
        .where('user_uuid', '=', userUuid)
    );

    if (existing) {
      const query = this.sqlMembers
        .update({ archived_at: null })
        .where('conversation_uuid', '=', conversationUuid)
        .where('user_uuid', '=', userUuid);
      const result = await this.execute(query);
      return result.rows[0];
    }

    const uuid = uuidv4();
    const query = this.sqlMembers.insert({
      uuid,
      conversation_uuid: conversationUuid,
      user_uuid: userUuid
    });
    const result = await this.execute(query);
    return result.rows[0];
  }

  async removeConversationMember(conversationUuid, userUuid) {
    const query = this.sqlMembers
      .update({ archived_at: new Date() })
      .where('conversation_uuid', '=', conversationUuid)
      .where('user_uuid', '=', userUuid);
    const result = await this.execute(query);
    return result.rows[0];
  }

  async getConversation(uuid) {
    const query = this.sqlConversations
      .select()
      .field('*')
      .where('uuid', '=', uuid)
      .whereNull('archived_at');
    return this.runQueryFirst(query);
  }

  async getUserConversations(userUuid) {
    const rows = await this.queryRaw(`
      SELECT
        c.*,
        cm.wallpaper_url,
        (
          SELECT json_agg(json_build_object('uuid', u.uuid, 'display_name', ud.display_name, 'profile_image_url', ud.profile_image_url))
          FROM conversation_members cm2
          JOIN users u ON cm2.user_uuid = u.uuid
          LEFT JOIN user_details ud ON u.uuid = ud.user_uuid
          WHERE cm2.conversation_uuid = c.uuid AND cm2.archived_at IS NULL
        ) AS members,
        (
          SELECT json_build_object(
            'uuid', m.uuid,
            'message', m.message,
            'sent_at', m.sent_at,
            'sender_uuid', m.sender_uuid,
            'attachments', (
              SELECT json_agg(json_build_object('attachment_type', ma.attachment_type, 'mime_type', ma.mime_type))
              FROM message_attachments ma WHERE ma.message_uuid = m.uuid AND ma.archived_at IS NULL
            ),
            'receipts', (
              SELECT json_agg(json_build_object('user_uuid', mr.user_uuid, 'delivered_at', mr.delivered_at, 'seen_at', mr.seen_at))
              FROM message_receipts mr WHERE mr.message_uuid = m.uuid
            )
          )
          FROM messages m
          WHERE m.conversation_uuid = c.uuid AND m.archived_at IS NULL
          ORDER BY m.sent_at DESC
          LIMIT 1
        ) AS last_message,
        (
          SELECT count(*)
          FROM messages m2
          LEFT JOIN message_receipts mr2 ON mr2.message_uuid = m2.uuid AND mr2.user_uuid = ?
          WHERE m2.conversation_uuid = c.uuid
            AND m2.sender_uuid != ?
            AND m2.archived_at IS NULL
            AND mr2.seen_at IS NULL
        ) AS unread_count
      FROM conversations c
      JOIN conversation_members cm ON c.uuid = cm.conversation_uuid
      WHERE cm.user_uuid = ?
        AND c.archived_at IS NULL
        AND cm.archived_at IS NULL
    `, [userUuid, userUuid, userUuid]);
    return rows;
  }
  
  async updateConversationWallpaper(conversationUuid, userUuid, wallpaperUrl) {
    const query = this.sqlMembers
      .update({ wallpaper_url: wallpaperUrl })
      .where('conversation_uuid', '=', conversationUuid)
      .where('user_uuid', '=', userUuid);
    const result = await this.execute(query);
    return result.rows[0];
  }
  
  async getExistingOneToOneConversation(user1, user2) {
    const query = this.sqlConversations
      .select()
      .field('conversations.uuid')
      .join('conversation_members as cm1', 'conversations.uuid', 'cm1.conversation_uuid')
      .join('conversation_members as cm2', 'conversations.uuid', 'cm2.conversation_uuid')
      .where('conversations.is_group', '=', false)
      .where('cm1.user_uuid', '=', user1)
      .whereNull('cm1.archived_at')
      .where('cm2.user_uuid', '=', user2)
      .whereNull('cm2.archived_at')
      .limit(1);
    return this.runQueryFirst(query);
  }

  // ---- Messages ----
  async createMessage(conversationUuid, senderUuid, messageText) {
    const uuid = uuidv4();
    const query = this.sqlMessages.insert({
      uuid,
      conversation_uuid: conversationUuid,
      sender_uuid: senderUuid,
      message: messageText
    });
    const result = await this.execute(query);
    return result.rows[0];
  }

  async getMessages(conversationUuid, limit = 50, cursor = null, after = null) {
    let sql = `
      SELECT
        m.*,
        (
          SELECT json_agg(json_build_object('user_uuid', mr.user_uuid, 'delivered_at', mr.delivered_at, 'seen_at', mr.seen_at))
          FROM message_receipts mr WHERE mr.message_uuid = m.uuid
        ) AS receipts,
        (
          SELECT json_agg(json_build_object(
            'uuid', ma.uuid,
            'file_name', ma.file_name,
            'original_file_name', ma.original_file_name,
            'mime_type', ma.mime_type,
            'file_size', ma.file_size,
            'attachment_type', ma.attachment_type,
            'width', ma.width,
            'height', ma.height,
            'preview_data', ma.preview_data
          ))
          FROM message_attachments ma WHERE ma.message_uuid = m.uuid AND ma.archived_at IS NULL
        ) AS attachments
      FROM messages m
      WHERE m.conversation_uuid = ?
        AND m.archived_at IS NULL
    `;
    const params = [conversationUuid];
    if (cursor) {
      sql += ` AND m.sent_at < ?`;
      params.push(cursor);
    }
    if (after) {
      sql += ` AND m.sent_at > ?`;
      params.push(after);
    }
    sql += ` ORDER BY m.sent_at DESC LIMIT ?`;
    params.push(limit);

    return await this.queryRaw(sql, params);
  }

  async getMessage(messageUuid) {
    const query = this.sqlMessages
      .select()
      .field('*')
      .where('uuid', '=', messageUuid)
      .whereNull('archived_at');
    return this.runQueryFirst(query);
  }
  
  async getAttachment(attachmentUuid) {
    const query = this.sqlAttachments
      .select()
      .field('*')
      .where('uuid', '=', attachmentUuid)
      .whereNull('archived_at');
    return this.runQueryFirst(query);
  }

  async createMessageAttachment(messageUuid, metadata) {
    const uuid = metadata.uuid || uuidv4();
    const query = this.sqlAttachments.insert({
      uuid,
      message_uuid: messageUuid,
      storage_key: metadata.storage_key,
      file_name: metadata.file_name,
      original_file_name: metadata.original_file_name,
      mime_type: metadata.mime_type,
      file_size: metadata.file_size,
      attachment_type: metadata.attachment_type,
      width: metadata.width || null,
      height: metadata.height || null,
      duration: metadata.duration || null,
      preview_data: metadata.preview_data || null
    });
    const result = await this.execute(query);
    return result.rows[0];
  }

  async deleteMessageAttachment(attachmentUuid) {
    const query = this.sqlAttachments
      .update({ archived_at: new Date(), updated_at: new Date() })
      .where('uuid', '=', attachmentUuid);
    const result = await this.execute(query);
    return result.rows[0];
  }
  
  async upsertMessageReceipt(messageUuid, userUuid, status) {
    const existing = await this.runQueryFirst(
      this.sqlReceipts
        .select()
        .field('uuid')
        .field('delivered_at')
        .field('seen_at')
        .where('message_uuid', '=', messageUuid)
        .where('user_uuid', '=', userUuid)
    );

    if (existing) {
      const payload = { updated_at: new Date() };
      if (status === 'seen') payload.seen_at = new Date();
      if (!existing.delivered_at || status === 'delivered') payload.delivered_at = new Date();

      const query = this.sqlReceipts
        .update(payload)
        .where('message_uuid', '=', messageUuid)
        .where('user_uuid', '=', userUuid);
      const result = await this.execute(query);
      return result.rows[0];
    }

    const payload = {
      uuid: uuidv4(),
      message_uuid: messageUuid,
      user_uuid: userUuid,
      delivered_at: new Date()
    };
    if (status === 'seen') {
      payload.seen_at = new Date();
    }
    
    try {
      const query = this.sqlReceipts.insert(payload);
      const result = await this.execute(query);
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        const refetched = await this.runQueryFirst(
          this.sqlReceipts
            .select()
            .field('uuid')
            .field('delivered_at')
            .field('seen_at')
            .where('message_uuid', '=', messageUuid)
            .where('user_uuid', '=', userUuid)
        );
          
        if (refetched) {
          const updatePayload = { updated_at: new Date() };
          if (status === 'seen') updatePayload.seen_at = new Date();
          if (!refetched.delivered_at || status === 'delivered') updatePayload.delivered_at = new Date();

          const query = this.sqlReceipts
            .update(updatePayload)
            .where('message_uuid', '=', messageUuid)
            .where('user_uuid', '=', userUuid);
          const result = await this.execute(query);
          return result.rows[0];
        }
      }
      throw err;
    }
  }

  async markOfflineMessagesAsDelivered(userUuid) {
    const messages = await this.queryRaw(`
      SELECT m.uuid AS message_uuid, m.conversation_uuid, mr.uuid AS existing_receipt_uuid
      FROM messages m
      JOIN conversation_members cm ON m.conversation_uuid = cm.conversation_uuid
      LEFT JOIN message_receipts mr ON mr.message_uuid = m.uuid AND mr.user_uuid = ?
      WHERE cm.user_uuid = ?
        AND m.sender_uuid != ?
        AND cm.archived_at IS NULL
        AND m.archived_at IS NULL
        AND mr.delivered_at IS NULL
    `, [userUuid, userUuid, userUuid]);

    if (!messages.length) return [];

    const toInsert = [];
    const toUpdate = [];
    const now = new Date();

    for (const msg of messages) {
      if (msg.existing_receipt_uuid) {
        toUpdate.push(msg.existing_receipt_uuid);
      } else {
        toInsert.push({
          uuid: uuidv4(),
          message_uuid: msg.message_uuid,
          user_uuid: userUuid,
          delivered_at: now
        });
      }
    }

    if (toInsert.length > 0) {
      await this.execute(this.sqlReceipts.insert(toInsert));
    }
    if (toUpdate.length > 0) {
      await this.execute(
        this.sqlReceipts.update({ delivered_at: now, updated_at: now }).whereIn('uuid', toUpdate)
      );
    }

    return messages.map(m => ({
      message_uuid: m.message_uuid,
      conversation_uuid: m.conversation_uuid,
      user_uuid: userUuid,
      status: 'delivered',
      delivered_at: now
    }));
  }

  // ---- Blocks ----
  async blockUser(blockerUuid, blockedUuid) {
    const existing = await this.runQueryFirst(
      this.sqlBlocks
        .select()
        .field('uuid')
        .where('blocker_uuid', '=', blockerUuid)
        .where('blocked_uuid', '=', blockedUuid)
    );

    if (existing) {
      const query = this.sqlBlocks
        .update({ archived_at: null, updated_at: new Date() })
        .where('blocker_uuid', '=', blockerUuid)
        .where('blocked_uuid', '=', blockedUuid);
      const result = await this.execute(query);
      return result.rows[0];
    }

    const uuid = uuidv4();
    const query = this.sqlBlocks.insert({
      uuid,
      blocker_uuid: blockerUuid,
      blocked_uuid: blockedUuid
    });
    const result = await this.execute(query);
    return result.rows[0];
  }

  async unblockUser(blockerUuid, blockedUuid) {
    const query = this.sqlBlocks
      .update({ archived_at: new Date(), updated_at: new Date() })
      .where('blocker_uuid', '=', blockerUuid)
      .where('blocked_uuid', '=', blockedUuid);
    const result = await this.execute(query);
    return result.rows[0];
  }
  
  async getBlockRecord(user1, user2) {
    const query = this.sqlBlocks
      .select()
      .field('*')
      .whereNull('archived_at')
      .whereRaw('((blocker_uuid = ? AND blocked_uuid = ?) OR (blocker_uuid = ? AND blocked_uuid = ?))', [user1, user2, user2, user1]);
    return this.runQuery(query);
  }

  async searchUsers(query = '', limit = 50) {
    const dataQuery = this.sqlUsers
      .select()
      .field('users.uuid')
      .field('users.email')
      .field('user_details.first_name')
      .field('user_details.last_name')
      .field('user_details.display_name')
      .field('user_details.profile_image_url')
      .leftJoin('user_details', 'users.uuid', 'user_details.user_uuid')
      .where('users.status', '=', 'active');

    if (query) {
      const pattern = `%${query}%`;
      dataQuery.whereRaw('(users.email ILIKE ? OR user_details.display_name ILIKE ? OR user_details.first_name ILIKE ? OR user_details.last_name ILIKE ?)', [pattern, pattern, pattern, pattern]);
    }

    dataQuery.limit(limit);
    return this.runQuery(dataQuery);
  }
}

module.exports = ChatRepository;
