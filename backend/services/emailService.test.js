const EmailService = require('./emailService');
const emailProvider = require('../providers/emailProvider');
const jobQueueService = require('./jobQueueService');
const QueryHelper = require('../database/queryHelper');

jest.mock('../providers/emailProvider');
jest.mock('./jobQueueService');
jest.mock('../database/queryHelper');

describe('EmailService', () => {
  let mockQueue;
  let mockQueryHelper;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' })
    };
    jobQueueService.getEmailQueue.mockReturnValue(mockQueue);

    mockQueryHelper = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue([])
    };
    QueryHelper.mockImplementation(() => mockQueryHelper);
  });

  describe('sendAsync', () => {
    it('should queue an email and log as PENDING', async () => {
      const jobId = await EmailService.sendAsync({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(jobId).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith('sendEmail', expect.objectContaining({
        to: 'test@example.com',
        html: '<p>Test</p>'
      }), expect.any(Object));

      expect(mockQueryHelper.insert).toHaveBeenCalledWith(expect.objectContaining({
        recipient: 'test@example.com',
        status: 'PENDING',
        type: 'TRANSACTIONAL'
      }));
    });

    it('should fail if neither template nor html is provided', async () => {
      await expect(EmailService.sendAsync({
        to: 'test@example.com',
        subject: 'Test'
      })).rejects.toThrow('Either "template" or "html" must be provided.');
    });
  });

  describe('sendDirect', () => {
    it('should successfully send direct HTML email and update log', async () => {
      emailProvider.sendEmail.mockResolvedValue({ messageId: 'msg-456' });

      const result = await EmailService.sendDirect({
        to: 'test@example.com',
        subject: 'Direct Test',
        html: '<p>Direct</p>'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-456');
      
      // Should call the provider
      expect(emailProvider.sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Direct Test',
        html: '<p>Direct</p>',
        text: undefined
      });

      // Should log COMPLETED
      expect(mockQueryHelper.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'COMPLETED'
      }));
    });

    it('should update log as FAILED if sending fails', async () => {
      emailProvider.sendEmail.mockRejectedValue(new Error('SMTP Error'));

      await expect(EmailService.sendDirect({
        to: 'test@example.com',
        subject: 'Fail Test',
        html: '<p>Fail</p>'
      })).rejects.toThrow('SMTP Error');

      expect(mockQueryHelper.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'FAILED',
        error_details: 'SMTP Error'
      }));
    });
  });
});
