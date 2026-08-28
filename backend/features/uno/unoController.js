const BaseController = require('../../base/baseController');
const UnoService = require('./unoService');

const unoService = new UnoService();

class UnoController extends BaseController {
  
  async createRoom(req, res) {
    try {
      const { userData } = req.body;
      const { uuid } = req.user;
      
      const activeRooms = await unoService.getUserRooms(uuid);
      if (activeRooms.length > 0) {
        return this.sendError(res, new Error('You already have an active room. Delete it or join back.'), 400);
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
      
      const activeRooms = await unoService.getUserRooms(uuid);
      if (activeRooms.length > 0) {
        const isJoiningOwnRoom = activeRooms.some(r => r.code === roomCode.toUpperCase());
        if (!isJoiningOwnRoom) {
           return this.sendError(res, new Error('You already have an active room. Delete it or join back.'), 400);
        }
      }

      const userObj = {
        uuid,
        name: userData?.name || 'Player',
        avatar: userData?.avatar || null
      };

      const roomData = await unoService.joinRoom(roomCode.toUpperCase(), userObj);
      this.sendSuccess(res, roomData, 'Joined room successfully');
    } catch (error) {
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
