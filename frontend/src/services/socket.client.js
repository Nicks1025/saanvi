import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket) {
      return; // Already connecting or connected
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token: `Bearer ${token}`
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection Error:', err.message);
    });

    // Reattach all global listeners
    for (const [event, callbacks] of this.listeners.entries()) {
      callbacks.forEach(cb => {
        this.socket.on(event, cb);
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, payload, callback) {
    if (!this.socket) {
      console.warn(`[Socket] Cannot emit ${event} because socket is not initialized`);
      if (callback) callback({ error: 'SOCKET_NOT_INITIALIZED' });
      return;
    }
    this.socket.emit(event, payload, callback);
  }
}

const socketService = new SocketService();
export default socketService;
