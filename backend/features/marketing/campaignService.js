const BaseService = require('../../base/baseService');
const EmailService = require('../../services/emailService');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class CampaignService extends BaseService {
  constructor(campaignRepository) {
    super(campaignRepository);
  }

  async getAllCampaigns(page = 1, limit = 20) {
    return await this.repository.getAllCampaigns(page, limit);
  }

  async getCampaign(uuid) {
    const campaign = await this.repository.getCampaignByUuid(uuid);
    if (!campaign) throw new Error('Campaign not found.');
    return campaign;
  }

  async createCampaign(data, userUuid) {
    const payload = {
      uuid: this.generateUuid(),
      name: data.name,
      subject: data.subject,
      template_key: data.template_key || null,
      html_body: data.html_body || null,
      status: 'DRAFT',
      scheduled_at: data.scheduled_at || null,
      created_by: userUuid
    };
    
    if (!payload.template_key && !payload.html_body) {
      throw new Error('Either template_key or html_body must be provided.');
    }

    await this.repository.createCampaign(payload);
    return payload;
  }

  async sendCampaign(uuid) {
    const campaign = await this.getCampaign(uuid);
    
    if (campaign.status !== 'DRAFT') {
      throw new Error('Only DRAFT campaigns can be sent.');
    }

    // Mark as processing
    await this.repository.updateCampaign(uuid, {
      status: 'PROCESSING',
      started_at: new Date().toISOString()
    });

    // Resolve Audience (for now we assume 'ALL_ACTIVE_USERS' or similar logic in repo)
    // You could pass audience_type from campaign if it was added to the schema.
    const audience = await this.repository.getAudience('ALL_ACTIVE_USERS');
    
    if (audience.length === 0) {
      await this.repository.updateCampaign(uuid, {
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
      });
      return { message: 'Campaign completed with 0 recipients.' };
    }

    // Create recipients logs
    const recipients = audience.map(u => ({
      uuid: uuidv4(),
      campaign_uuid: uuid,
      user_uuid: u.uuid,
      email: u.email,
      status: 'PENDING'
    }));

    await this.repository.createRecipients(recipients);

    // Queue emails asynchronously
    for (const recipient of recipients) {
      // Create unsubscribe token using a simple HMAC
      const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET || 'secret');
      hmac.update(recipient.email);
      const token = hmac.digest('hex');
      
      const unsubscribeUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/marketing/unsubscribe?email=${encodeURIComponent(recipient.email)}&token=${token}`;

      const variables = {
        unsubscribe_url: unsubscribeUrl
      };

      try {
        await EmailService.sendAsync({
          to: recipient.email,
          subject: campaign.subject,
          template: campaign.template_key,
          html: campaign.html_body,
          variables,
          type: 'MARKETING',
          campaign_uuid: campaign.uuid
        });
      } catch (err) {
        console.error(`[CampaignService] Failed to queue marketing email for ${recipient.email}:`, err.message);
      }
    }

    // In a real robust system, a worker would poll PROCESSING campaigns to check if all recipients are COMPLETED/FAILED.
    // Here we mark it COMPLETED once queued, as the EmailService async handles the rest.
    await this.repository.updateCampaign(uuid, {
      status: 'COMPLETED',
      completed_at: new Date().toISOString()
    });

    return { message: `Campaign sent/queued for ${audience.length} recipients.` };
  }

  async unsubscribe(email, token) {
    if (!email || !token) throw new Error('Email and token are required.');
    
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET || 'secret');
    hmac.update(email);
    const expectedToken = hmac.digest('hex');
    
    if (token !== expectedToken) {
      throw new Error('Invalid unsubscribe token.');
    }
    
    await this.repository.optOutUser(email);
    return { message: 'Successfully unsubscribed from marketing emails.' };
  }
}

module.exports = CampaignService;
