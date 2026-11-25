const ChatService = require('./chatService');

describe('chatService.markMessageStatus authorization', () => {
  let chatService;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      queryHelper: {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn()
      },
      getMessage: jest.fn(),
      getUserConversations: jest.fn(),
      upsertMessageReceipt: jest.fn()
    };
    
    chatService = new ChatService();
    chatService.chatRepository = mockRepository;
    chatService.repository = mockRepository;
  });

  it('should throw an error if the message does not exist', async () => {
    mockRepository.getMessage.mockResolvedValueOnce(null);

    await expect(chatService.markMessageStatus('user-1', 'msg-1', 'delivered'))
      .rejects.toThrow('Message not found');
  });

  it('should throw an error if the user is not in the conversation', async () => {
    mockRepository.getMessage.mockResolvedValueOnce({ uuid: 'msg-1', conversation_uuid: 'conv-1' });
    mockRepository.getUserConversations.mockResolvedValueOnce([{ uuid: 'conv-2' }]);

    await expect(chatService.markMessageStatus('user-1', 'msg-1', 'delivered'))
      .rejects.toThrow('User is not a member of this conversation');
  });

  it('should call upsertMessageReceipt if user is authorized', async () => {
    mockRepository.getMessage.mockResolvedValueOnce({ uuid: 'msg-1', conversation_uuid: 'conv-1' });
    mockRepository.getUserConversations.mockResolvedValueOnce([{ uuid: 'conv-1' }]);

    await chatService.markMessageStatus('user-1', 'msg-1', 'delivered');

    expect(mockRepository.upsertMessageReceipt).toHaveBeenCalledWith('msg-1', 'user-1', 'delivered');
  });
});
