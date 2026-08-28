import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUnoRoom, joinUnoRoom } from './unoService';
import axios from '../../../../services/axios.client';

vi.mock('../../../../services/axios.client', () => {
  return {
    default: {
      post: vi.fn(),
    }
  };
});

describe('unoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createUnoRoom should send a POST request and return data', async () => {
    const mockRoomData = { name: 'Test Room', playerLimit: 4, rules: {} };
    const mockResponse = { data: { roomCode: 'X1Y2Z' } };
    axios.post.mockResolvedValueOnce(mockResponse);

    const result = await createUnoRoom(mockRoomData);

    expect(axios.post).toHaveBeenCalledWith('/api/uno/create', mockRoomData);
    expect(result).toEqual({ roomCode: 'X1Y2Z' });
  });

  it('joinUnoRoom should send a POST request and return data', async () => {
    const mockRoomCode = 'X1Y2Z';
    const mockResponse = { data: { code: 'X1Y2Z', name: 'Test Room', players: [] } };
    axios.post.mockResolvedValueOnce(mockResponse);

    const result = await joinUnoRoom(mockRoomCode);

    expect(axios.post).toHaveBeenCalledWith('/api/uno/join', { roomCode: mockRoomCode });
    expect(result).toEqual(mockResponse.data);
  });
});
