const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');

const QueryHelper = require('../../database/queryHelper');
const UserRepository = require('./userRepository');
const UserService = require('./userService');
const UserController = require('./userController');
const uploadMiddleware = require('../../base/uploadMiddleware');

const queryHelper = new QueryHelper();
const userRepository = new UserRepository(queryHelper);
const userService = new UserService(userRepository);
const userController = new UserController(userService);

const getMe = {
  path: '/me',
  verb: 'GET',
  auditMessage: 'getting current user profile',
  handler: {
    controller: userController,
    method: 'getMe'
  },
  middleware: {
    requireAuth: true
  }
};

const updateProfile = {
  path: '/profile',
  verb: 'PUT',
  auditMessage: 'updating user profile',
  handler: {
    controller: userController,
    method: 'updateProfile'
  },
  middleware: {
    requireAuth: true,
    custom: [uploadMiddleware.single('profile_image')]
  }
  // No Joi body validation here because we are accepting multipart/form-data.
  // Validation is handled manually in the service layer.
};

const updateSettings = {
  path: '/me/settings',
  verb: 'PUT',
  auditMessage: 'updating current user settings',
  handler: {
    controller: userController,
    method: 'updateSettings'
  },
  middleware: {
    requireAuth: true
  },
  request: {
    body: Joi.object({
      language: Joi.string().optional(),
      theme: Joi.string().optional(),
      font: Joi.string().optional()
    })
  }
};

const UserApi = {
  name: 'User',
  url: '/api/users',
  endpoints: [
    getMe,
    updateProfile,
    updateSettings
  ]
};

module.exports = new ApiSchema(UserApi);
