const BaseService = require('../../base/baseService');
const NotificationRepository = require('../notifications/notificationRepository');
const NotificationService = require('../notifications/notificationService');

const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);

// ============================================================
// Per-category MIME type allowlists (server-side validation)
// ============================================================
const ALLOWED_MIME_TYPES = {
  images: new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/svg+xml', 'image/bmp', 'image/tiff',
  ]),
  files: new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'text/markdown',
    'application/json', 'application/xml', 'text/xml',
    'application/zip', 'application/x-rar-compressed',
    'application/x-7z-compressed', 'application/x-tar', 'application/gzip',
  ]),
  music: new Set([
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav',
    'audio/webm', 'audio/aac', 'audio/flac', 'audio/x-flac',
    'audio/x-wav', 'audio/x-m4a', 'audio/mp3',
  ]),
  voice: new Set([
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav',
    'audio/webm', 'audio/aac', 'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
  ]),
};

/**
 * Returns true if the MIME type is allowed for the given category.
 * Falls back to wildcard prefix matching for image/* / audio*.
 */
function isMimeAllowed(mimeType, category) {
  const allowed = ALLOWED_MIME_TYPES[category];
  if (!allowed) return false; // unknown category

  // Strip codec parameters for lookup (e.g. audio/webm;codecs=opus -> audio/webm)
  const baseMime = mimeType.split(';')[0].trim().toLowerCase();
  if (allowed.has(baseMime) || allowed.has(mimeType)) return true;

  // Wildcard fallback
  if (category === 'images' && baseMime.startsWith('image/')) return true;
  if ((category === 'music' || category === 'voice') && baseMime.startsWith('audio/')) return true;

  return false;
}

/**
 * Map category + MIME to a canonical attachment_type for the DB.
 */
function resolveAttachmentType(category, mimeType) {
  if (category === 'voice') return 'voice';
  const base = mimeType.split(';')[0].trim().toLowerCase();
  if (base.startsWith('image/')) return 'image';
  if (base.startsWith('audio/')) return 'audio';
  if (
    base === 'application/pdf' ||
    base.includes('word') || base.includes('excel') ||
    base.includes('powerpoint') || base.includes('spreadsheet') ||
    base.includes('presentation')
  ) return 'document';
  return 'file';
}

/**
 * Map category key to a storage sub-folder name.
 */
const CATEGORY_FOLDER = {
  images: 'media',
  files: 'files',
  music: 'music',
  voice: 'voice',
};

class ChatService extends BaseService {
  async searchUsers(query, limit) {
    return await this.chatRepository.searchUsers(query, limit);
  }

  constructor(chatRepository) {
    super();
    this.chatRepository = chatRepository;
  }

  // ---- Blocks ----
  async blockUser(blockerUuid, blockedUuid) {
    if (blockerUuid === blockedUuid) {
      throw new Error("Cannot block yourself");
    }
    return await this.chatRepository.blockUser(blockerUuid, blockedUuid);
  }

  async unblockUser(blockerUuid, blockedUuid) {
    return await this.chatRepository.unblockUser(blockerUuid, blockedUuid);
  }

  async checkBlockStatus(user1, user2) {
    const blocks = await this.chatRepository.getBlockRecord(user1, user2);
    if (blocks && blocks.length > 0) {
      throw new Error("Action not permitted due to block status");
    }
  }

  // ---- Requests ----
  async sendChatRequest(senderUuid, receiverUuid) {
    if (senderUuid === receiverUuid) throw new Error("Cannot send request to yourself");
    
    await this.checkBlockStatus(senderUuid, receiverUuid);

    // Check if conversation already exists
    const existingConv = await this.chatRepository.getExistingOneToOneConversation(senderUuid, receiverUuid);
    if (existingConv) throw new Error("Conversation already exists");

    // Check if request already exists
    const existingRequests = await this.chatRepository.getChatRequests(senderUuid);
    const existing = existingRequests.find(r => 
      (r.sender_uuid === senderUuid && r.receiver_uuid === receiverUuid) ||
      (r.sender_uuid === receiverUuid && r.receiver_uuid === senderUuid)
    );

    if (existing && existing.status === 'pending') {
      throw new Error("Pending request already exists");
    }

    const request = await this.chatRepository.createChatRequest(senderUuid, receiverUuid);

    notificationService.createNotification({
      user_uuid: receiverUuid,
      type: 'CHAT_REQUEST',
      title: `New Chat Request`,
      body: `You have received a new chat request.`,
      entity_type: 'chat_request',
      entity_uuid: request.uuid
    }).catch(err => console.error('[NotificationService] Error:', err.message));

    return request;
  }

