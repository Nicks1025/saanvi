import axios from '@/services/axios.client';

class HealthService {
  async getSystemHealth() {
    try {
      const response = await axios.get('/api/system/health');
      return response;
    } catch (error) {
      throw error;
    }
  }
}

export default new HealthService();
