const NotificationRepository = require('./notificationRepository');
const NotificationService = require('./notificationService');

const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);

class NotificationController {
  
  async getNotifications(req, res, next) {
    try {
      const userUuid = req.user.uuid;
      const limit = parseInt(req.query.limit, 10) || 50;
      const after = req.query.after;

      const notifications = await notificationService.getNotifications(userUuid, limit, after);
      res.json({ success: true, data: notifications });
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const userUuid = req.user.uuid;
      const count = await notificationService.getUnreadCount(userUuid);
      res.json({ success: true, count });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const userUuid = req.user.uuid;
      const { uuid } = req.params;

      const updated = await notificationService.markAsRead(userUuid, uuid);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Notification not found' });
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const userUuid = req.user.uuid;
      await notificationService.markAllAsRead(userUuid);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  // --- Device Tokens ---
  async registerDeviceToken(req, res, next) {
    try {
      const userUuid = req.user.uuid;
      const { device_id, platform, push_token } = req.body;

      const token = await notificationService.registerDeviceToken(userUuid, device_id, platform, push_token);
      res.json({ success: true, data: token });
    } catch (err) {
      next(err);
    }
  }

  async removeDeviceToken(req, res, next) {
    try {
      const userUuid = req.user.uuid;
      const { device_id } = req.params;

      await notificationService.removeDeviceToken(userUuid, device_id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationController();
