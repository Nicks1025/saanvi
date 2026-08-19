const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const QueryHelper = require('../../database/queryHelper');
const uploadMiddleware = require('../../base/uploadMiddleware');

const ChatRepository = require('./chatRepository');
const ChatService = require('./chatService');
const ChatController = require('./chatController');

const MAX_IMAGES = parseInt(process.env.CHAT_MAX_IMAGES, 10) || 5;

const chatRepository = new ChatRepository();
const chatService = new ChatService(chatRepository);
const chatController = new ChatController(chatService);

const ChatApi = {
  name: 'Chat',
  url: '/api/chat',
  endpoints: [
    // ---- Users ----
    {
      path: "/users",
      verb: "GET",
      auditMessage: "searching users for chat",
      handler: { controller: chatController, method: "searchUsers" },
      middleware: { requireAuth: true, requirePermission: ["chat.access"] }
    },
    // ---- Blocks ----
    {
      path: '/blocks',
      verb: 'POST',
      auditMessage: 'blocking a user',
      handler: { controller: chatController, method: 'blockUser' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({ user_uuid: Joi.string().uuid().required() }) }
    },
    {
      path: '/blocks/:uuid',
      verb: 'DELETE',
      auditMessage: 'unblocking a user',
      handler: { controller: chatController, method: 'unblockUser' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] }
    },
    
    // ---- Requests ----
    {
      path: '/requests',
      verb: 'GET',
      auditMessage: 'getting chat requests',
      handler: { controller: chatController, method: 'getChatRequests' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] }
    },
    {
      path: '/requests',
      verb: 'POST',
      auditMessage: 'sending a chat request',
      handler: { controller: chatController, method: 'sendChatRequest' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({ receiver_uuid: Joi.string().uuid().required() }) }
    },
    {
      path: '/requests/:uuid/respond',
      verb: 'PUT',
      auditMessage: 'responding to chat request',
      handler: { controller: chatController, method: 'respondChatRequest' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({ status: Joi.string().valid('accepted', 'rejected', 'cancelled').required() }) }
    },

    // ---- Conversations ----
    {
      path: '/conversations',
      verb: 'GET',
      auditMessage: 'getting user conversations',
      handler: { controller: chatController, method: 'getConversations' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] }
    },
    {
      path: '/conversations/:uuid/messages',
      verb: 'GET',
      auditMessage: 'getting conversation messages',
      handler: { controller: chatController, method: 'getMessages' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] }
    },
    {
      path: '/conversations/:uuid/messages',
      verb: 'POST',
      auditMessage: 'sending message',
      handler: { controller: chatController, method: 'sendMessage' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({ message: Joi.string().required() }) }
    },
    {
      path: '/messages/:uuid/status',
      verb: 'PUT',
      auditMessage: 'updating message receipt status',
      handler: { controller: chatController, method: 'markMessageStatus' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({ status: Joi.string().valid('delivered', 'seen').required() }) }
    },

    // ---- Attachments ----
    {
      path: '/conversations/:uuid/attachments/upload-url',
      verb: 'POST',
      auditMessage: 'requesting upload url for attachment',
      handler: { controller: chatController, method: 'generateUploadUrl' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({ 
        file_name: Joi.string().required(),
        mime_type: Joi.string().required(),
        file_size: Joi.number().required(),
        category: Joi.string().valid('images', 'files', 'music', 'voice').default('files')
      }) }
    },
    {
      path: '/conversations/:uuid/attachments/complete',
      verb: 'POST',
      auditMessage: 'completing attachment upload',
      handler: { controller: chatController, method: 'completeUpload' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({ 
        message: Joi.string().allow('', null).optional(),
        metadata: Joi.object({
          uuid: Joi.string().required(),
          storage_key: Joi.string().required(),
          file_name: Joi.string().required(),
          original_file_name: Joi.string().required(),
          mime_type: Joi.string().required(),
          file_size: Joi.number().required(),
          category: Joi.string().valid('images', 'files', 'music', 'voice').default('files'),
          width: Joi.number().optional(),
          height: Joi.number().optional(),
          preview_data: Joi.string().optional()
        }).required()
      }) }
    },
    {
      path: '/conversations/:uuid/attachments/complete-multi',
      verb: 'POST',
      auditMessage: 'completing multi-image upload',
      handler: { controller: chatController, method: 'completeMultiUpload' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({
        message: Joi.string().allow('', null).optional(),
        attachments: Joi.array().items(Joi.object({
          uuid: Joi.string().required(),
          storage_key: Joi.string().required(),
          file_name: Joi.string().required(),
          original_file_name: Joi.string().required(),
          mime_type: Joi.string().required(),
          file_size: Joi.number().required(),
          category: Joi.string().valid('images').default('images'),
          width: Joi.number().optional(),
          height: Joi.number().optional(),
          preview_data: Joi.string().optional()
        })).min(1).max(MAX_IMAGES).required()
      }) }
    },

    {
      path: '/messages/:messageUuid/attachments/:attachmentUuid/url',
      verb: 'GET',
      auditMessage: 'getting attachment download url',
      handler: { controller: chatController, method: 'getDownloadUrl' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] }
    },

    // ---- Wallpapers ----
    {
      path: '/conversations/:uuid/wallpaper/upload-url',
      verb: 'POST',
      auditMessage: 'requesting upload url for wallpaper',
      handler: { controller: chatController, method: 'generateWallpaperUploadUrl' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({ 
        file_name: Joi.string().required(),
        mime_type: Joi.string().required(),
        file_size: Joi.number().required()
      }) }
    },
    {
      path: '/conversations/:uuid/wallpaper/complete',
      verb: 'POST',
      auditMessage: 'completing wallpaper upload',
      handler: { controller: chatController, method: 'completeWallpaperUpload' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({ 
        storage_key: Joi.string().required()
      }) }
    },
    {
      path: '/conversations/:uuid/background',
      verb: 'PUT',
      auditMessage: 'updating chat background',
      handler: { controller: chatController, method: 'updateBackground' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({ 
        background_data: Joi.string().allow(null).required()
      }) }
    },

    // ---- Groups ----
    {
      path: '/groups',
      verb: 'POST',
      auditMessage: 'creating group',
      handler: { controller: chatController, method: 'createGroup' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'], custom: [uploadMiddleware.single('profile_image')] },
      // Joi validation is skipped for multipart form-data. Handled in controller/service.
    },
    {
      path: '/groups/:uuid',
      verb: 'PUT',
      auditMessage: 'updating group',
      handler: { controller: chatController, method: 'updateGroup' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'], custom: [uploadMiddleware.single('profile_image')] },
    },
    {
      path: '/groups/:uuid/members',
      verb: 'POST',
      auditMessage: 'adding group member',
      handler: { controller: chatController, method: 'addGroupMember' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] },
      request: { body: Joi.object({ user_uuid: Joi.string().uuid().required() }) }
    },
    {
      path: '/groups/:uuid/members/:user_uuid',
      verb: 'DELETE',
      auditMessage: 'removing group member',
      handler: { controller: chatController, method: 'removeGroupMember' },
      middleware: { requireAuth: true, requirePermission: ['chat.access'] }
    }
  ]
};

module.exports = new ApiSchema(ChatApi);
