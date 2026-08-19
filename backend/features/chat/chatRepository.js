const BaseRepository = require('../../base/baseRepository');
const { v4: uuidv4 } = require('uuid');

class ChatRepository extends BaseRepository {

  // ---- Requests ----
  async createChatRequest(senderUuid, receiverUuid) {
    const uuid = uuidv4();
    const result = await this.queryHelper
      .from('chat_requests')
      .insert({
        uuid,
        sender_uuid: senderUuid,
        receiver_uuid: receiverUuid,
        status: 'pending'
      })
      .execute();
    return result[0];
  }

  async getChatRequest(uuid) {
    const result = await this.queryHelper
      .from('chat_requests')
      .where('uuid', 'eq', uuid)
      .execute();
    return result[0];
  }

  async getChatRequests(userUuid) {
    const result = await this.queryHelper
      .from('chat_requests', 'cr')
      .field('cr.*')
      .field('s.email as sender_email')
      .field('sd.display_name as sender_name')
      .field('sd.profile_image_url as sender_image')
      .field('r.email as receiver_email')
      .field('rd.display_name as receiver_name')
      .field('rd.profile_image_url as receiver_image')
      .join('users', 's', 'cr.sender_uuid = s.uuid')
      .leftJoin('user_details', 'sd', 's.uuid = sd.user_uuid')
      .join('users', 'r', 'cr.receiver_uuid = r.uuid')
      .leftJoin('user_details', 'rd', 'r.uuid = rd.user_uuid')
      .where(`cr.sender_uuid = '${userUuid}' OR cr.receiver_uuid = '${userUuid}'`)
      .orderBy('cr.created_at', false)
      .execute();
    return result;
  }

  async updateChatRequestStatus(uuid, status) {
    const result = await this.queryHelper
      .from('chat_requests')
      .update({ status, responded_at: new Date(), updated_at: new Date() })
      .where('uuid', 'eq', uuid)
      .execute();
    return result[0];
  }

  // ---- Conversations ----
  async createConversation(isGroup, createdByUuid = null, name = null, description = null, profileImageUrl = null) {
    const uuid = uuidv4();
    const result = await this.queryHelper
      .from('conversations')
      .insert({
        uuid,
        is_group: isGroup,
        name,
        description,
        profile_image_url: profileImageUrl,
        created_by_uuid: createdByUuid
      })
      .execute();
    return result[0];
  }

  async addConversationMember(conversationUuid, userUuid) {
    const existing = await this.queryHelper
      .from('conversation_members')
      .where('conversation_uuid', 'eq', conversationUuid)
      .where('user_uuid', 'eq', userUuid)
      .execute();

    if (existing && existing.length > 0) {
      const result = await this.queryHelper
        .from('conversation_members')
        .update({ archived_at: null })
        .where('conversation_uuid', 'eq', conversationUuid)
        .where('user_uuid', 'eq', userUuid)
        .execute();
      return result[0];
    }

    const uuid = uuidv4();
    const result = await this.queryHelper
      .from('conversation_members')
      .insert({
        uuid,
        conversation_uuid: conversationUuid,
        user_uuid: userUuid
      })
      .execute();
    return result[0];
  }

  async removeConversationMember(conversationUuid, userUuid) {
    const result = await this.queryHelper
      .from('conversation_members')
      .update({ archived_at: new Date() })
      .where('conversation_uuid', 'eq', conversationUuid)
      .where('user_uuid', 'eq', userUuid)
      .execute();
    return result[0];
  }

  async getConversation(uuid) {
    const result = await this.queryHelper
      .from('conversations')
      .where('uuid', 'eq', uuid)
      .where('archived_at', 'is', null)
      .execute();
    return result[0];
  }

  async getUserConversations(userUuid) {
    const db = this.queryHelper.db;

    // Correlated subqueries for aggregated JSON columns — these reference the
    // outer query alias `c` and use Postgres JSON aggregate functions, which
    // cannot be expressed through the top-level queryHelper chain.
    const membersSubquery = db('conversation_members as cm2')
      .join('users as u', 'cm2.user_uuid', 'u.uuid')
      .leftJoin('user_details as ud', 'u.uuid', 'ud.user_uuid')
      .whereRaw('cm2.conversation_uuid = c.uuid')
      .whereNull('cm2.archived_at')
      .select(db.raw(`json_agg(json_build_object('uuid', u.uuid, 'display_name', ud.display_name, 'profile_image_url', ud.profile_image_url))`))
      .as('members');

    const lastMessageSubquery = db('messages as m')
      .whereRaw('m.conversation_uuid = c.uuid')
      .whereNull('m.archived_at')
      .orderBy('m.sent_at', 'desc')
      .limit(1)
      .select(db.raw(`
        json_build_object(
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
      `))
      .as('last_message');

    const unreadCountSubquery = db('messages as m2')
      .leftJoin(db.raw('message_receipts as mr2 on mr2.message_uuid = m2.uuid and mr2.user_uuid = ?', [userUuid]))
      .whereRaw('m2.conversation_uuid = c.uuid')
      .where('m2.sender_uuid', '!=', userUuid)
      .whereNull('m2.archived_at')
      .whereNull('mr2.seen_at')
      .count('*')
      .as('unread_count');

    const result = await this.queryHelper
      .from('conversations', 'c')
      .field('c.*')
      .field('cm.wallpaper_url')
      .field(membersSubquery)
      .field(lastMessageSubquery)
      .field(unreadCountSubquery)
      .join('conversation_members', 'cm', 'c.uuid = cm.conversation_uuid')
      .where('cm.user_uuid', 'eq', userUuid)
      .where('c.archived_at', 'is', null)
      .where('cm.archived_at', 'is', null)
      .execute();
    return result;
  }
  
