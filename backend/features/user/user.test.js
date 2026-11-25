const UserController = require('./userController');
const UserService = require('./userService');
const UserRepository = require('./userRepository');
const userApi = require('./userApi');
const ApiContext = require('../../base/apiContext');

describe('User Architecture & Unit Tests', () => {
  let mockContext;
  let mockRes;
  let mockReq;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockReq = {
      user: { uuid: 'test-user-uuid' },
      body: {}
    };
    mockContext = new ApiContext(mockReq, mockRes);
  });

  it('ApiSchema references UserController class directly across all endpoints', () => {
    expect(userApi.endpoints.length).toBe(5);
    for (const endpoint of userApi.endpoints) {
      expect(endpoint.handler.controller).toBe(UserController);
    }
  });

  it('UserController instantiates UserService which instantiates UserRepository', () => {
    const controller = new UserController(mockContext);
    expect(controller.userService).toBeInstanceOf(UserService);
    expect(controller.userService.repository).toBeInstanceOf(UserRepository);
  });

  it('UserRepository initializes table-bound QueryHelpers in constructor', () => {
    const repo = new UserRepository(mockContext);
    expect(repo.sql._table).toBe('users');
    expect(repo.sqlUserDetails._table).toBe('user_details');
    expect(repo.sqlUsersSimple._table).toBe('users');
  });

  it('UserController.getMe responds with standard respondOk envelope', async () => {
    const controller = new UserController(mockContext);
    jest.spyOn(controller.userService.repository, 'runQueryFirst').mockResolvedValue({
      uuid: 'test-user-uuid',
      email: 'test@example.com',
      is_mfa_enabled: false,
      is_email_verified: true,
      status: 'active',
      language: 'en',
      theme: 'dark',
      font: 'sans'
    });

    await controller.getMe();

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'User retrieved successfully',
        data: expect.objectContaining({
          uuid: 'test-user-uuid'
        })
      })
    );
  });
});