  async getChatRequests(userUuid) {
    return await this.chatRepository.getChatRequests(userUuid);
  }

  async respondToChatRequest(userUuid, requestUuid, status) {
    if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
      throw new Error("Invalid status");
    }

    const request = await this.chatRepository.getChatRequest(requestUuid);
    if (!request) throw new Error("Request not found");
    if (request.status !== 'pending') throw new Error("Request already responded to");

    if (status === 'cancelled') {
      if (request.sender_uuid !== userUuid) throw new Error("Only sender can cancel");
    } else {
      if (request.receiver_uuid !== userUuid) throw new Error("Only receiver can accept/reject");
    }

    await this.checkBlockStatus(request.sender_uuid, request.receiver_uuid);

    const updated = await this.chatRepository.updateChatRequestStatus(requestUuid, status);

    if (status === 'accepted') {
      // Create conversation
      const conversation = await this.chatRepository.createConversation(false);
      await this.chatRepository.addConversationMember(conversation.uuid, request.sender_uuid);
      await this.chatRepository.addConversationMember(conversation.uuid, request.receiver_uuid);
      
      notificationService.createNotification({
        user_uuid: request.sender_uuid,
        type: 'CHAT_REQUEST_ACCEPTED',
        title: `Chat Request Accepted`,
        body: `Your chat request has been accepted.`,
        entity_type: 'conversation',
        entity_uuid: conversation.uuid
      }).catch(err => console.error('[NotificationService] Error:', err.message));

      return { request: updated, conversation };
    }