  async updateConversationWallpaper(conversationUuid, userUuid, wallpaperUrl) {
    const result = await this.queryHelper
      .from('conversation_members')
      .update({ wallpaper_url: wallpaperUrl })
      .where('conversation_uuid', 'eq', conversationUuid)
      .where('user_uuid', 'eq', userUuid)
      .execute();
    return result[0];
  }
  
  async getExistingOneToOneConversation(user1, user2) {
    const result = await this.queryHelper
      .from('conversations', 'c')
      .field('c.uuid')
      .join('conversation_members', 'cm1', 'c.uuid = cm1.conversation_uuid')
      .join('conversation_members', 'cm2', 'c.uuid = cm2.conversation_uuid')
      .where('c.is_group', 'eq', false)
      .where('cm1.user_uuid', 'eq', user1)
      .where('cm1.archived_at', 'is', null)
      .where('cm2.user_uuid', 'eq', user2)
      .where('cm2.archived_at', 'is', null)
      .limit(1)
      .execute();
    return result[0];
  }

  // ---- Messages ----
  async createMessage(conversationUuid, senderUuid, messageText) {
    const uuid = uuidv4();
    const result = await this.queryHelper
      .from('messages')
      .insert({
        uuid,
        conversation_uuid: conversationUuid,
        sender_uuid: senderUuid,
        message: messageText
      })
      .execute();
    return result[0];
  }

  async getMessages(conversationUuid, limit = 50, cursor = null, after = null) {
    const db = this.queryHelper.db;

    // Correlated JSON aggregate subqueries — reference outer alias `m` and use
    // Postgres-specific JSON functions, which require direct Knex builder access.
    const receiptsSubquery = db('message_receipts as mr')
      .whereRaw('mr.message_uuid = m.uuid')
      .select(db.raw(`json_agg(json_build_object('user_uuid', mr.user_uuid, 'delivered_at', mr.delivered_at, 'seen_at', mr.seen_at))`))
      .as('receipts');

    const attachmentsSubquery = db('message_attachments as ma')
      .whereRaw('ma.message_uuid = m.uuid')
      .whereNull('ma.archived_at')
      .select(db.raw(`json_agg(json_build_object('uuid', ma.uuid, 'file_name', ma.file_name, 'original_file_name', ma.original_file_name, 'mime_type', ma.mime_type, 'file_size', ma.file_size, 'attachment_type', ma.attachment_type, 'width', ma.width, 'height', ma.height, 'preview_data', ma.preview_data))`))
      .as('attachments');

    const query = this.queryHelper
      .from('messages', 'm')
      .field('m.*')
      .field(receiptsSubquery)
      .field(attachmentsSubquery)
      .where('m.conversation_uuid', 'eq', conversationUuid)
      .where('m.archived_at', 'is', null)
      .orderBy('m.sent_at', false)
      .limit(limit);

    if (cursor) {
      query.where('m.sent_at', '<', cursor);
    }
    
    if (after) {
      query.where('m.sent_at', '>', after);
    }

    const result = await query.execute();
    return result;
  }
  
  async getAttachment(attachmentUuid) {
    const result = await this.queryHelper
      .from('message_attachments')
      .where('uuid', 'eq', attachmentUuid)
      .where('archived_at', 'is', null)
      .execute();
    return result[0];
  }

  async createMessageAttachment(messageUuid, metadata) {
    const uuid = metadata.uuid || uuidv4();
    const result = await this.queryHelper
      .from('message_attachments')
      .insert({
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
      })
      .execute();
    return result[0];
  }

  async deleteMessageAttachment(attachmentUuid) {
    const result = await this.queryHelper
      .from('message_attachments')
      .update({ archived_at: new Date(), updated_at: new Date() })
      .where('uuid', 'eq', attachmentUuid)
      .execute();
    return result[0];
  }
  
