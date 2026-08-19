const DB_VERSION = 2; // Upgrading to 2 to add new stores

let dbPromise = null;
let currentUserUuid = null;

export const chatStorage = {
  init(userUuid) {
    if (!userUuid) return Promise.reject(new Error('User UUID is required to init chat storage'));
    if (dbPromise && currentUserUuid === userUuid) return dbPromise;
    
    currentUserUuid = userUuid;
    const dbName = `saanvi-chat-db-${userUuid}`;

    if (typeof indexedDB === 'undefined') {
      dbPromise = Promise.reject(new Error('IndexedDB not supported in this environment'));
      return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        // Binary attachment blobs
        if (!db.objectStoreNames.contains('attachments')) {
          db.createObjectStore('attachments');
        }
        
        // Sidebar conversations metadata
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'uuid' });
        }
        
        // Full message history
        if (!db.objectStoreNames.contains('messages')) {
          const msgStore = db.createObjectStore('messages', { keyPath: 'uuid' });
          msgStore.createIndex('conversation_uuid', 'conversation_uuid', { unique: false });
          msgStore.createIndex('sent_at', 'sent_at', { unique: false });
        }

        // Offline outbox
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'uuid' });
          outboxStore.createIndex('conversation_uuid', 'conversation_uuid', { unique: false });
        }
        
        // Sync cursors
        if (!db.objectStoreNames.contains('sync_state')) {
          db.createObjectStore('sync_state');
        }
      };
    });

    return dbPromise;
  },

  async getDB() {
    if (!dbPromise) {
        throw new Error('chatStorage not initialized. Call init(userUuid) first.');
    }
    return dbPromise;
  },

  // ---- Attachments ----
  async saveAttachment(id, blob) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attachments', 'readwrite');
      tx.objectStore('attachments').put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAttachment(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attachments', 'readonly');
      const req = tx.objectStore('attachments').get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async attachmentExists(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attachments', 'readonly');
      const req = tx.objectStore('attachments').getKey(id);
      req.onsuccess = () => resolve(req.result !== undefined);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteAttachment(id) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attachments', 'readwrite');
      tx.objectStore('attachments').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // ---- Conversations ----
  async saveConversations(conversations) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');
      conversations.forEach(c => store.put(c));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getConversations() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readonly');
      const req = tx.objectStore('conversations').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  // ---- Messages ----
  async saveMessages(messages) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      messages.forEach(m => store.put(m));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async saveMessage(message) {
    return this.saveMessages([message]);
  },

  async getMessages(conversationUuid) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('messages', 'readonly');
      const index = tx.objectStore('messages').index('conversation_uuid');
      const req = index.getAll(IDBKeyRange.only(conversationUuid));
      req.onsuccess = () => {
        // Sort descending by sent_at
        const sorted = (req.result || []).sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
        resolve(sorted);
      };
      req.onerror = () => reject(req.error);
    });
  },

  // ---- Sync State ----
  async getSyncCursor(conversationUuid) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_state', 'readonly');
      const req = tx.objectStore('sync_state').get(conversationUuid);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async setSyncCursor(conversationUuid, timestamp) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_state', 'readwrite');
      tx.objectStore('sync_state').put(timestamp, conversationUuid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // ---- Outbox ----
  async saveOutboxMessage(message) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('outbox', 'readwrite');
      tx.objectStore('outbox').put(message);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getOutboxMessages() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('outbox', 'readonly');
      const req = tx.objectStore('outbox').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteOutboxMessage(uuid) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('outbox', 'readwrite');
      tx.objectStore('outbox').delete(uuid);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // ---- Utils ----
  async clearAll() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['attachments', 'conversations', 'messages', 'sync_state', 'outbox'], 'readwrite');
      tx.objectStore('attachments').clear();
      tx.objectStore('conversations').clear();
      tx.objectStore('messages').clear();
      tx.objectStore('sync_state').clear();
      tx.objectStore('outbox').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
};
