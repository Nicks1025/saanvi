const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const UserController = require('./userController');
const uploadMiddleware = require('../../base/uploadMiddleware');

const getMe = {
  path: '/me',
  verb: 'GET',
  auditMessage: 'getting current user profile',
  handler: {
    controller: UserController,
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
    controller: UserController,
    method: 'updateProfile'
  },
  middleware: {
    requireAuth: true,
    custom: [uploadMiddleware.single('profile_image')]
  }
};

const updateSettings = {
  path: '/me/settings',
  verb: 'PUT',
  auditMessage: 'updating current user settings',
  handler: {
    controller: UserController,
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
    controller: UserController,
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
    controller: UserController,
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
