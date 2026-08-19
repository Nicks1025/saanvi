const PushNotificationService = require('../../services/pushNotificationService');

class NotificationService {
  constructor(notificationRepository) {
    this.notificationRepository = notificationRepository;
    this.pushService = new PushNotificationService(this.notificationRepository);
  }

  /**
   * Create a notification, persist it, emit via Socket.IO, and trigger Push.
   */
  async createNotification(payload) {
    const { user_uuid, type, title, body, entity_type, entity_uuid } = payload;
    
    if (!user_uuid || !type || !title) {
      throw new Error('Missing required notification fields: user_uuid, type, title');
    }

    // 1. Persist to Source of Truth (Database)
    const notification = await this.notificationRepository.createNotification({
      user_uuid,
      type,
      title,
      body,
      entity_type,
      entity_uuid
    });

    // 2. Real-time Delivery via Socket.IO
    const { getIo } = require('../../socket');
    const io = getIo();
    if (io) {
      // Emit strictly to the user's private room
      io.to(`user:${user_uuid}`).emit('notification:receive', notification);
    }

    // 3. Offline / Mobile Delivery via Push Service
    // We do not await this, to prevent delaying the caller (e.g. ChatService)
    this.pushService.sendPushNotification(user_uuid, {
      title: notification.title,
      body: notification.body,
      data: {
        notification_uuid: notification.uuid,
        type: notification.type,
        entity_type: notification.entity_type,
        entity_uuid: notification.entity_uuid
      }
    });

    return notification;
  }

  async getNotifications(userUuid, limit, after) {
    return await this.notificationRepository.getNotifications(userUuid, limit, after);
  }

  async getUnreadCount(userUuid) {
    return await this.notificationRepository.getUnreadCount(userUuid);
  }

  async markAsRead(userUuid, notificationUuid) {
    return await this.notificationRepository.markAsRead(userUuid, notificationUuid);
  }

  async markAllAsRead(userUuid) {
    return await this.notificationRepository.markAllAsRead(userUuid);
  }

  // --- Device Tokens ---
  async registerDeviceToken(userUuid, deviceId, platform, pushToken) {
    if (!deviceId || !platform || !pushToken) {
      throw new Error('Missing required fields for token registration');
    }
    return await this.notificationRepository.upsertDeviceToken(userUuid, deviceId, platform, pushToken);
  }

  async removeDeviceToken(userUuid, deviceId) {
    return await this.notificationRepository.removeDeviceToken(userUuid, deviceId);
  }
}

module.exports = NotificationService;
