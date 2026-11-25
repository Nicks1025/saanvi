const BaseService = require('../../base/baseService');
const CampaignRepository = require('./campaignRepository');
const EmailService = require('../../services/emailService');
const crypto = require('crypto');

class CampaignService extends BaseService {
  constructor(context = null) {
    super(context);
    this.repository = new CampaignRepository(context);
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
      audience_type: data.audience_type || 'ALL',
      target_emails: JSON.stringify(data.target_emails || []),
      created_by: userUuid
    };
    
    if (!payload.template_key && !payload.html_body) {
      throw new Error('Either template_key or html_body must be provided.');
    }

    await this.repository.createCampaign(payload);
    return payload;
  }

  async updateCampaign(uuid, data, userUuid) {
    await this.getCampaign(uuid);

    const payload = {
      name: data.name,
      subject: data.subject,
      template_key: data.template_key || null,
      html_body: data.html_body || null,
      scheduled_at: data.scheduled_at || null,
      audience_type: data.audience_type || 'ALL',
      target_emails: JSON.stringify(data.target_emails || []),
      updated_at: new Date().toISOString()
    };

    if (!payload.template_key && !payload.html_body) {
      throw new Error('Either template_key or html_body must be provided.');
    }

    await this.repository.updateCampaign(uuid, payload);
    return await this.getCampaign(uuid);
  }

  async deleteCampaign(uuid) {
    await this.getCampaign(uuid);
    await this.repository.deleteCampaign(uuid);
    return { message: 'Campaign deleted successfully.' };
  }

  async sendCampaign(uuid) {
    const campaign = await this.getCampaign(uuid);
    if (campaign.status === 'SENT' || campaign.status === 'PROCESSING') {
      throw new Error(`Campaign cannot be sent because it is in ${campaign.status} status.`);
    }

    // 1. Resolve Audience
    let recipients = [];
    if (campaign.audience_type === 'SPECIFIC') {
      let targetEmails = campaign.target_emails;
      if (typeof targetEmails === 'string') {
        try { targetEmails = JSON.parse(targetEmails); } catch(e) { targetEmails = []; }
      }
      recipients = await this.repository.getSpecificAudience(targetEmails);
    } else {
      recipients = await this.repository.getAudience(campaign.audience_type);
    }

    if (!recipients || recipients.length === 0) {
      throw new Error('No eligible recipients found for this campaign.');
    }

    // 2. Mark Campaign as PROCESSING
    await this.repository.updateCampaign(uuid, {
      status: 'PROCESSING',
      total_recipients: recipients.length,
      updated_at: new Date().toISOString()
    });

    // 3. Queue emails through centralized email service
    const campaignRecipients = [];
    for (const user of recipients) {
      const recipientUuid = this.generateUuid();
      
      // Generate unique unsubscribe token
      const token = crypto.randomBytes(32).toString('hex');
      const unsubscribeUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/marketing/unsubscribe?token=${token}&email=${encodeURIComponent(user.email)}`;

      campaignRecipients.push({
        uuid: recipientUuid,
        campaign_uuid: uuid,
        recipient_email: user.email,
        status: 'PENDING',
        unsubscribe_token: token
      });

      // Centralized async job queue
      await EmailService.sendAsync({
        template: campaign.template_key || null,
        rawHtml: campaign.html_body || null,
        subject: campaign.subject,
        to: user.email,
        type: 'MARKETING',
        variables: {
          unsubscribe_url: unsubscribeUrl,
          campaign_name: campaign.name
        }
      });
    }

    // 4. Batch record all recipients
    await this.repository.createRecipients(campaignRecipients);

    // 5. Update Status to SENT
    await this.repository.updateCampaign(uuid, {
      status: 'SENT',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    return { message: `Campaign sent to ${recipients.length} recipients.` };
  }

  async handleUnsubscribe(email, token) {
    if (!email) throw new Error('Email is required to unsubscribe.');
    await this.repository.optOutUser(email);
    return { message: 'You have been successfully unsubscribed from marketing emails.' };
  }
}

module.exports = CampaignService;