    return { request: updated };
  }

  // ---- Conversations ----
  async getConversations(userUuid) {
    const convs = await this.chatRepository.getUserConversations(userUuid);
    const r2StorageService = require('../../infrastructure/storage/r2StorageService');
    for (const conv of convs) {
       if (conv.wallpaper_url) {
          try {
             if (conv.wallpaper_url.startsWith('theme:')) {
                // leave as is
             } else if (conv.wallpaper_url.startsWith('{')) {
                // JSON format: { type: 'wallpaper', storageKey: '...', transform: {...} }
                const data = JSON.parse(conv.wallpaper_url);
                if (data.type === 'wallpaper' && data.storageKey) {
                   data.url = await r2StorageService.getSignedDownloadUrl(data.storageKey, 86400);
                   conv.wallpaper_url = JSON.stringify(data);
                }
             } else {
                // Legacy raw storage key
                const url = await r2StorageService.getSignedDownloadUrl(conv.wallpaper_url, 86400);
                conv.wallpaper_url = JSON.stringify({
                   type: 'wallpaper',
                   storageKey: conv.wallpaper_url,
                   url: url,
                   transform: { tx: 0, ty: 0, sx: 1, sy: 1 }
                });
             }
          } catch(e) {
            conv.wallpaper_url = null;
          }
       }
    }
    return convs;
  }

  // ---- Messages ----
  async sendMessage(senderUuid, conversationUuid, messageText) {
    // Check if user is in conversation
    const conversation = await this.chatRepository.getConversation(conversationUuid);
    if (!conversation) throw new Error("Conversation not found");

    const convs = await this.chatRepository.getUserConversations(senderUuid);
    const isMember = convs.find(c => c.uuid === conversationUuid);
    if (!isMember) throw new Error("User is not a member of this conversation");

    // Check blocks for 1-on-1 (if not group, the other member must not be blocked)
    if (!conversation.is_group) {
      const otherMember = isMember.members.find(m => m.uuid !== senderUuid);
      if (otherMember) {
        await this.checkBlockStatus(senderUuid, otherMember.uuid);
      }
    }

    const newMessage = await this.chatRepository.createMessage(conversationUuid, senderUuid, messageText);

    // Trigger notifications for all other members
    isMember.members.forEach(member => {
      if (member.uuid !== senderUuid) {
        // We use the sender's name if available, otherwise just "New message"
        const senderName = isMember.members.find(m => m.uuid === senderUuid)?.name || 'Someone';
        
        notificationService.createNotification({
          user_uuid: member.uuid,
          type: 'NEW_MESSAGE',
          title: `New message from ${senderName}`,
          body: messageText, // Or truncate it
          entity_type: 'conversation',
          entity_uuid: conversationUuid
        }).catch(err => console.error('[NotificationService] Error creating notification:', err.message));
      }
    });

    return newMessage;
  }

  async getMessages(userUuid, conversationUuid, limit, cursor, after) {
    const convs = await this.chatRepository.getUserConversations(userUuid);
    const isMember = convs.find(c => c.uuid === conversationUuid);
    if (!isMember) throw new Error("User is not a member of this conversation");

    return await this.chatRepository.getMessages(conversationUuid, limit, cursor, after);
  }

  async markMessageStatus(userUuid, messageUuid, status) {
    if (!['delivered', 'seen'].includes(status)) throw new Error("Invalid status");
    
    // Authorization: Verify user is a member of the conversation this message belongs to
    const msg = await this.chatRepository.queryHelper
       .from('messages')
       .where('uuid', 'eq', messageUuid)
       .execute();
       
    if (!msg || msg.length === 0) throw new Error("Message not found");
    
    const convs = await this.chatRepository.getUserConversations(userUuid);
    const isMember = convs.find(c => c.uuid === msg[0].conversation_uuid);
    if (!isMember) throw new Error("User is not a member of this conversation");

    return await this.chatRepository.upsertMessageReceipt(messageUuid, userUuid, status);
  }

  async markOfflineMessagesAsDelivered(userUuid) {
    return await this.chatRepository.markOfflineMessagesAsDelivered(userUuid);
  }

  // ---- Attachments ----
  async generateUploadUrl(userUuid, conversationUuid, fileName, mimeType, fileSize, category = 'files') {
    const convs = await this.chatRepository.getUserConversations(userUuid);
    const isMember = convs.find(c => c.uuid === conversationUuid);
    if (!isMember) throw new Error("User is not a member of this conversation");
    
    // Check blocks for 1-on-1
    if (!isMember.is_group) {
      const otherMember = isMember.members.find(m => m.uuid !== userUuid);
      if (otherMember) {
        await this.checkBlockStatus(userUuid, otherMember.uuid);
      }
    }

    // Validate category
    const knownCategories = ['images', 'files', 'music', 'voice'];
    if (!knownCategories.includes(category)) {
      throw new Error(`Unknown attachment category: ${category}`);
    }

    // Server-side MIME validation
    if (!isMimeAllowed(mimeType, category)) {
      throw new Error(`File type "${mimeType}" is not allowed for category "${category}".`);
    }

    // File size limit — voice gets a higher limit
    const isVoice = category === 'voice';
    const defaultMax = isVoice
      ? parseInt(process.env.VOICE_MAX_FILE_SIZE) || 25 * 1024 * 1024  // 25 MB default for voice
      : parseInt(process.env.STORAGE_MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10 MB default for others
    if (fileSize > defaultMax) {
      const limitMB = (defaultMax / (1024 * 1024)).toFixed(0);
      throw new Error(`File exceeds the ${limitMB} MB size limit.`);
    }

    const r2StorageService = require('../../infrastructure/storage/r2StorageService');
    const { v4: uuidv4 } = require('uuid');
    
    const attachmentUuid = uuidv4();
    // Derive extension from original filename; sanitize it
    const originalExt = fileName.includes('.') ? fileName.split('.').pop().replace(/[^a-zA-Z0-9]/g, '') : '';
    const folder = CATEGORY_FOLDER[category] || 'files';
    const safeFileName = originalExt ? `${attachmentUuid}.${originalExt}` : attachmentUuid;
    // Organized key: chat/{conversationUuid}/{category-folder}/{uuid.ext}
    const storageKey = `chat/${conversationUuid}/${folder}/${safeFileName}`;

    const url = await r2StorageService.getSignedUploadUrl(storageKey, mimeType);
    
    return { url, storageKey, attachmentUuid, fileName: safeFileName, mimeType, fileSize };
  }

  async completeUpload(userUuid, conversationUuid, messageText, metadata) {
    const convs = await this.chatRepository.getUserConversations(userUuid);
    const isMember = convs.find(c => c.uuid === conversationUuid);
    if (!isMember) throw new Error("User is not a member of this conversation");

    // Check blocks for 1-on-1
    if (!isMember.is_group) {
      const otherMember = isMember.members.find(m => m.uuid !== userUuid);
      if (otherMember) {
        await this.checkBlockStatus(userUuid, otherMember.uuid);
      }
    }

    const r2StorageService = require('../../infrastructure/storage/r2StorageService');
    
    // Verify the file actually exists in R2 (prevents spoofed storage keys)
    try {
      await r2StorageService.headObject(metadata.storage_key);
    } catch (e) {
      throw new Error("Upload verification failed. File not found in storage.");
    }

    // Resolve attachment type from category or MIME type
    const category = metadata.category || 'files';
    metadata.attachment_type = resolveAttachmentType(category, metadata.mime_type);

    // Create message
    const message = await this.chatRepository.createMessage(conversationUuid, userUuid, messageText || null);
    
    // Create attachment record
    const attachment = await this.chatRepository.createMessageAttachment(message.uuid, metadata);
    
    message.attachments = [attachment];
    message.receipts = [];
    
    return message;
  }

  async completeMultiUpload(userUuid, conversationUuid, messageText, attachmentsMetadata) {
    if (!Array.isArray(attachmentsMetadata) || attachmentsMetadata.length === 0) {
      throw new Error('attachments must be a non-empty array');
    }
    const MAX_IMAGES = parseInt(process.env.CHAT_MAX_IMAGES, 10) || 5;
    if (attachmentsMetadata.length > MAX_IMAGES) {
      throw new Error(`Maximum ${MAX_IMAGES} images per message`);
    }

    const convs = await this.chatRepository.getUserConversations(userUuid);
    const isMember = convs.find(c => c.uuid === conversationUuid);
    if (!isMember) throw new Error('User is not a member of this conversation');

    if (!isMember.is_group) {
      const otherMember = isMember.members.find(m => m.uuid !== userUuid);
      if (otherMember) await this.checkBlockStatus(userUuid, otherMember.uuid);
    }

    const r2StorageService = require('../../infrastructure/storage/r2StorageService');

    // Verify all files exist in R2 before creating the DB records
    for (const metadata of attachmentsMetadata) {
      try {
        await r2StorageService.headObject(metadata.storage_key);
      } catch (e) {
        throw new Error(`Upload verification failed for "${metadata.original_file_name}". File not found in storage.`);
      }
    }

    // Create message once
    const message = await this.chatRepository.createMessage(conversationUuid, userUuid, messageText || null);

    // Create one attachment record per image
    const attachments = [];
    for (const metadata of attachmentsMetadata) {
      const category = metadata.category || 'images';
      const enriched = {
        ...metadata,
        attachment_type: resolveAttachmentType(category, metadata.mime_type),
      };
      const attachment = await this.chatRepository.createMessageAttachment(message.uuid, enriched);
      attachments.push(attachment);
    }

    message.attachments = attachments;
    message.receipts = [];

    return message;
  }


  async getDownloadUrl(userUuid, messageUuid, attachmentUuid) {
    const attachment = await this.chatRepository.getAttachment(attachmentUuid);
    if (!attachment || attachment.message_uuid !== messageUuid) throw new Error("Attachment not found");

    const message = await this.chatRepository.queryHelper.from('messages').where('uuid', 'eq', messageUuid).execute();
    if (!message || message.length === 0) throw new Error("Message not found");

    const convs = await this.chatRepository.getUserConversations(userUuid);
    const isMember = convs.find(c => c.uuid === message[0].conversation_uuid);
    if (!isMember) throw new Error("Unauthorized to access this attachment");

    const r2StorageService = require('../../infrastructure/storage/r2StorageService');
    const url = await r2StorageService.getSignedDownloadUrl(attachment.storage_key);
    return { url };
  }

  // ---- Wallpapers ----
  async generateWallpaperUploadUrl(userUuid, conversationUuid, fileName, mimeType, fileSize) {
    const convs = await this.chatRepository.getUserConversations(userUuid);
    const isMember = convs.find(c => c.uuid === conversationUuid);
    if (!isMember) throw new Error("User is not a member of this conversation");

    const MAX_SIZE = parseInt(process.env.STORAGE_MAX_FILE_SIZE) || 10 * 1024 * 1024;
    if (fileSize > MAX_SIZE) throw new Error("File exceeds maximum allowed size");

    const r2StorageService = require('../../infrastructure/storage/r2StorageService');
    const { v4: uuidv4 } = require('uuid');
    
    const attachmentUuid = uuidv4();
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `wallpapers/${userUuid}/${conversationUuid}/${attachmentUuid}-${safeName}`;

    const url = await r2StorageService.getSignedUploadUrl(storageKey, mimeType);
    return { url, storageKey, fileName, mimeType };
  }

  async completeWallpaperUpload(userUuid, conversationUuid, storageKey) {
    const convs = await this.chatRepository.getUserConversations(userUuid);
    const isMember = convs.find(c => c.uuid === conversationUuid);
    if (!isMember) throw new Error("User is not a member of this conversation");

    const r2StorageService = require('../../infrastructure/storage/r2StorageService');
    try {
      await r2StorageService.headObject(storageKey);
    } catch (e) {
      throw new Error("Upload verification failed. File not found in storage.");
    }

    // Convert new wallpaper to JSON format with default transform
    const newBackgroundData = JSON.stringify({
      type: 'wallpaper',
      storageKey: storageKey,
      transform: { tx: 0, ty: 0, sx: 1, sy: 1 }
    });

    await this.chatRepository.updateConversationWallpaper(conversationUuid, userUuid, newBackgroundData);
    
    // Return parsed representation so frontend updates immediately
    const parsed = JSON.parse(newBackgroundData);
    parsed.url = await r2StorageService.getSignedDownloadUrl(storageKey, 86400);

    return { success: true, wallpaper_url: JSON.stringify(parsed) };
  }

  async updateBackground(userUuid, conversationUuid, backgroundData) {
    const convs = await this.chatRepository.getUserConversations(userUuid);
    const isMember = convs.find(c => c.uuid === conversationUuid);
    if (!isMember) throw new Error("User is not a member of this conversation");

    await this.chatRepository.updateConversationWallpaper(conversationUuid, userUuid, backgroundData);

    // If it's a JSON string, we need to inject the URL before returning to the frontend to update their local state
    let returnedData = backgroundData;
    if (backgroundData && backgroundData.startsWith('{')) {
      try {
        const parsed = JSON.parse(backgroundData);
        if (parsed.type === 'wallpaper' && parsed.storageKey) {
           const r2StorageService = require('../../infrastructure/storage/r2StorageService');
           parsed.url = await r2StorageService.getSignedDownloadUrl(parsed.storageKey, 86400);
           returnedData = JSON.stringify(parsed);
        }
      } catch (e) {
        // ignore parse error here
      }
    }

    return { success: true, wallpaper_url: returnedData };
  }

  // ---- Groups ----
  async createGroup(creatorUuid, name, description, profileImageUrl, members) {
    if (!name || name.trim() === '') throw new Error("Group name required");

    const group = await this.chatRepository.createConversation(true, creatorUuid, name, description, profileImageUrl);
    
    await this.chatRepository.addConversationMember(group.uuid, creatorUuid);
    
    if (members && members.length > 0) {
      for (const memberUuid of members) {
        if (memberUuid !== creatorUuid) {
          try {
             await this.checkBlockStatus(creatorUuid, memberUuid);
             await this.chatRepository.addConversationMember(group.uuid, memberUuid);
          } catch(e) {
            // Skip blocked members or log
          }
        }
      }
    }
    
    return group;
  }

  async addGroupMember(adminUuid, groupUuid, userUuid) {
    const group = await this.chatRepository.getConversation(groupUuid);
    if (!group || !group.is_group) throw new Error("Group not found");
    if (group.created_by_uuid !== adminUuid) throw new Error("Only admin can add members");

    await this.checkBlockStatus(adminUuid, userUuid);
    return await this.chatRepository.addConversationMember(groupUuid, userUuid);
  }

  async removeGroupMember(adminUuid, groupUuid, userUuid) {
    const group = await this.chatRepository.getConversation(groupUuid);
    if (!group || !group.is_group) throw new Error("Group not found");
    
    // User can leave on their own, or admin can remove
    if (adminUuid !== userUuid && group.created_by_uuid !== adminUuid) {
      throw new Error("Only admin can remove members");
    }

    return await this.chatRepository.removeConversationMember(groupUuid, userUuid);
  }

  async updateGroup(adminUuid, groupUuid, name, description, profileImageUrl) {
    const group = await this.chatRepository.getConversation(groupUuid);
    if (!group || !group.is_group) throw new Error("Group not found");
    if (group.created_by_uuid !== adminUuid) throw new Error("Only admin can update group");

    const query = `
      UPDATE public.conversations
      SET name = COALESCE($1, name), description = COALESCE($2, description), profile_image_url = COALESCE($3, profile_image_url), updated_at = NOW()
      WHERE uuid = $4
      RETURNING *
    `;
    const result = await this.chatRepository.queryHelper.execute(query, [name, description, profileImageUrl, groupUuid]);
    return result[0];
  }
}

module.exports = ChatService;
