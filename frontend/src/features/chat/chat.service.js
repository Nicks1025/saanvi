import axios from '../../services/axios.client';

class ChatService {
  constructor() {
    this.urlCache = new Map();
    this.pendingUrlRequests = new Map();
  }

  async getRequests() {
    return await axios.get('/api/chat/requests');
  }

  async searchUsers(query = '', limit = 50) {
    return await axios.get(`/api/chat/users?limit=${limit}&search=${query}`);
  }

  async sendRequest(receiverUuid) {
    return await axios.post('/api/chat/requests', { receiver_uuid: receiverUuid });
  }

  async respondRequest(uuid, status) {
    return await axios.put(`/api/chat/requests/${uuid}/respond`, { status });
  }

  async getConversations() {
    return await axios.get('/api/chat/conversations');
  }

  async getMessages(conversationUuid) {
    return await axios.get(`/api/chat/conversations/${conversationUuid}/messages`);
  }

  // ---- Attachments ----
  async generateUploadUrl(conversationUuid, fileName, mimeType, fileSize, category = 'files') {
    return await axios.post(`/api/chat/conversations/${conversationUuid}/attachments/upload-url`, {
      file_name: fileName,
      mime_type: mimeType,
      file_size: fileSize,
      category
    });
  }

  async completeUpload(conversationUuid, message, metadata) {
    return await axios.post(`/api/chat/conversations/${conversationUuid}/attachments/complete`, {
      message,
      metadata
    });
  }

  async completeMultiUpload(conversationUuid, message, metadataArray) {
    return await axios.post(`/api/chat/conversations/${conversationUuid}/attachments/complete-multi`, {
      message,
      attachments: metadataArray
    });
  }


  async getDownloadUrl(messageUuid, attachmentUuid) {
    const cacheKey = `${messageUuid}_${attachmentUuid}`;

    // 1. Check in-memory cache
    if (this.urlCache.has(cacheKey)) {
      const cached = this.urlCache.get(cacheKey);
      if (Date.now() < cached.expiresAt) return cached.res;
      this.urlCache.delete(cacheKey);
    }

    // 2. Check sessionStorage (survives page refreshes)
    try {
      const sessionCachedStr = sessionStorage.getItem(`chat_url_${cacheKey}`);
      if (sessionCachedStr) {
        const sessionCached = JSON.parse(sessionCachedStr);
        if (Date.now() < sessionCached.expiresAt) {
          this.urlCache.set(cacheKey, sessionCached);
          return sessionCached.res;
        }
        sessionStorage.removeItem(`chat_url_${cacheKey}`);
      }
    } catch (e) {
      // Ignore parse errors
    }

    // 3. Avoid duplicate concurrent requests
    if (this.pendingUrlRequests.has(cacheKey)) {
      return this.pendingUrlRequests.get(cacheKey);
    }

    // 4. Fetch and cache
    const requestPromise = axios.get(`/api/chat/messages/${messageUuid}/attachments/${attachmentUuid}/url`)
      .then(res => {
        // Cache for 45 minutes (presigned URLs usually valid for 1 hour)
        const cacheData = { res, expiresAt: Date.now() + 45 * 60 * 1000 };
        
        this.urlCache.set(cacheKey, cacheData);
        try {
          sessionStorage.setItem(`chat_url_${cacheKey}`, JSON.stringify(cacheData));
        } catch (e) {
          // Ignore storage quota errors
        }
        
        this.pendingUrlRequests.delete(cacheKey);
        return res;
      })
      .catch(err => {
        this.pendingUrlRequests.delete(cacheKey);
        throw err;
      });

    this.pendingUrlRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  // ---- Wallpapers ----
  async generateWallpaperUploadUrl(conversationUuid, fileName, mimeType, fileSize) {
    return await axios.post(`/api/chat/conversations/${conversationUuid}/wallpaper/upload-url`, {
      file_name: fileName,
      mime_type: mimeType,
      file_size: fileSize
    });
  }

  async completeWallpaperUpload(conversationUuid, storageKey) {
    return await axios.post(`/api/chat/conversations/${conversationUuid}/wallpaper/complete`, {
      storage_key: storageKey
    });
  }

  async updateBackground(conversationUuid, backgroundData) {
    return await axios.put(`/api/chat/conversations/${conversationUuid}/background`, {
      background_data: backgroundData
    });
  }
}

export const chatService = new ChatService();
