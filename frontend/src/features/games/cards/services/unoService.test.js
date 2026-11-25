import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import axios from '../../../../services/axios.client.js';
import { createUnoRoom, joinUnoRoom } from './unoService.js';

describe('unoService', () => {
  it('createUnoRoom should send a POST request and return data', async () => {
    const mockRoomData = { name: 'Test Room', playerLimit: 4, rules: {} };
    const mockResponse = { data: { roomCode: 'X1Y2Z' } };

    const mockUserData = { name: 'Player 1', avatar: null };
    const originalPost = axios.post;
    axios.post = mock.fn(async () => mockResponse);

    try {
      const result = await createUnoRoom(mockRoomData, mockUserData);
      assert.equal(axios.post.mock.calls.length, 1);
      assert.equal(axios.post.mock.calls[0].arguments[0], '/api/uno/create');
      assert.deepEqual(axios.post.mock.calls[0].arguments[1], { ...mockRoomData, userData: mockUserData });
      assert.deepEqual(result, { roomCode: 'X1Y2Z' });
    } finally {
      axios.post = originalPost;
    }
  });

  it('joinUnoRoom should send a POST request and return data', async () => {
    const mockRoomCode = 'X1Y2Z';
    const mockUserData = { name: 'Player 1', avatar: null };
    const mockResponse = { data: { code: 'X1Y2Z', name: 'Test Room', players: [] } };

    const originalPost = axios.post;
    axios.post = mock.fn(async () => mockResponse);

    try {
      const result = await joinUnoRoom(mockRoomCode, mockUserData);
      assert.equal(axios.post.mock.calls.length, 1);
      assert.equal(axios.post.mock.calls[0].arguments[0], '/api/uno/join');
      assert.deepEqual(axios.post.mock.calls[0].arguments[1], { roomCode: mockRoomCode, userData: mockUserData });
      assert.deepEqual(result, mockResponse.data);
    } finally {
      axios.post = originalPost;
    }
  });
});
