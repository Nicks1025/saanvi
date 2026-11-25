const EmailTemplateService = require('./emailTemplateService');
const EmailTemplateController = require('./emailTemplateController');

describe('Email Templates & Logs Standardization', () => {
  let mockRepository;
  let service;
  let controller;

  beforeEach(() => {
    mockRepository = {
      getEmailLogs: jest.fn(),
      getTemplateByUuid: jest.fn(),
      getLinkedWorkflows: jest.fn(),
      deleteTemplate: jest.fn(),
      getTableColumns: jest.fn()
    };
    service = new EmailTemplateService();
    service.repository = mockRepository;
    controller = new EmailTemplateController();
    controller.service = service;
  });

  it('service.getEmailLogs should map database snake_case fields to canonical camelCase', async () => {
    mockRepository.getEmailLogs.mockResolvedValueOnce({
      data: [
        {
          uuid: 'log-1',
          recipient: 'alice@example.com',
          template_key: 'WELCOME_EMAIL',
          subject: 'Welcome to Saanvi',
          status: 'SENT',
          error_message: null,
          created_at: '2026-10-24T00:00:00.000Z'
        }
      ],
      total: 1,
      page: 1,
      limit: 10
    });

    const result = await service.getEmailLogs(1, 10, '');
    expect(result.data).toHaveLength(1);
    const item = result.data[0];
    expect(item).toEqual({
      uuid: 'log-1',
      recipient: 'alice@example.com',
      templateKey: 'WELCOME_EMAIL',
      subject: 'Welcome to Saanvi',
      status: 'SENT',
      errorMessage: null,
      createdAt: '2026-10-24T00:00:00.000Z'
    });
    expect(item.template_key).toBeUndefined();
    expect(item.error_message).toBeUndefined();
    expect(item.created_at).toBeUndefined();
  });

  it('controller.getEmailLogs should return standardized respondPaginated contract', async () => {
    mockRepository.getEmailLogs.mockResolvedValueOnce({
      data: [
        {
          uuid: 'log-1',
          recipient: 'bob@example.com',
          template_key: 'RESET_PASSWORD',
          subject: 'Reset Password',
          status: 'SENT',
          error_message: null,
          created_at: '2026-10-24T00:00:00.000Z'
        }
      ],
      total: 25,
      page: 2,
      limit: 10
    });

    const req = {
      query: { page: '2', limit: '10', search: 'bob' }
    };
    const jsonMock = jest.fn();
    const res = {
      status: jest.fn().mockReturnValue({ json: jsonMock })
    };

    await controller.getEmailLogs(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({
          recipient: 'bob@example.com',
          templateKey: 'RESET_PASSWORD'
        })
      ]),
      pagination: {
        pageNumber: 2,
        pageSize: 10,
        totalRecords: 25,
        totalPages: 3
      },
      message: null
    });
  });
});
