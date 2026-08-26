const KFintechAdapter = require('./KFintechAdapter');
const LinkIntimeAdapter = require('./LinkIntimeAdapter');

class RegistrarAdapterFactory {
  /**
   * Get the appropriate adapter for a given source configuration.
   *
   * @param {Object} sourceConfig - The source object from the database containing adapter_type
   * @returns {BaseRegistrarAdapter}
   */
  static getAdapter(sourceConfig) {
    // Normalization because DB strings might be raw
    const adapterType = (sourceConfig.adapter_type || '').toUpperCase().trim();
    
    // Explicit mappings for common raw strings found in the DB
    if (adapterType.includes('MUFG') || adapterType.includes('LINK INTIME')) {
       return new LinkIntimeAdapter(sourceConfig);
    }
    if (adapterType.includes('KFIN')) {
       return new KFintechAdapter(sourceConfig);
    }

    switch (adapterType) {
      case 'KFINTECH':
        return new KFintechAdapter(sourceConfig);
      case 'LINKINTIME':
        return new LinkIntimeAdapter(sourceConfig);
      default:
        throw new Error(`Real-time verification is not currently supported for registrar: ${sourceConfig.adapter_type || 'Unknown'}`);
    }
  }
}

module.exports = RegistrarAdapterFactory;
