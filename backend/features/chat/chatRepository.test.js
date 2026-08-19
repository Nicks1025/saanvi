const ChatRepository = require('./chatRepository');
const QueryHelper = require('../../database/queryHelper');

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

jest.mock('../../database/queryHelper');

describe('ChatRepository', () => {
  let mockQueryHelper;
  let chatRepository;
  let dbMock;

  beforeEach(() => {
    const knexBuilderMock = {
      whereRaw: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      as: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
    };
    dbMock = jest.fn(() => knexBuilderMock);
    dbMock.raw = jest.fn(sql => sql);

    mockQueryHelper = {
      db: dbMock,
      from: jest.fn().mockReturnThis(),
      field: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      whereNull: jest.fn().mockReturnThis(),
      join: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([]),
    };
    QueryHelper.mockImplementation(() => mockQueryHelper);
    
    chatRepository = new ChatRepository();
    // No need to set chatRepository.queryHelper directly since getter returns new QueryHelper() which is mocked
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requests', () => {
    it('createChatRequest', async () => {
      mockQueryHelper.execute.mockResolvedValue([{ uuid: 'mock-uuid-1234' }]);
      const res = await chatRepository.createChatRequest('sender', 'receiver');
      expect(mockQueryHelper.from).toHaveBeenCalledWith('chat_requests');
      expect(mockQueryHelper.insert).toHaveBeenCalledWith(expect.objectContaining({
        uuid: 'mock-uuid-1234', sender_uuid: 'sender', receiver_uuid: 'receiver', status: 'pending'
      }));
      expect(res).toEqual({ uuid: 'mock-uuid-1234' });
    });

    it('getChatRequest', async () => {
      await chatRepository.getChatRequest('req-uuid');
      expect(mockQueryHelper.from).toHaveBeenCalledWith('chat_requests');
      expect(mockQueryHelper.where).toHaveBeenCalledWith('uuid', 'eq', 'req-uuid');
    });

    it('getChatRequests', async () => {
      await chatRepository.getChatRequests('user-uuid');
      expect(mockQueryHelper.from).toHaveBeenCalledWith('chat_requests', 'cr');
      expect(mockQueryHelper.where).toHaveBeenCalledWith(`cr.sender_uuid = 'user-uuid' OR cr.receiver_uuid = 'user-uuid'`);
    });

    it('updateChatRequestStatus', async () => {
      await chatRepository.updateChatRequestStatus('req-uuid', 'accepted');
      expect(mockQueryHelper.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }));
      expect(mockQueryHelper.where).toHaveBeenCalledWith('uuid', 'eq', 'req-uuid');
    });
  });

  describe('Conversations', () => {
    it('createConversation', async () => {
      await chatRepository.createConversation(true, 'creator', 'name', 'desc', 'img');
      expect(mockQueryHelper.insert).toHaveBeenCalledWith(expect.objectContaining({
        is_group: true, created_by_uuid: 'creator', name: 'name', description: 'desc', profile_image_url: 'img'
      }));
    });

    it('getUserConversations', async () => {
      await chatRepository.getUserConversations('user-uuid');
      expect(mockQueryHelper.from).toHaveBeenCalledWith('conversations', 'c');
      expect(mockQueryHelper.where).toHaveBeenCalledWith('cm.user_uuid', 'eq', 'user-uuid');
    });

    it('updateConversationWallpaper', async () => {
      await chatRepository.updateConversationWallpaper('conv-uuid', 'user-uuid', 'url');
      expect(mockQueryHelper.update).toHaveBeenCalledWith({ wallpaper_url: 'url' });
      expect(mockQueryHelper.where).toHaveBeenCalledWith('conversation_uuid', 'eq', 'conv-uuid');
      expect(mockQueryHelper.where).toHaveBeenCalledWith('user_uuid', 'eq', 'user-uuid');
    });

    it('getExistingOneToOneConversation', async () => {
      await chatRepository.getExistingOneToOneConversation('u1', 'u2');
      expect(mockQueryHelper.where).toHaveBeenCalledWith('c.is_group', 'eq', false);
      expect(mockQueryHelper.where).toHaveBeenCalledWith('cm1.user_uuid', 'eq', 'u1');
      expect(mockQueryHelper.where).toHaveBeenCalledWith('cm2.user_uuid', 'eq', 'u2');
    });
  });

  describe('Messages', () => {
    it('createMessage', async () => {
      await chatRepository.createMessage('conv-uuid', 'sender', 'hello');
      expect(mockQueryHelper.insert).toHaveBeenCalledWith(expect.objectContaining({
        conversation_uuid: 'conv-uuid', sender_uuid: 'sender', message: 'hello'
      }));
    });

    it('getMessages', async () => {
      await chatRepository.getMessages('conv-uuid', 10, 'cursor-time');
      expect(mockQueryHelper.where).toHaveBeenCalledWith('m.conversation_uuid', 'eq', 'conv-uuid');
      expect(mockQueryHelper.limit).toHaveBeenCalledWith(10);
      expect(mockQueryHelper.where).toHaveBeenCalledWith('m.sent_at', '<', 'cursor-time');
    });

    it('getAttachment', async () => {
      await chatRepository.getAttachment('att-uuid');
      expect(mockQueryHelper.from).toHaveBeenCalledWith('message_attachments');
      expect(mockQueryHelper.where).toHaveBeenCalledWith('uuid', 'eq', 'att-uuid');
    });

    it('createMessageAttachment', async () => {
      await chatRepository.createMessageAttachment('msg-uuid', { storage_key: 'key' });
      expect(mockQueryHelper.insert).toHaveBeenCalledWith(expect.objectContaining({
        message_uuid: 'msg-uuid', storage_key: 'key'
      }));
    });

    it('upsertMessageReceipt', async () => {
      await chatRepository.upsertMessageReceipt('msg-uuid', 'user-uuid', 'seen');
      expect(mockQueryHelper.from).toHaveBeenCalledWith('message_receipts');
      expect(mockQueryHelper.where).toHaveBeenCalledWith('message_uuid', 'eq', 'msg-uuid');
      expect(mockQueryHelper.where).toHaveBeenCalledWith('user_uuid', 'eq', 'user-uuid');
      // Upsert logic tests: Assuming execute returns empty initially, it should insert
      expect(mockQueryHelper.insert).toHaveBeenCalled();
    });

    it('markOfflineMessagesAsDelivered', async () => {
      await chatRepository.markOfflineMessagesAsDelivered('user-uuid');
      // Just check if it queries conversations and updates receipts
    });
  });

  describe('Users & Blocks', () => {
    it('blockUser', async () => {
      await chatRepository.blockUser('blocker', 'blocked');
      expect(mockQueryHelper.insert).toHaveBeenCalledWith(expect.objectContaining({
        blocker_uuid: 'blocker', blocked_uuid: 'blocked'
      }));
    });

    it('unblockUser', async () => {
      await chatRepository.unblockUser('blocker', 'blocked');
      expect(mockQueryHelper.update).toHaveBeenCalledWith(expect.objectContaining({
        archived_at: expect.any(Date)
      }));
    });

    it('getBlockRecord', async () => {
      await chatRepository.getBlockRecord('user1', 'user2');
      expect(mockQueryHelper.where).toHaveBeenCalledWith(`(blocker_uuid = 'user1' AND blocked_uuid = 'user2') OR (blocker_uuid = 'user2' AND blocked_uuid = 'user1')`);
    });

    it('searchUsers', async () => {
      await chatRepository.searchUsers('test', 10);
      expect(mockQueryHelper.where).toHaveBeenCalledWith(`u.email ILIKE '%test%' OR ud.display_name ILIKE '%test%' OR ud.first_name ILIKE '%test%' OR ud.last_name ILIKE '%test%'`);
    });
  });
});
