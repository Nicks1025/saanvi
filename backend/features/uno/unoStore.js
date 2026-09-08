const rooms = new Map();
const userActiveRooms = new Map();
const userCreatedRooms = new Map(); // Map<userId, Set<roomCode>>

module.exports = {
  rooms,
  userActiveRooms,
  userCreatedRooms
};
