const NotificationService = require('./notificationService');

describe('NotificationService', () => {
  let notificationService;
  let mockRepository;
  let mockIo;

  beforeEach(() => {
    mockRepository = {
      createNotification: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      getActiveDeviceTokens: jest.fn().mockResolvedValue([])
    };

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };

    // Mock socket.js getIo
    jest.mock('../../socket', () => ({
      getIo: () => mockIo
    }));

    notificationService = new NotificationService(mockRepository);
    
    // Mock the push service
    notificationService.pushService = {
      sendPushNotification: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a notification, emit via socket, and trigger push', async () => {
    const payload = {
      user_uuid: 'user-1',
      type: 'NEW_MESSAGE',
      title: 'Test',
      body: 'Test body',
      entity_type: 'message',
      entity_uuid: 'msg-1'
    };

    const createdRecord = { ...payload, uuid: 'notif-1', is_read: false };
    mockRepository.createNotification.mockResolvedValueOnce(createdRecord);

    const result = await notificationService.createNotification(payload);

    expect(mockRepository.createNotification).toHaveBeenCalledWith(payload);
    
    // Check Socket Emission
    expect(mockIo.to).toHaveBeenCalledWith('user:user-1');
    expect(mockIo.emit).toHaveBeenCalledWith('notification:receive', createdRecord);

    // Check Push Dispatch
    expect(notificationService.pushService.sendPushNotification).toHaveBeenCalledWith('user-1', {
      title: 'Test',
      body: 'Test body',
      data: {
        notification_uuid: 'notif-1',
        type: 'NEW_MESSAGE',
        entity_type: 'message',
        entity_uuid: 'msg-1'
      }
    });

    expect(result).toEqual(createdRecord);
  });

  it('should throw an error if missing required fields', async () => {
    await expect(notificationService.createNotification({ user_uuid: 'user-1' }))
      .rejects.toThrow('Missing required notification fields: user_uuid, type, title');
  });

  it('should get unread count', async () => {
    mockRepository.getUnreadCount.mockResolvedValueOnce(5);
    const count = await notificationService.getUnreadCount('user-1');
    expect(count).toBe(5);
    expect(mockRepository.getUnreadCount).toHaveBeenCalledWith('user-1');
  });
});
