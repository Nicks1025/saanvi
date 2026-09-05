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

const changePassword = {
  path: '/me/password',
  verb: 'PUT',
  auditMessage: 'updating user password',
  handler: {
    controller: userController,
    method: 'changePassword'
  },
  middleware: {
    requireAuth: true
  },
  request: {
    body: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: Joi.string().required()
    })
  }
};

const deleteAccount = {
  path: '/me',
  verb: 'DELETE',
  auditMessage: 'deleting user account',
  handler: {
    controller: userController,
    method: 'deleteAccount'
  },
  middleware: {
    requireAuth: true
  }
};

const UserApi = {
  name: 'User',
  url: '/api/users',
  endpoints: [
    getMe,
    updateProfile,
    updateSettings,
    changePassword,
    deleteAccount
  ]
};

module.exports = new ApiSchema(UserApi);
