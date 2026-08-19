class PushNotificationService {
  constructor(notificationRepository) {
    this.notificationRepository = notificationRepository;
  }

  /**
   * Dispatch a push notification to all active devices for a user.
   * This operates asynchronously and does not block the main execution flow.
   */
  async sendPushNotification(userUuid, payload) {
    try {
      const activeTokens = await this.notificationRepository.getActiveDeviceTokens(userUuid);
      
      if (!activeTokens || activeTokens.length === 0) {
        return; // No active devices to push to
      }

      // Fan-out to all active devices
      const pushPromises = activeTokens.map(tokenRecord => 
        this._deliverToProvider(tokenRecord, payload)
      );

      // We do not await this heavily to avoid blocking.
      // In a highly scaled system, this could be pushed to a Redis queue.
      Promise.allSettled(pushPromises).then(results => {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`[PushService] Failed to send push to device ${activeTokens[index].device_id}`, result.reason);
            // Example: If FCM says "NotRegistered", we should mark the token inactive
            // if (result.reason.code === 'messaging/registration-token-not-registered') {
            //   this.notificationRepository.markTokenInactive(activeTokens[index].uuid);
            // }
          }
        });
      });

    } catch (err) {
      console.error('[PushService] Error dispatching push notifications:', err.message);
    }
  }

  /**
   * Internal method to simulate delivery to FCM/APNs.
   */
  async _deliverToProvider(tokenRecord, payload) {
    // TODO: Integrate Firebase Admin SDK or APNs here.
    // For now, this is a mock abstraction.
    console.log(`[PushService] Mock dispatch to ${tokenRecord.platform} token ${tokenRecord.push_token.substring(0, 10)}...: ${payload.title}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    return true;
  }
}

module.exports = PushNotificationService;
