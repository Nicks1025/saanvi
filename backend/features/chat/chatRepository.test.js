const ChatRepository = require('./chatRepository');

describe('ChatRepository', () => {
  let chatRepository;

  beforeEach(() => {
    chatRepository = new ChatRepository();
    chatRepository.runQuery = jest.fn().mockResolvedValue([]);
    chatRepository.runQueryFirst = jest.fn().mockResolvedValue(null);
    chatRepository.execute = jest.fn().mockResolvedValue({ affectedRows: 1, rows: [{ uuid: 'mock-uuid-1234' }] });
    chatRepository.queryRaw = jest.fn().mockResolvedValue([]);
  });

  describe('Requests', () => {
    it('createChatRequest', async () => {
      const res = await chatRepository.createChatRequest('sender', 'receiver');
      expect(chatRepository.execute).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'mock-uuid-1234' });
    });

    it('getChatRequest', async () => {
      chatRepository.runQueryFirst.mockResolvedValueOnce({ uuid: 'req-uuid', status: 'pending' });
      const res = await chatRepository.getChatRequest('req-uuid');
      expect(chatRepository.runQueryFirst).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'req-uuid', status: 'pending' });
    });

    it('getChatRequests', async () => {
      chatRepository.runQuery.mockResolvedValueOnce([{ uuid: 'req-1' }]);
      const res = await chatRepository.getChatRequests('user-uuid');
      expect(chatRepository.runQuery).toHaveBeenCalled();
      expect(res).toEqual([{ uuid: 'req-1' }]);
    });

    it('updateChatRequestStatus', async () => {
      const res = await chatRepository.updateChatRequestStatus('req-uuid', 'accepted');
      expect(chatRepository.execute).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'mock-uuid-1234' });
    });
  });

  describe('Conversations', () => {
    it('createConversation', async () => {
      const res = await chatRepository.createConversation(true, 'creator', 'name', 'desc', 'img');
      expect(chatRepository.execute).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'mock-uuid-1234' });
    });

    it('getUserConversations', async () => {
      chatRepository.queryRaw.mockResolvedValueOnce([{ uuid: 'conv-1', members: [] }]);
      const res = await chatRepository.getUserConversations('user-uuid');
      expect(chatRepository.queryRaw).toHaveBeenCalled();
      expect(res).toEqual([{ uuid: 'conv-1', members: [] }]);
    });

    it('updateConversationWallpaper', async () => {
      const res = await chatRepository.updateConversationWallpaper('conv-uuid', 'user-uuid', 'url');
      expect(chatRepository.execute).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'mock-uuid-1234' });
    });

    it('getExistingOneToOneConversation', async () => {
      chatRepository.runQueryFirst.mockResolvedValueOnce({ uuid: 'conv-1' });
      const res = await chatRepository.getExistingOneToOneConversation('u1', 'u2');
      expect(chatRepository.runQueryFirst).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'conv-1' });
    });
  });

  describe('Messages', () => {
    it('createMessage', async () => {
      const res = await chatRepository.createMessage('conv-uuid', 'sender', 'hello');
      expect(chatRepository.execute).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'mock-uuid-1234' });
    });

    it('getMessages', async () => {
      chatRepository.queryRaw.mockResolvedValueOnce([{ uuid: 'msg-1', message: 'hi' }]);
      const res = await chatRepository.getMessages('conv-uuid', 10, 'cursor-time');
      expect(chatRepository.queryRaw).toHaveBeenCalled();
      expect(res).toEqual([{ uuid: 'msg-1', message: 'hi' }]);
    });

    it('getAttachment', async () => {
      chatRepository.runQueryFirst.mockResolvedValueOnce({ uuid: 'att-uuid' });
      const res = await chatRepository.getAttachment('att-uuid');
      expect(chatRepository.runQueryFirst).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'att-uuid' });
    });

    it('createMessageAttachment', async () => {
      const res = await chatRepository.createMessageAttachment('msg-uuid', { storage_key: 'key' });
      expect(chatRepository.execute).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'mock-uuid-1234' });
    });

    it('upsertMessageReceipt', async () => {
      chatRepository.runQueryFirst.mockResolvedValueOnce(null);
      const res = await chatRepository.upsertMessageReceipt('msg-uuid', 'user-uuid', 'seen');
      expect(chatRepository.execute).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'mock-uuid-1234' });
    });

    it('markOfflineMessagesAsDelivered', async () => {
      chatRepository.queryRaw.mockResolvedValueOnce([
        { message_uuid: 'msg-1', conversation_uuid: 'conv-1', existing_receipt_uuid: null }
      ]);
      const res = await chatRepository.markOfflineMessagesAsDelivered('user-uuid');
      expect(chatRepository.queryRaw).toHaveBeenCalled();
      expect(chatRepository.execute).toHaveBeenCalled();
      expect(res).toHaveLength(1);
    });
  });

  describe('Users & Blocks', () => {
    it('blockUser', async () => {
      chatRepository.runQueryFirst.mockResolvedValueOnce(null);
      const res = await chatRepository.blockUser('blocker', 'blocked');
      expect(chatRepository.execute).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'mock-uuid-1234' });
    });

    it('unblockUser', async () => {
      const res = await chatRepository.unblockUser('blocker', 'blocked');
      expect(chatRepository.execute).toHaveBeenCalled();
      expect(res).toEqual({ uuid: 'mock-uuid-1234' });
    });

    it('getBlockRecord', async () => {
      chatRepository.runQuery.mockResolvedValueOnce([{ uuid: 'b-1' }]);
      const res = await chatRepository.getBlockRecord('user1', 'user2');
      expect(chatRepository.runQuery).toHaveBeenCalled();
      expect(res).toEqual([{ uuid: 'b-1' }]);
    });

    it('searchUsers', async () => {
      chatRepository.runQuery.mockResolvedValueOnce([{ uuid: 'u-1', email: 'test@example.com' }]);
      const res = await chatRepository.searchUsers('test', 10);
      expect(chatRepository.runQuery).toHaveBeenCalled();
      expect(res).toEqual([{ uuid: 'u-1', email: 'test@example.com' }]);
    });
  });
});
