const BaseRepository = require('../../base/baseRepository');

class CampaignRepository extends BaseRepository {
  constructor(queryHelper) {
    super(queryHelper, 'sph_email_campaigns');
  }

  async getAllCampaigns(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return await this.queryHelper.db('sph_email_campaigns')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  async getCampaignByUuid(uuid) {
    const campaigns = await this.queryHelper.from('sph_email_campaigns').where('uuid', 'eq', uuid).execute();
    return campaigns[0] || null;
  }

  async createCampaign(data) {
    return await this.queryHelper.from('sph_email_campaigns').insert(data).execute();
  }

  async updateCampaign(uuid, data) {
    return await this.queryHelper.from('sph_email_campaigns').where('uuid', 'eq', uuid).update(data).execute();
  }

  async createRecipients(recipients) {
    if (!recipients || recipients.length === 0) return;
    
    // Batch insert recipients
    const batchSize = 1000;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      await this.queryHelper.db('sph_email_campaign_recipients').insert(batch);
    }
  }

  async getAudience(audienceType) {
    // For now, we fetch users who have marketing_opt_in = true and status = 'ACTIVE'
    // This can be expanded later for more granular audiences
    let query = this.queryHelper.db('users')
      .select('uuid', 'email')
      .where('marketing_opt_in', true)
      .where('status', 'active');
      
    if (audienceType === 'VERIFIED_USERS') {
      query = query.where('is_email_verified', true);
    }
    
    return await query;
  }

  async optOutUser(email) {
    return await this.queryHelper.db('users').where('email', email).update({ marketing_opt_in: false });
  }
}

module.exports = CampaignRepository;
