const BaseController = require('../../base/baseController');
const { userActiveRooms } = require('./unoStore');
const UnoService = require('./unoService');

class UnoController extends BaseController {
  constructor(context = null) {
    super(context);
    this.unoService = new UnoService(context);
  }

  async createRoom(req, res) {
    try {
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const user = (req && req.user) || (this.context && this.context.user) || {};
      const { userData } = body;
      const { uuid } = user;

      // Clear any stuck lock to prevent permanent lockouts
      if (userActiveRooms.has(uuid)) {
        userActiveRooms.delete(uuid);
      }

      const userObj = {
        uuid,
        name: userData?.name || 'Player',
        avatar: userData?.avatar || null
      };

      const roomCode = await this.unoService.createRoom(userObj);
      return this.respondOk({ roomCode }, 'Room created successfully');
    } catch (error) {
      return this.respondError(error, 400);
    }
  }

  async joinRoom(req, res) {
    try {
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const user = (req && req.user) || (this.context && this.context.user) || {};
      const { roomCode, userData } = body;
      const { uuid } = user;

      // Clear any stuck lock to prevent permanent lockouts
      if (userActiveRooms.has(uuid)) {
        userActiveRooms.delete(uuid);
      }

      const userObj = {
        uuid,
        name: userData?.name || 'Player',
        avatar: userData?.avatar || null
      };

      const roomData = await this.unoService.joinRoom(roomCode.toUpperCase(), userObj);
      return this.respondOk(roomData, 'Joined room successfully');
    } catch (error) {
      console.error('[UnoController] Join Room Error:', error.message, 'Stack:', error.stack);
      return this.respondError(error, 400);
    }
  }

  async getUserRooms(req, res) {
    try {
      const user = (req && req.user) || (this.context && this.context.user) || {};
      const { uuid } = user;
      const rooms = await this.unoService.getUserRooms(uuid);
      return this.respondOk({ rooms }, 'User rooms fetched successfully');
    } catch (error) {
      return this.respondError(error, 400);
    }
  }

  async closeRoom(req, res) {
    try {
      const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const user = (req && req.user) || (this.context && this.context.user) || {};
      const { roomCode } = params;
      const { uuid } = user;
      await this.unoService.closeRoom(roomCode.toUpperCase(), uuid);
      return this.respondOk(null, 'Room closed successfully');
    } catch (error) {
      return this.respondError(error, 400);
    }
  }
}

module.exports = UnoController;
