const ipoAggregatorService = require('./ipoAggregatorService');
const ipoVerificationService = require('./ipoVerificationService'); // We will modify this or instantiate it via DI
// In the current architecture, services are often instantiated via a Factory or directly if singleton.
// IpoVerificationService is typically instantiated with its repository.
const IpoVerificationRepository = require('./ipoVerificationRepository');
const db = require('../../database/queryHelper');
const { v5: uuidv5 } = require('uuid');

// Define a stable namespace for Aggregator deterministic mapping
const AGGREGATOR_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

class IpoAllotmentController {
  constructor() {
    this.verificationService = new ipoVerificationService(new IpoVerificationRepository(new db()));
  }

  getIpos = async (req, res) => {
    try {
      // 1. Fetch from the new multi-source Aggregator
      const result = await ipoAggregatorService.getAllIpos();
      
      if (result && result.status === 'error') {
         // Return controlled application-level error
         return res.status(400).json(result);
      }
      
      // 2. Fetch local Saanvi configurations
      const localIpos = await this.verificationService.repository.getIposWithCapabilities();
      const localIpoMap = localIpos.reduce((acc, ipo) => {
        acc[ipo.external_id || ipo.id] = ipo;
        return acc;
      }, {});
      
      // 3. Normalize and map
      const externalIpos = result.data || [];

      const mappedIpos = externalIpos.map(externalIpo => {
        // Deterministic local UUID mapping using Aggregator Namespace
        const safeId = externalIpo.id ? externalIpo.id.toString() : uuidv5(externalIpo.name || 'UNKNOWN', AGGREGATOR_NAMESPACE);
        const localUuid = uuidv5(safeId, AGGREGATOR_NAMESPACE);
        const localConfig = localIpoMap[externalIpo.id] || localIpos.find(l => l.id === localUuid);
        
        const isConfigured = !!(localConfig && localConfig.sources && localConfig.sources.length > 0);
        
        // User requested: enable the check allotment button for ALL CLOSED or LISTED IPOs
        const canCheckAllotment = externalIpo.status === 'CLOSED' || externalIpo.status === 'LISTED';
        
        return {
          ...externalIpo,
          localUuid,
          isConfigured,
          canCheckAllotment,
          normalizedStatus: (externalIpo.status || 'UNKNOWN').toUpperCase(),
          configuration: localConfig || null
        };
      });

      // Allow optional explicit filtering, but default to all
      let finalIpos = mappedIpos;
      if (req.query.status) {
         finalIpos = mappedIpos.filter(ipo => 
           (ipo.normalizedStatus || '').toLowerCase() === req.query.status.toLowerCase() ||
           (ipo.status || '').toLowerCase() === req.query.status.toLowerCase()
         );
      }
      
      return res.json({
        status: 'success',
        data: finalIpos,
        pagination: result.pagination
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  getApplicants = async (req, res) => {
    try {
      const applicants = await this.verificationService.getApplicants(req.user.uuid);
      return res.json(applicants);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  upsertApplicant = async (req, res) => {
    try {
      if (req.body.identifiers && req.body.identifiers.PAN) {
        req.body.identifiers.PAN = req.body.identifiers.PAN.trim().toUpperCase();
      }
      const result = await this.verificationService.upsertApplicant(req.user.uuid, req.body);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  checkAllotment = async (req, res) => {
    try {
      const { ipoId, selections, session } = req.body;
      const userId = req.user.uuid;

      // 1. Fetch IPO details from Aggregator to get registrar info
      const ipoDetails = await ipoAggregatorService.getIpoDetails(ipoId);
      if (ipoDetails && ipoDetails.status === 'error') {
         return res.status(400).json(ipoDetails);
      }
      if (!ipoDetails || ipoDetails.status !== 'success' || !ipoDetails.data) {
        throw new Error('Failed to fetch detailed IPO data from Aggregator.');
      }
      
      const ipoData = ipoDetails.data;
      const registrarName = ipoData.registrar?.name || ipoData.registrar?.source;
      if (!registrarName) {
        throw new Error('Aggregator did not provide registrar information for this IPO.');
      }

      // 2. Safe Deterministic Registrar Resolution
      // Strict alias mapping dictionary
      const REGISTRAR_ALIASES = {
        'BIGSHARE': 'BIGSHARE',
        'BIGSHARE SERVICES PVT LTD': 'BIGSHARE',
        'BIGSHARE SERVICES PVT. LTD.': 'BIGSHARE',
        'BIGSHARE SERVICES PRIVATE LIMITED': 'BIGSHARE',
        'K FINTECH': 'KFINTECH',
        'KFINTECH': 'KFINTECH',
        'KFIN TECHNOLOGIES LIMITED': 'KFINTECH',
        'LINK INTIME': 'LINKINTIME',
        'LINK INTIME INDIA PRIVATE LIMITED': 'LINKINTIME',
        'MUFG': 'LINKINTIME',
        'MUFG INTIME INDIA PRIVATE LIMITED': 'LINKINTIME',
        'SKYLINE FINANCIAL SERVICES PRIVATE LIMITED': 'SKYLINE'
      };

      let matchedRegistrarId = null;
      
      const queryHelper = new db();
      try {
        const registrars = await queryHelper.from('ipo_registrars').select('*').execute();
        
        // Exact case-insensitive match on name or code
        const searchName = registrarName.trim().toUpperCase();
        const mappedAlias = REGISTRAR_ALIASES[searchName] || searchName;
        
        for (const reg of registrars) {
          if (reg.name.toUpperCase() === searchName || reg.code.toUpperCase() === searchName) {
            matchedRegistrarId = reg.id;
            break;
          }
        }
        
        if (!matchedRegistrarId && mappedAlias) {
          for (const reg of registrars) {
            if (reg.code.toUpperCase() === mappedAlias) {
              matchedRegistrarId = reg.id;
              break;
            }
          }
          
          if (!matchedRegistrarId) {
            // JIT Insert for known aliased registrars
            const newRegistrarId = uuidv5(mappedAlias, AGGREGATOR_NAMESPACE);
            await queryHelper.from('ipo_registrars').insert({
              id: newRegistrarId,
              name: mappedAlias,
              code: mappedAlias,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }).execute();
            
            const newSourceId = uuidv5(mappedAlias + '_SOURCE', AGGREGATOR_NAMESPACE);
            await queryHelper.from('ipo_verification_sources').insert({
              id: newSourceId,
              registrar_id: newRegistrarId,
              name: mappedAlias,
              adapter_type: mappedAlias, // safely triggers unsupported adapter
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }).execute();
            
            const newCapId = uuidv5(mappedAlias + '_CAP', AGGREGATOR_NAMESPACE);
            await queryHelper.from('ipo_verification_capabilities').insert({
              id: newCapId,
              source_id: newSourceId,
              version: 1,
              is_active: true,
              supports_automated: true,
              supports_session: mappedAlias === 'BIGSHARE',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }).execute();
            
            const newMethodId = uuidv5(mappedAlias + '_METHOD_PAN', AGGREGATOR_NAMESPACE);
            await queryHelper.from('ipo_verification_methods').insert({
              id: newMethodId,
              capability_id: newCapId,
              name: 'PAN Match',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }).execute();
            
            await queryHelper.from('ipo_verification_method_fields').insert({
              id: uuidv5(mappedAlias + '_FIELD_PAN', AGGREGATOR_NAMESPACE),
              method_id: newMethodId,
              field_name: 'PAN',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }).execute();
            
            matchedRegistrarId = newRegistrarId;
          }
        }

        if (!matchedRegistrarId) {
          throw new Error(`Could not safely resolve aggregator registrar '${registrarName}' to any active local registrar.`);
        }

        // 3. Deterministic Local Mapping
        const localIpoUuid = uuidv5(ipoId, AGGREGATOR_NAMESPACE);
        
        // Ensure this IPO exists in our local DB as an anchor
        // Using UPSERT (insert on conflict do nothing/update)
        const existingIpo = await queryHelper.from('ipos').where('id', 'eq', localIpoUuid).limit(1).execute();
        if (existingIpo.length === 0) {
           await queryHelper.from('ipos').insert({
              id: localIpoUuid,
              registrar_id: matchedRegistrarId,
              name: ipoData.name,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
           }).execute();
        } else if (existingIpo[0].registrar_id !== matchedRegistrarId) {
           // Safe self-healing if registrar changed
           await queryHelper.from('ipos').where('id', 'eq', localIpoUuid).update({
              registrar_id: matchedRegistrarId,
              name: ipoData.name,
              updated_at: new Date().toISOString()
           }).execute();
        }

        // 4. Delegate to existing Phase 1 Verification Batch process
        const results = await this.verificationService.verifyBatch(userId, localIpoUuid, selections, session);
        return res.json(results);

      } catch (innerError) {
        throw innerError;
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
}

module.exports = new IpoAllotmentController();
