const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const unoController = require('./unoController');

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
      handler: {
        controller: unoController,
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
            name: Joi.string().allow('', null),
            avatar: Joi.string().allow('', null)
          }).optional()
        }).unknown(true)
      },
      handler: {
        controller: unoController,
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
        controller: unoController,
        method: 'getUserRooms'
      }
    },
    {
      path: '/rooms/:roomId',
      verb: 'DELETE',
      middleware: {
        requireAuth: true
      },
      request: {
        params: Joi.object({
          roomId: Joi.string().required().uppercase()
        })
      },
      handler: {
        controller: unoController,
        method: 'deleteRoom'
      }
    }
  ]
});

module.exports = unoApi;
