const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const UnoController = require('./unoController');

const unoApi = new ApiSchema({
  name: 'Uno',
  url: '/api/uno',
  endpoints: [
    {
      path: '/create',
      verb: 'POST',
      middleware: {
        requireAuth: true
      },
      request: {
        body: Joi.object({
          name: Joi.string().allow('', null).optional(),
          playerLimit: Joi.number().integer().min(2).max(10).optional(),
          rules: Joi.object().optional(),
          userData: Joi.object({
            name: Joi.string().required(),
            avatar: Joi.string().allow('', null).optional()
          }).required()
        }).unknown(true)
      },
      handler: {
        controller: UnoController,
        method: 'createRoom'
      }
    },
    {
      path: '/join',
      verb: 'POST',
      middleware: {
        requireAuth: true
      },
      request: {
        body: Joi.object({
          roomCode: Joi.string().required().uppercase().min(3).max(10),
          userData: Joi.object({
            name: Joi.string().required(),
            avatar: Joi.string().allow('', null).optional()
          }).required()
        }).unknown(true)
      },
      handler: {
        controller: UnoController,
        method: 'joinRoom'
      }
    },
    {
      path: '/rooms',
      verb: 'GET',
      middleware: {
        requireAuth: true
      },
      handler: {
        controller: UnoController,
        method: 'getUserRooms'
      }
    },
    {
      path: '/rooms/:roomCode/close',
      verb: 'POST',
      middleware: {
        requireAuth: true
      },
      request: {
        params: Joi.object({
          roomCode: Joi.string().required().uppercase().min(3).max(10)
        })
      },
      handler: {
        controller: UnoController,
        method: 'closeRoom'
      }
    }
  ]
});

module.exports = unoApi;
