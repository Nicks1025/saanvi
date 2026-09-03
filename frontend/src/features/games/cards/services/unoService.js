import axios from '@/services/axios.client';

export const createUnoRoom = async (roomData, userData) => {
  const response = await axios.post('/api/uno/create', { ...roomData, userData });
  return response.data; // { roomCode }
};

export const joinUnoRoom = async (roomCode, userData) => {
  const response = await axios.post('/api/uno/join', { roomCode, userData });
  return response.data; // room object
};

export const fetchUserRooms = async () => {
  const response = await axios.get('/api/uno/rooms');
  return response.data;
};

export const deleteUserRoom = async (roomId) => {
  const response = await axios.delete(`/api/uno/rooms/${roomId}`);
  return response.data;
};
