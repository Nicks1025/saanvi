const BaseService = require('../../base/baseService');

class WorkflowService extends BaseService {
  constructor(adminRepository) {
    super(adminRepository);
  }

  async getAllWorkflows() {
    return await this.repository.queryHelper
      .from('sph_workflows')
      .orderBy('created_at', false)
      .execute();
  }
  
  async getWorkflowDetails(id) {
    const wf = await this.repository.queryHelper
      .from('sph_workflows')
      .where('id', 'eq', id)
      .execute();
      
    if (!wf || wf.length === 0) return null;
    
    const actions = await this.repository.queryHelper
      .from('sph_workflow_actions')
      .where('workflow_id', 'eq', id)
      .orderBy('execution_order', true)
      .execute();
      
    // Parse configuration string back into object
    if (actions && actions.length > 0) {
      for (const action of actions) {
        if (typeof action.configuration === 'string') {
          try {
            action.configuration = JSON.parse(action.configuration);
          } catch (e) {
            action.configuration = {};
          }
        }
      }
    }
      
    return { ...wf[0], conditions: wf[0].conditions_json, actions };
  }

  async createWorkflow(data) {
    const existing = await this.repository.queryHelper
      .from('sph_workflows')
      .where('name', 'eq', data.name)
      .execute();
      
    if (existing && existing.length > 0) {
      const error = new Error('A workflow with this name already exists.');
      error.statusCode = 400;
      throw error;
    }

    const id = this.generateUuid();
    await this.repository.queryHelper.transaction(async (trx) => {
      await trx('sph_workflows').insert({
        id,
        trigger_event_key: data.trigger_event_key,
        name: data.name,
        description: data.description || '',
        active: data.active !== false,
        conditions_json: JSON.stringify(data.conditions_json || data.conditions || null)
      });
      
      if (data.actions && data.actions.length > 0) {
        for (let i=0; i<data.actions.length; i++) {
          const a = data.actions[i];
          await trx('sph_workflow_actions').insert({
            id: this.generateUuid(),
            workflow_id: id,
            action_type: a.action_type,
            configuration: JSON.stringify(a.configuration),
            execution_order: i
          });
        }
      }
    });
    
    return await this.getWorkflowDetails(id);
  }

  async updateWorkflow(id, data) {
    const existing = await this.repository.queryHelper
      .from('sph_workflows')
      .where('name', 'eq', data.name)
      .execute();
      
    if (existing && existing.length > 0 && existing[0].id !== id) {
      const error = new Error('A workflow with this name already exists.');
      error.statusCode = 400;
      throw error;
    }

    await this.repository.queryHelper.transaction(async (trx) => {
      // Update main workflow record
      await trx('sph_workflows').where({ id }).update({
        trigger_event_key: data.trigger_event_key,
        name: data.name,
        description: data.description || '',
        active: data.active !== false,
        conditions_json: JSON.stringify(data.conditions_json || data.conditions || null)
      });
      
      // Delete existing actions
      await trx('sph_workflow_actions').where({ workflow_id: id }).del();
      
      // Insert new actions
      if (data.actions && data.actions.length > 0) {
        for (let i=0; i<data.actions.length; i++) {
          const a = data.actions[i];
          await trx('sph_workflow_actions').insert({
            id: this.generateUuid(),
            workflow_id: id,
            action_type: a.action_type,
            configuration: JSON.stringify(a.configuration),
            execution_order: i
          });
        }
      }
    });
    
    return await this.getWorkflowDetails(id);
  }

  async deleteWorkflow(id) {
    await this.repository.queryHelper.transaction(async (trx) => {
      await trx('sph_workflow_actions').where({ workflow_id: id }).del();
      await trx('sph_workflows').where({ id }).del();
    });
  }

  async getSystemEvents() {
    const events = await this.repository.queryHelper
      .from('sph_system_events')
      .orderBy('name', true)
      .execute();

    const userCreatedEvent = events.find(e => e.event_key === 'USER_CREATED');
    if (userCreatedEvent) {
      try {
        const dynamicFields = await this.repository.queryHelper
          .from('sph_user_fields')
          .where('is_active', 'eq', true)
          .execute();
          
        let schema = userCreatedEvent.payload_schema;
        if (typeof schema === 'string') {
          schema = JSON.parse(schema);
        }
        
        // Ensure it's an object with properties
        if (schema && schema.type === 'object' && schema.properties) {
          for (const df of dynamicFields) {
            schema.properties[df.field_name] = { type: 'string' }; // all dynamic fields map to string for logic
          }
        }
        userCreatedEvent.payload_schema = schema;
      } catch (err) {
        console.error('Failed to inject dynamic user fields into USER_CREATED schema:', err);
      }
    }

    return events;
  }

  async createSystemEvent(data) {
    if (!data.event_key || !data.name) {
      throw new Error('event_key and name are required.');
    }

    const existing = await this.repository.queryHelper
      .from('sph_system_events')
      .where('event_key', 'eq', data.event_key)
      .execute();
      
    if (existing && existing.length > 0) {
      const error = new Error('A system event with this event key already exists.');
      error.statusCode = 400;
      throw error;
    }

    const payloadSchema = typeof data.payload_schema === 'string' ? data.payload_schema : JSON.stringify(data.payload_schema || {});

    const id = this.generateUuid();
    await this.repository.queryHelper
      .from('sph_system_events')
      .insert({
        id,
        event_key: data.event_key,
        name: data.name,
        description: data.description || '',
        payload_schema: payloadSchema,
        active: data.active !== false
      })
      .execute();

    return { id, event_key: data.event_key };
  }

  async updateSystemEvent(event_key, data) {
    if (!data.name) {
      throw new Error('name is required.');
    }

    const payloadSchema = typeof data.payload_schema === 'string' ? data.payload_schema : JSON.stringify(data.payload_schema || {});

    await this.repository.queryHelper
      .from('sph_system_events')
      .where('event_key', 'eq', event_key)
      .update({
        name: data.name,
        description: data.description || '',
        payload_schema: payloadSchema,
        active: data.active !== false,
        updated_at: new Date().toISOString()
      })
      .execute();

    return { event_key };
  }

  async deleteSystemEvent(event_key) {
    // Check if workflows are using this event
    const workflows = await this.repository.queryHelper
      .from('sph_workflows')
      .where('trigger_event_key', 'eq', event_key)
      .execute();
      
    if (workflows && workflows.length > 0) {
      const error = new Error('Cannot delete system event because it is being used by one or more workflows.');
      error.statusCode = 400;
      throw error;
    }

    await this.repository.queryHelper
      .from('sph_system_events')
      .where('event_key', 'eq', event_key)
      .delete()
      .execute();
  }
}

module.exports = WorkflowService;
