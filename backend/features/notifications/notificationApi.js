const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const notificationController = require('./notificationController');

const NotificationApi = {
  name: 'Notifications',
  url: '/api/notifications',
  endpoints: [
    {
      path: "/",
      verb: "GET",
      auditMessage: "getting notifications",
      handler: { controller: notificationController, method: "getNotifications" },
      middleware: { requireAuth: true }
    },
    {
      path: "/unread-count",
      verb: "GET",
      auditMessage: "getting notification unread count",
      handler: { controller: notificationController, method: "getUnreadCount" },
      middleware: { requireAuth: true }
    },
    {
      path: "/mark-all-read",
      verb: "PUT",
      auditMessage: "marking all notifications as read",
      handler: { controller: notificationController, method: "markAllAsRead" },
      middleware: { requireAuth: true }
    },
    {
      path: "/:uuid/read",
      verb: "PUT",
      auditMessage: "marking notification as read",
      handler: { controller: notificationController, method: "markAsRead" },
      middleware: { requireAuth: true }
    },
    {
      path: "/device-tokens",
      verb: "POST",
      auditMessage: "registering device token",
      handler: { controller: notificationController, method: "registerDeviceToken" },
      middleware: { requireAuth: true },
      request: {
        body: Joi.object({
          device_id: Joi.string().required(),
          platform: Joi.string().valid('ios', 'android', 'web').required(),
          push_token: Joi.string().required()
        })
      }
    },
    {
      path: "/device-tokens/:device_id",
      verb: "DELETE",
      auditMessage: "removing device token",
      handler: { controller: notificationController, method: "removeDeviceToken" },
      middleware: { requireAuth: true }
    }
  ]
};

module.exports = new ApiSchema(NotificationApi);
