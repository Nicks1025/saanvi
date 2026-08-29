const BaseController = require('../../base/baseController');
const RedisHelper = require('../../redis/redisHelper');
const UnoService = require('./unoService');

const unoService = new UnoService();

class UnoController extends BaseController {
  
  async createRoom(req, res) {
    try {
      const { userData } = req.body;
      const { uuid } = req.user;

      // Clear any stuck lock to prevent permanent lockouts
      const activeLock = await RedisHelper.get(`uno:player_active_room:${uuid}`);
      if (activeLock) {
        await RedisHelper.delete(`uno:player_active_room:${uuid}`);
      }

      const userObj = {
        uuid,
        name: userData?.name || 'Player',
        avatar: userData?.avatar || null
      };

      const roomCode = await unoService.createRoom(userObj);
      this.sendSuccess(res, { roomCode }, 'Room created successfully');
    } catch (error) {
      this.sendError(res, error, 400);
    }
  }

  async joinRoom(req, res) {
    try {
      const { roomCode, userData } = req.body;
      const { uuid } = req.user;

      // Clear any stuck lock to prevent permanent lockouts
      const activeLock = await RedisHelper.get(`uno:player_active_room:${uuid}`);
      if (activeLock) {
        await RedisHelper.delete(`uno:player_active_room:${uuid}`);
      }

      const userObj = {
        uuid,
        name: userData?.name || 'Player',
        avatar: userData?.avatar || null
      };

      const roomData = await unoService.joinRoom(roomCode.toUpperCase(), userObj);
      this.sendSuccess(res, roomData, 'Joined room successfully');
    } catch (error) {
      console.error('[UnoController] Join Room Error:', error.message, 'Stack:', error.stack);
      this.sendError(res, error, 400);
    }
  }

  async getUserRooms(req, res) {
    try {
      const { uuid } = req.user;
      const rooms = await unoService.getUserRooms(uuid);
      this.sendSuccess(res, { rooms }, 'User rooms fetched successfully');
    } catch (error) {
      this.sendError(res, error, 400);
    }
  }

  async deleteRoom(req, res) {
    try {
      const { roomId } = req.params;
      const { uuid } = req.user;
      
      const deleted = await unoService.deleteRoom(roomId.toUpperCase(), uuid);
      if (deleted) {
        this.sendSuccess(res, null, 'Room deleted successfully');
      } else {
        this.sendError(res, new Error('Room not found or unauthorized'), 404);
      }
    } catch (error) {
      this.sendError(res, error, 400);
    }
  }
}

module.exports = new UnoController();
