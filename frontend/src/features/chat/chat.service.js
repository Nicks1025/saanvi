import axios from '../../services/axios.client';

class ChatService {
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

  async getDownloadUrl(messageUuid, attachmentUuid) {
    return await axios.get(`/api/chat/messages/${messageUuid}/attachments/${attachmentUuid}/url`);
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
