const { v4: uuidv4 } = require('uuid');
const QueryHelper = require('../../database/queryHelper');

class NotificationRepository {
  constructor() {
    this.queryHelper = new QueryHelper();
  }

  async createNotification(payload) {
    const uuid = uuidv4();
    const result = await this.queryHelper
      .from('notifications')
      .insert({
        uuid,
        user_uuid: payload.user_uuid,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entity_type: payload.entity_type || null,
        entity_uuid: payload.entity_uuid || null,
        is_read: false
      })
      .execute();
    return result[0];
  }

  async getNotifications(userUuid, limit = 50, after = null) {
    const query = this.queryHelper
      .from('notifications')
      .where('user_uuid', 'eq', userUuid)
      .orderBy('created_at', false)
      .limit(limit);

    if (after) {
      query.where('created_at', '>', after);
    }

    return await query.execute();
  }

  async getUnreadCount(userUuid) {
    // For aggregate functions, QueryHelper is limited, so we can use db.raw if needed
    // or just fetch counts
    const db = this.queryHelper.db;
    const result = await db('notifications')
      .where('user_uuid', userUuid)
      .where('is_read', false)
      .count('uuid as count')
      .first();
    
    return parseInt(result.count || 0, 10);
  }

  async markAsRead(userUuid, notificationUuid) {
    const result = await this.queryHelper
      .from('notifications')
      .update({ is_read: true, read_at: new Date() })
      .where('user_uuid', 'eq', userUuid)
      .where('uuid', 'eq', notificationUuid)
      .execute();
    return result[0];
  }

  async markAllAsRead(userUuid) {
    // QueryHelper updates where condition
    const result = await this.queryHelper.db('notifications')
      .update({ is_read: true, read_at: new Date() })
      .where('user_uuid', userUuid)
      .where('is_read', false)
      .returning('*');
    return result;
  }

  // --- Device Tokens ---
  async upsertDeviceToken(userUuid, deviceId, platform, pushToken) {
    const existing = await this.queryHelper
      .from('device_tokens')
      .where('user_uuid', 'eq', userUuid)
      .where('device_id', 'eq', deviceId)
      .execute();

    if (existing && existing.length > 0) {
      const result = await this.queryHelper
        .from('device_tokens')
        .update({
          push_token: pushToken,
          platform: platform,
          is_active: true,
          last_seen_at: new Date()
        })
        .where('uuid', 'eq', existing[0].uuid)
        .execute();
      return result[0];
    } else {
      const uuid = uuidv4();
      const result = await this.queryHelper
        .from('device_tokens')
        .insert({
          uuid,
          user_uuid: userUuid,
          device_id: deviceId,
          platform: platform,
          push_token: pushToken,
          is_active: true
        })
        .execute();
      return result[0];
    }
  }

  async removeDeviceToken(userUuid, deviceId) {
    const result = await this.queryHelper.db('device_tokens')
      .where('user_uuid', userUuid)
      .where('device_id', deviceId)
      .del()
      .returning('*');
    return result[0];
  }

  async getActiveDeviceTokens(userUuid) {
    return await this.queryHelper
      .from('device_tokens')
      .where('user_uuid', 'eq', userUuid)
      .where('is_active', 'eq', true)
      .execute();
  }

  async markTokenInactive(tokenUuid) {
    const result = await this.queryHelper
      .from('device_tokens')
      .update({ is_active: false })
      .where('uuid', 'eq', tokenUuid)
      .execute();
    return result[0];
  }
}

module.exports = NotificationRepository;
