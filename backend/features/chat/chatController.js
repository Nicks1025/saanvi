const BaseController = require('../../base/baseController');
const { getIo } = require('../../socket');

class ChatController extends BaseController {
  async searchUsers(req, res) {
    try {
      const query = req.query.search || "";
      const limit = parseInt(req.query.limit) || 50;
      const result = await this.chatService.searchUsers(query, limit);
      return this.sendSuccess(res, result, "Users retrieved");
    } catch (e) {
      return this.sendError(res, e.message, 500);
    }
  }

  constructor(chatService) {
    super();
    this.chatService = chatService;
  }

  // ---- Blocks ----
  async blockUser(req, res) {
    try {
      const { user_uuid } = req.body;
      const result = await this.chatService.blockUser(req.user.uuid, user_uuid);
      return this.sendSuccess(res, result, 'User blocked successfully');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  async unblockUser(req, res) {
    try {
      const { uuid } = req.params; // blocked user uuid
      const result = await this.chatService.unblockUser(req.user.uuid, uuid);
      return this.sendSuccess(res, result, 'User unblocked successfully');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  // ---- Requests ----
  async sendChatRequest(req, res) {
    try {
      const { receiver_uuid } = req.body;
      const result = await this.chatService.sendChatRequest(req.user.uuid, receiver_uuid);
      
      const io = getIo();
      if (io) {
        io.to(`user:${receiver_uuid}`).emit('chat_request:new', result);
      }
      
      return this.sendSuccess(res, result, 'Chat request sent');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  async getChatRequests(req, res) {
    try {
      const result = await this.chatService.getChatRequests(req.user.uuid);
      return this.sendSuccess(res, result, 'Chat requests retrieved');
    } catch (e) {
      return this.sendError(res, e.message, 500);
    }
  }

  async respondChatRequest(req, res) {
    try {
      const { uuid } = req.params;
      const { status } = req.body;
      const result = await this.chatService.respondToChatRequest(req.user.uuid, uuid, status);
      
      const io = getIo();
      if (io && result.request) {
        // Emit to the other user. 
        // If current user is receiver, notify sender. If current user is sender (cancelled), notify receiver.
        const otherUuid = req.user.uuid === result.request.sender_uuid ? result.request.receiver_uuid : result.request.sender_uuid;
        io.to(`user:${otherUuid}`).emit(`chat_request:${status}`, result);
        
        // If accepted and conversation created, maybe emit to both
        if (status === 'accepted' && result.conversation) {
           io.to(`user:${result.request.sender_uuid}`).emit('conversation:new', result.conversation);
           io.to(`user:${result.request.receiver_uuid}`).emit('conversation:new', result.conversation);
        }
      }

      return this.sendSuccess(res, result, 'Chat request updated');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  // ---- Conversations ----
  async getConversations(req, res) {
    try {
      const result = await this.chatService.getConversations(req.user.uuid);
      return this.sendSuccess(res, result, 'Conversations retrieved');
    } catch (e) {
      return this.sendError(res, e.message, 500);
    }
  }

  // ---- Messages ----
  async sendMessage(req, res) {
    try {
      const { uuid } = req.params; // conversation uuid
      const { message } = req.body;
      const result = await this.chatService.sendMessage(req.user.uuid, uuid, message);
      
      const io = getIo();
      if (io) {
        io.to(`conversation:${uuid}`).emit('message:receive', result);
      }

      return this.sendSuccess(res, result, 'Message sent');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  async getMessages(req, res) {
    try {
      const { uuid } = req.params; // conversation uuid
      const limit = parseInt(req.query.limit) || 50;
      const cursor = req.query.cursor; // ISO timestamp
      const after = req.query.after; // ISO timestamp
      const result = await this.chatService.getMessages(req.user.uuid, uuid, limit, cursor, after);
      return this.sendSuccess(res, result, 'Messages retrieved');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  async markMessageStatus(req, res) {
    try {
      const { uuid } = req.params; // message uuid
      const { status } = req.body; // 'delivered' | 'seen'
      const result = await this.chatService.markMessageStatus(req.user.uuid, uuid, status);
      return this.sendSuccess(res, result, 'Message status updated');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  // ---- Attachments ----
  async generateUploadUrl(req, res) {
    try {
      const { uuid } = req.params; // conversation uuid
      const { file_name, mime_type, file_size, category } = req.body;
      const result = await this.chatService.generateUploadUrl(req.user.uuid, uuid, file_name, mime_type, file_size, category);
      return this.sendSuccess(res, result, 'Upload URL generated');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  async completeUpload(req, res) {
    try {
      const { uuid } = req.params; // conversation uuid
      const { message, metadata } = req.body;
      const result = await this.chatService.completeUpload(req.user.uuid, uuid, message, metadata);
      
      const io = getIo();
      if (io) {
        io.to(`conversation:${uuid}`).emit('message:receive', result);
      }

      return this.sendSuccess(res, result, 'Upload completed and message sent');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  async completeMultiUpload(req, res) {
    try {
      const { uuid } = req.params; // conversation uuid
      const { message, attachments } = req.body;

      // Hard limit enforced server-side
      if (!Array.isArray(attachments) || attachments.length === 0) {
        return this.sendError(res, 'attachments must be a non-empty array', 400);
      }
      if (attachments.length > 5) {
        return this.sendError(res, 'Maximum 5 images per message', 400);
      }

      const result = await this.chatService.completeMultiUpload(req.user.uuid, uuid, message, attachments);
      
      const io = getIo();
      if (io) {
        io.to(`conversation:${uuid}`).emit('message:receive', result);
      }

      return this.sendSuccess(res, result, 'Multi-upload completed and message sent');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }


  async getDownloadUrl(req, res) {
    try {
      const { messageUuid, attachmentUuid } = req.params;
      const result = await this.chatService.getDownloadUrl(req.user.uuid, messageUuid, attachmentUuid);
      return this.sendSuccess(res, result, 'Download URL generated');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  // ---- Wallpapers ----
  async generateWallpaperUploadUrl(req, res) {
    try {
      const { uuid } = req.params; // conversation uuid
      const { file_name, mime_type, file_size } = req.body;
      const result = await this.chatService.generateWallpaperUploadUrl(req.user.uuid, uuid, file_name, mime_type, file_size);
      return this.sendSuccess(res, result, 'Wallpaper upload URL generated');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  async completeWallpaperUpload(req, res) {
    try {
      const { uuid } = req.params; // conversation uuid
      const { storage_key } = req.body;
      const result = await this.chatService.completeWallpaperUpload(req.user.uuid, uuid, storage_key);
      return this.sendSuccess(res, result, 'Wallpaper upload completed');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  async updateBackground(req, res) {
    try {
      const { uuid } = req.params;
      const { background_data } = req.body;
      const result = await this.chatService.updateBackground(req.user.uuid, uuid, background_data);
      
      const io = getIo();
      if (io) {
        // notify others in conversation
        io.to(`conversation:${uuid}`).emit('conversation:background_updated', { conversation_uuid: uuid, background_data: result.wallpaper_url });
      }
      return this.sendSuccess(res, result, 'Background updated successfully');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  // ---- Groups ----
  async createGroup(req, res) {
    try {
      const { name, description, members } = req.body;
      let profileImageUrl = null;
      if (req.file) {
        // Assume file handling logic similar to profile update
        // (Normally upload logic will generate the URL)
        profileImageUrl = req.file.path; // Or Supabase storage URL
      } else if (req.body.profile_image_url) {
        profileImageUrl = req.body.profile_image_url;
      }
      
      const result = await this.chatService.createGroup(req.user.uuid, name, description, profileImageUrl, members);
      return this.sendSuccess(res, result, 'Group created');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  async addGroupMember(req, res) {
    try {
      const { uuid } = req.params; // group uuid
      const { user_uuid } = req.body;
      const result = await this.chatService.addGroupMember(req.user.uuid, uuid, user_uuid);
      return this.sendSuccess(res, result, 'Member added');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }

  async removeGroupMember(req, res) {
    try {
      const { uuid, user_uuid } = req.params; // group uuid, user uuid
      const result = await this.chatService.removeGroupMember(req.user.uuid, uuid, user_uuid);
      return this.sendSuccess(res, result, 'Member removed');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }
  
  async updateGroup(req, res) {
    try {
      const { uuid } = req.params; // group uuid
      const { name, description, profile_image_url } = req.body;
      const result = await this.chatService.updateGroup(req.user.uuid, uuid, name, description, profile_image_url);
      return this.sendSuccess(res, result, 'Group updated');
    } catch (e) {
      return this.sendError(res, e.message, 400);
    }
  }
}

module.exports = ChatController;
