const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');

class CampaignRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sqlCampaigns = new QueryHelper('sph_email_campaigns');
    this.sqlRecipients = new QueryHelper('sph_email_campaign_recipients');
    this.sqlUsers = new QueryHelper('users');
  }

  async getAllCampaigns(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const query = this.sqlCampaigns
      .select()
      .field('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return this.runQuery(query);
  }

  async getCampaignByUuid(uuid) {
    const query = this.sqlCampaigns
      .select()
      .field('*')
      .where('uuid', '=', uuid);

    return this.runQueryFirst(query);
  }

  async createCampaign(data) {
    const query = this.sqlCampaigns.insert(data);
    const result = await this.execute(query);
    return result.rows[0];
  }

  async updateCampaign(uuid, data) {
    const query = this.sqlCampaigns
      .update(data)
      .where('uuid', '=', uuid);

    const result = await this.execute(query);
    return result.rows[0];
  }

  async deleteCampaign(uuid) {
    const query = this.sqlCampaigns
      .delete()
      .where('uuid', '=', uuid);

    return this.execute(query);
  }

  async createRecipients(recipients) {
    if (!recipients || recipients.length === 0) return;
    
    const batchSize = 1000;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      await this.execute(this.sqlRecipients.insert(batch));
    }
  }

  async getAudience(audienceType) {
    const query = this.sqlUsers
      .select()
      .field('uuid')
      .field('email')
      .where('marketing_opt_in', '=', true)
      .where('status', '=', 'active');
      
    if (audienceType === 'VERIFIED_USERS') {
      query.where('is_email_verified', '=', true);
    }
    
    return this.runQuery(query);
  }

  async getSpecificAudience(emails) {
    if (!emails || emails.length === 0) return [];
    const query = this.sqlUsers
      .select()
      .field('uuid')
      .field('email')
      .whereIn('email', emails)
      .where('status', '=', 'active');

    return this.runQuery(query);
  }

  async optOutUser(email) {
    const query = this.sqlUsers
      .update({ marketing_opt_in: false })
      .where('email', '=', email);

    return this.execute(query);
  }
}

module.exports = CampaignRepository;
