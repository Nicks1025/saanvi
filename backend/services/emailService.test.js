const EmailService = require('./emailService');
const emailProvider = require('../providers/emailProvider');
const QueryHelper = require('../database/queryHelper');

jest.mock('../providers/emailProvider');
jest.mock('../database/queryHelper');

describe('EmailService', () => {
  let mockDbQuery;
  let mockQh;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDbQuery = {
      insert: jest.fn().mockResolvedValue([1]),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue([1]),
      del: jest.fn().mockResolvedValue([1]),
    };

    mockQh = {
      db: jest.fn(() => mockDbQuery),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([]),
    };

    QueryHelper.mockImplementation(() => mockQh);
  });

  describe('sendAsync', () => {
    it('should queue an email into sph_email_queue and log as PENDING', async () => {
      const logUuid = await EmailService.sendAsync({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(logUuid).toBeDefined();
      expect(mockQh.db).toHaveBeenCalledWith('sph_email_logs');
      expect(mockQh.db).toHaveBeenCalledWith('sph_email_queue');
    });

    it('should throw if neither template nor html provided', async () => {
      await expect(
        EmailService.sendAsync({
          to: 'test@example.com',
          subject: 'Test',
        })
      ).rejects.toThrow('Either "template" or "html" must be provided.');
    });
  });

  describe('sendDirect', () => {
    it('should successfully send direct HTML email and update log', async () => {
      emailProvider.sendEmail.mockResolvedValue({ messageId: 'msg-456' });

      const result = await EmailService.sendDirect({
        to: 'test@example.com',
        subject: 'Direct Test',
        html: '<p>Direct</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-456');

      expect(emailProvider.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Direct Test',
        html: '<p>Direct</p>',
        text: undefined,
      });
    });

    it('should update log as FAILED if sending fails', async () => {
      emailProvider.sendEmail.mockRejectedValue(new Error('SMTP Error'));

      await expect(
        EmailService.sendDirect({
          to: 'test@example.com',
          subject: 'Fail Test',
          html: '<p>Fail</p>',
        }, 'log-job-123')
      ).rejects.toThrow('SMTP Error');

      expect(mockQh.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
          error_details: 'SMTP Error',
        })
      );
    });
  });
});
