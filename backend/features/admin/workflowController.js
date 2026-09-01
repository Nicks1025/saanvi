const WorkflowService = require('./workflowService');
const AdminRepository = require('./adminRepository');
const QueryHelper = require('../../database/queryHelper');

class WorkflowController {
  constructor() {
    const qh = new QueryHelper();
    const adminRepo = new AdminRepository(qh);
    this.service = new WorkflowService(adminRepo);
  }

  async getWorkflows(req, res) {
    try {
      const data = await this.service.getAllWorkflows();
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getWorkflowDetails(req, res) {
    try {
      const { id } = req.params;
      const data = await this.service.getWorkflowDetails(id);
      if (!data) return res.status(404).json({ success: false, error: 'Workflow not found' });
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createWorkflow(req, res) {
    try {
      const data = await this.service.createWorkflow(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateWorkflow(req, res) {
    try {
      const { id } = req.params;
      const data = await this.service.updateWorkflow(id, req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteWorkflow(req, res) {
    try {
      const { id } = req.params;
      await this.service.deleteWorkflow(id);
      res.status(200).json({ success: true, message: 'Workflow deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getSystemEvents(req, res) {
    try {
      const data = await this.service.getSystemEvents();
      res.status(200).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createSystemEvent(req, res) {
    try {
      const data = await this.service.createSystemEvent(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      const status = err.statusCode || 500;
      res.status(status).json({ success: false, error: err.message });
    }
  }

  async updateSystemEvent(req, res) {
    try {
      const { event_key } = req.params;
      const data = await this.service.updateSystemEvent(event_key, req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      const status = err.statusCode || 500;
      res.status(status).json({ success: false, error: err.message });
    }
  }

  async deleteSystemEvent(req, res) {
    try {
      const { event_key } = req.params;
      await this.service.deleteSystemEvent(event_key);
      res.status(200).json({ success: true, message: 'System event deleted successfully' });
    } catch (err) {
      const status = err.statusCode || 500;
      res.status(status).json({ success: false, error: err.message });
    }
  }
}

module.exports = WorkflowController;