  async upsertMessageReceipt(messageUuid, userUuid, status) {
    const existing = await this.queryHelper
      .from('message_receipts')
      .where('message_uuid', 'eq', messageUuid)
      .where('user_uuid', 'eq', userUuid)
      .execute();

    if (existing && existing.length > 0) {
      const payload = { updated_at: new Date() };
      if (status === 'seen') payload.seen_at = new Date();
      if (!existing[0].delivered_at || status === 'delivered') payload.delivered_at = new Date();

      const result = await this.queryHelper
        .from('message_receipts')
        .update(payload)
        .where('message_uuid', 'eq', messageUuid)
        .where('user_uuid', 'eq', userUuid)
        .execute();
      return result[0];
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
      const result = await this.queryHelper
        .from('message_receipts')
        .insert(payload)
        .execute();
      return result[0];
    } catch (err) {
      // 23505 is PostgreSQL's code for unique_violation
      if (err.code === '23505') {
        // Race condition occurred, it was inserted by another request.
        // Re-run the update logic.
        const refetched = await this.queryHelper
          .from('message_receipts')
          .where('message_uuid', 'eq', messageUuid)
          .where('user_uuid', 'eq', userUuid)
          .execute();
          
        if (refetched && refetched.length > 0) {
          const updatePayload = { updated_at: new Date() };
          if (status === 'seen') updatePayload.seen_at = new Date();
          if (!refetched[0].delivered_at || status === 'delivered') updatePayload.delivered_at = new Date();

          const result = await this.queryHelper
            .from('message_receipts')
            .update(updatePayload)
            .where('message_uuid', 'eq', messageUuid)
            .where('user_uuid', 'eq', userUuid)
            .execute();
          return result[0];
        }
      }
      throw err;
    }
  }

  async markOfflineMessagesAsDelivered(userUuid) {
    const db = this.queryHelper.db;
    
    // Uses the Knex builder directly because this is a bulk upsert pattern
    // with multiple operations (insert batch + update batch) that cannot be
    // expressed as a single queryHelper chain.
    const messages = await db('messages as m')
      .join('conversation_members as cm', 'm.conversation_uuid', 'cm.conversation_uuid')
      .leftJoin(db.raw('message_receipts as mr on mr.message_uuid = m.uuid and mr.user_uuid = ?', [userUuid]))
      .where('cm.user_uuid', userUuid)
      .where('m.sender_uuid', '!=', userUuid)
      .whereNull('cm.archived_at')
      .whereNull('m.archived_at')
      .whereNull('mr.delivered_at')
      .select('m.uuid as message_uuid', 'm.conversation_uuid', 'mr.uuid as existing_receipt_uuid');

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
      await db('message_receipts').insert(toInsert);
    }
    if (toUpdate.length > 0) {
      await db('message_receipts').whereIn('uuid', toUpdate).update({ delivered_at: now, updated_at: now });
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
    const existing = await this.queryHelper
      .from('user_blocks')
      .where('blocker_uuid', 'eq', blockerUuid)
      .where('blocked_uuid', 'eq', blockedUuid)
      .execute();

    if (existing && existing.length > 0) {
      const result = await this.queryHelper
        .from('user_blocks')
        .update({ archived_at: null, updated_at: new Date() })
        .where('blocker_uuid', 'eq', blockerUuid)
        .where('blocked_uuid', 'eq', blockedUuid)
        .execute();
      return result[0];
    }

    const uuid = uuidv4();
    const result = await this.queryHelper
      .from('user_blocks')
      .insert({
        uuid,
        blocker_uuid: blockerUuid,
        blocked_uuid: blockedUuid
      })
      .execute();
    return result[0];
  }

  async unblockUser(blockerUuid, blockedUuid) {
    const result = await this.queryHelper
      .from('user_blocks')
      .update({ archived_at: new Date(), updated_at: new Date() })
      .where('blocker_uuid', 'eq', blockerUuid)
      .where('blocked_uuid', 'eq', blockedUuid)
      .execute();
    return result[0];
  }
  
  async getBlockRecord(user1, user2) {
    const result = await this.queryHelper
      .from('user_blocks')
      .where('archived_at', 'is', null)
      .where(`(blocker_uuid = '${user1}' AND blocked_uuid = '${user2}') OR (blocker_uuid = '${user2}' AND blocked_uuid = '${user1}')`)
      .execute();
    return result;
  }

  async searchUsers(query = '', limit = 50) {
    let qh = this.queryHelper
      .from('users', 'u')
      .field('u.uuid')
      .field('u.email')
      .field('ud.first_name')
      .field('ud.last_name')
      .field('ud.display_name')
      .field('ud.profile_image_url')
      .leftJoin('user_details', 'ud', 'u.uuid = ud.user_uuid')
      .where('u.status', 'eq', 'active');

    if (query) {
      // `query` is free-text user input — escape single quotes before interpolating.
      const safe = query.replace(/'/g, "''");
      qh = qh
        .where(`u.email ILIKE '%${safe}%' OR ud.display_name ILIKE '%${safe}%' OR ud.first_name ILIKE '%${safe}%' OR ud.last_name ILIKE '%${safe}%'`);
    }

    qh = qh.limit(limit);
    const result = await qh.execute();
    return result;
  }
}

module.exports = ChatRepository;
