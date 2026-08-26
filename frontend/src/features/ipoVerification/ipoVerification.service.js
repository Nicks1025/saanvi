import axios from '../../services/axios.client';

class IpoVerificationService {
  async getIposWithCapabilities() {
    return await axios.get('/api/ipo-verification/capabilities');
  }

  async verifyApplicant(payload) {
    return await axios.post('/api/ipo-verification/verify', payload);
  }

  async getApplicants() {
    return await axios.get('/api/ipo-verification/applicants');
  }

  async upsertApplicant(payload) {
    return await axios.post('/api/ipo-verification/applicants', payload);
  }

  async verifyBatch(payload) {
    return await axios.post('/api/ipo-verification/verify/batch', payload);
  }
}

export const ipoVerificationService = new IpoVerificationService();
