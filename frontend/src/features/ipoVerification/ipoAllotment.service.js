import axios from '../../services/axios.client';

class IpoAllotmentService {
  async getIpos(params = {}) {
    return await axios.get('/api/ipo-allotment/ipos', { params });
  }

  async getApplicants() {
    return await axios.get('/api/ipo-allotment/applicants');
  }

  async upsertApplicant(payload) {
    return await axios.post('/api/ipo-allotment/applicants', payload);
  }

  async checkAllotment(payload) {
    return await axios.post('/api/ipo-allotment/check', payload);
  }
}

export const ipoAllotmentService = new IpoAllotmentService();
