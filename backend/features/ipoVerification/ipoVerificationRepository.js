const BaseRepository = require('../../base/baseRepository');

class IpoVerificationRepository extends BaseRepository {
  async getActiveSources() {
    return await this.queryHelper
      .from('ipo_verification_sources')
      .where('is_active', 'eq', true)
      .execute();
  }

  async getSourceById(sourceId) {
    const result = await this.queryHelper
      .from('ipo_verification_sources')
      .where('id', 'eq', sourceId)
      .limit(1)
      .execute();
    return result[0] || null;
  }

  async getIposWithCapabilities() {
    const ipos = await this.queryHelper
      .from('ipos', 'i')
      .leftJoin('ipo_registrars', 'r', 'r.id = i.registrar_id')
      .select('i.id, i.name, i.registrar_id, r.name as registrar_name, r.code as registrar_code')
      .execute();

    for (const ipo of ipos) {
      if (ipo.registrar_id) {
        // Fetch active sources for this registrar
        const sources = await this.queryHelper
          .from('ipo_verification_sources')
          .where('registrar_id', 'eq', ipo.registrar_id)
          .where('is_active', 'eq', true)
          .execute();
        
        ipo.sources = [];
        for (const source of sources) {
          const cap = await this.getActiveCapability(source.id);
          if (cap) {
            source.capability = cap;
            ipo.sources.push(source);
          }
        }
      } else {
        ipo.sources = [];
      }
    }
    return ipos;
  }


  async getApplicantById(applicantId) {
    const result = await this.queryHelper
      .from('ipo_applicants')
      .where('id', 'eq', applicantId)
      .limit(1)
      .execute();
    return result[0] || null;
  }

  async getApplicantsByUser(userUuid) {
    return await this.queryHelper
      .from('ipo_applicants')
      .where('user_uuid', 'eq', userUuid)
      .orderBy('created_at', true) // ascending
      .execute();
  }

  async upsertApplicant(applicantData) {
    if (applicantData.id) {
      const result = await this.queryHelper
        .from('ipo_applicants')
        .where('id', 'eq', applicantData.id)
        .where('user_uuid', 'eq', applicantData.user_uuid) // Enforce ownership
        .update({
          name: applicantData.name,
          identifiers: applicantData.identifiers,
          updated_at: new Date().toISOString()
        })
        .execute();
      return result[0] || null;
    } else {
      const result = await this.queryHelper
        .from('ipo_applicants')
        .insert({
          user_uuid: applicantData.user_uuid,
          name: applicantData.name,
          identifiers: applicantData.identifiers,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .execute();
      return result[0];
    }
  }

  async deleteApplicant(applicantId, userUuid) {
    const result = await this.queryHelper
      .from('ipo_applicants')
      .where('id', 'eq', applicantId)
      .where('user_uuid', 'eq', userUuid) // Enforce ownership
      .delete()
      .execute();
    return result[0] || null;
  }

  async getIpoWithRegistrar(ipoId) {
    const result = await this.queryHelper
      .from('ipos', 'i')
      .select('i.id as ipo_id, i.registrar_id')
      .where('i.id', 'eq', ipoId)
      .limit(1)
      .execute();
    return result[0] || null;
  }

  async getActiveCapability(sourceId) {
    const caps = await this.queryHelper
      .from('ipo_verification_capabilities')
      .where('source_id', 'eq', sourceId)
      .where('is_active', 'eq', true)
      .limit(1)
      .execute();
      
    if (!caps.length) return null;
    const capability = caps[0];
    
    // Fetch methods
    const methods = await this.queryHelper
      .from('ipo_verification_methods')
      .where('capability_id', 'eq', capability.id)
      .execute();
      
    for (const method of methods) {
      method.fields = await this.queryHelper
        .from('ipo_verification_method_fields')
        .where('method_id', 'eq', method.id)
        .execute();
    }
    
    capability.methods = methods;
    return capability;
  }

  async updateDiscoveryStatus(sourceId, status, errorText = null) {
    const updateData = {
      discovery_status: status,
      discovery_error: errorText,
      last_discovery_attempt_at: new Date()
    };
    if (status === 'SUCCESS') {
      updateData.last_successful_discovery_at = new Date();
    }
    return await this.queryHelper
      .from('ipo_verification_sources')
      .where('id', 'eq', sourceId)
      .update(updateData)
      .execute();
  }

  async updateCapabilities(sourceId, capabilities) {
    return await this.queryHelper.transaction(async (trx) => {
      const db = trx || this.queryHelper.db;
      
      // Calculate max version race-safely within the transaction
      const maxVersionRes = await db('ipo_verification_capabilities')
        .where({ source_id: sourceId })
        .max('version as max_version');
      
      const newVersion = maxVersionRes[0] && maxVersionRes[0].max_version ? parseInt(maxVersionRes[0].max_version) + 1 : 1;

      // Deactivate older capabilities for this source BEFORE inserting
      // to avoid conflict with unique partial index on is_active = true
      await db('ipo_verification_capabilities')
        .where({ source_id: sourceId, is_active: true })
        .update({ is_active: false });

      // Insert new capability
      const [newCapability] = await db('ipo_verification_capabilities')
        .insert({
          source_id: sourceId,
          version: newVersion,
          captcha_required: capabilities.captcha_required,
          captcha_type: capabilities.captcha_type,
          captcha_scope: capabilities.captcha_scope,
          supports_automated: capabilities.supports_automated,
          supports_batch: capabilities.supports_batch,
          supports_session: capabilities.supports_session,
          rate_limit_per_min: capabilities.rate_limit_per_min,
          concurrency_limit: capabilities.concurrency_limit,
          last_discovered_at: new Date().toISOString(),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .returning('*');

      newCapability.methods = [];

      // Insert methods and fields
      if (capabilities.methods && capabilities.methods.length > 0) {
        for (const method of capabilities.methods) {
          const [newMethod] = await db('ipo_verification_methods')
            .insert({
              capability_id: newCapability.id,
              name: method.name,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .returning('*');
          
          newMethod.fields = [];

          if (method.fields && method.fields.length > 0) {
            const fieldsToInsert = method.fields.map(field => ({
              method_id: newMethod.id,
              field_name: field.name || field.field_name,
              is_optional: field.is_optional || false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));
            const insertedFields = await db('ipo_verification_method_fields')
              .insert(fieldsToInsert)
              .returning('*');
            
            newMethod.fields = insertedFields;
          }
          newCapability.methods.push(newMethod);
        }
      }

      return newCapability;
    });
  }

  async cacheResult(data) {
    return await this.queryHelper
      .from('ipo_verification_results')
      .insert({
        ipo_id: data.ipoId,
        source_id: data.sourceId,
        method_id: data.methodId,
        capability_version: data.capabilityVersion,
        identifier_fingerprint: data.identifierFingerprint,
        status: data.status,
        applied_quantity: data.appliedQuantity,
        allotted_quantity: data.allottedQuantity,
        error_category: data.errorCategory
      })
      .execute();
  }

  async getCachedResult(ipoId, sourceId, methodId, capabilityVersion, identifierFingerprint) {
    const result = await this.queryHelper
      .from('ipo_verification_results')
      .where('ipo_id', 'eq', ipoId)
      .where('source_id', 'eq', sourceId)
      .where('method_id', 'eq', methodId)
      .where('capability_version', 'eq', capabilityVersion)
      .where('identifier_fingerprint', 'eq', identifierFingerprint)
      .orderBy('created_at', false) // Descending
      .limit(1)
      .execute();
    return result[0] || null;
  }
}

module.exports = IpoVerificationRepository;
