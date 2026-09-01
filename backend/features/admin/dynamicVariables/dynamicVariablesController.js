class DynamicVariablesController {
  constructor(service) {
    this.service = service;
  }

  async getAll(req, res) {
    try {
      const data = await this.service.getAll();
      res.status(200).json(data);
    } catch (err) {
      console.error('Error fetching dynamic variables:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async create(req, res) {
    try {
      const userUuid = req.user?.uuid; // Assuming authentication middleware sets req.user
      const data = await this.service.create(req.body, userUuid);
      res.status(201).json(data);
    } catch (err) {
      console.error('Error creating dynamic variable:', err);
      res.status(400).json({ message: err.message });
    }
  }

  async update(req, res) {
    try {
      const { uuid } = req.params;
      const userUuid = req.user?.uuid;
      const data = await this.service.update(uuid, req.body, userUuid);
      res.status(200).json(data);
    } catch (err) {
      console.error('Error updating dynamic variable:', err);
      res.status(400).json({ message: err.message });
    }
  }

  async delete(req, res) {
    try {
      const { uuid } = req.params;
      await this.service.delete(uuid);
      res.status(200).json({ message: 'Dynamic variable deleted successfully' });
    } catch (err) {
      console.error('Error deleting dynamic variable:', err);
      res.status(400).json({ message: err.message });
    }
  }
}

module.exports = DynamicVariablesController;
