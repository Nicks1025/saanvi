const SignupController = require('./signupController');
const SignupService = require('./signupService');
const SignupRepository = require('./signupRepository');
const signupApi = require('./signupApi');
const ApiContext = require('../../base/apiContext');

describe('Signup Architecture & Unit Tests', () => {
  let mockContext;
  let mockRes;
  let mockReq;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockReq = {
      body: {}
    };
    mockContext = new ApiContext(mockReq, mockRes);
  });

  it('ApiSchema references SignupController class directly', () => {
    expect(signupApi.endpoints.length).toBe(2);
    expect(signupApi.endpoints[0].handler.controller).toBe(SignupController);
    expect(signupApi.endpoints[1].handler.controller).toBe(SignupController);
  });

  it('SignupController instantiates SignupService which instantiates SignupRepository', () => {
    const controller = new SignupController(mockContext);
    expect(controller.signupService).toBeInstanceOf(SignupService);
    expect(controller.signupService.repository).toBeInstanceOf(SignupRepository);
  });

  it('SignupRepository initializes table-bound QueryHelpers in constructor', () => {
    const repo = new SignupRepository(mockContext);
    expect(repo.sqlUsers._table).toBe('users');
    expect(repo.sqlUserDetails._table).toBe('user_details');
    expect(repo.sqlRoles._table).toBe('roles');
    expect(repo.sqlUserRoles._table).toBe('user_roles');
  });

  it('SignupController.signup validates required parameters', async () => {
    const controller = new SignupController(mockContext);
    mockReq.body = { email: 'test@example.com' };
    await expect(controller.signup(mockReq)).rejects.toThrow('Missing required field: password');
  });
});
