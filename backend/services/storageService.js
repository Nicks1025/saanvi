const { supabaseAdmin } = require('./supabaseAdmin');
const path = require('path');

class StorageService {
  constructor(bucketName = 'saanvi') {
    this.bucketName = bucketName;
  }

  /**
   * Uploads a file buffer to Supabase Storage.
   * @param {Buffer} fileBuffer - The file binary data
   * @param {string} destinationPath - The exact path inside the bucket (e.g. profile-images/uuid/file.png)
   * @param {string} mimeType - The MIME type of the file
   * @returns {string} The public URL of the uploaded file
   */
  async uploadFile(fileBuffer, destinationPath, mimeType) {
    const { data, error } = await supabaseAdmin.storage
      .from(this.bucketName)
      .upload(destinationPath, fileBuffer, {
        contentType: mimeType,
        upsert: true // Overwrite if it exists
      });

    if (error) {
      throw new Error(`Failed to upload file to storage: ${error.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(this.bucketName)
      .getPublicUrl(destinationPath);

    return publicUrlData.publicUrl;
  }

  /**
   * Deletes a file from Supabase Storage given its path or full public URL.
   * @param {string} fileUrlOrPath 
   */
  async deleteFile(fileUrlOrPath) {
    if (!fileUrlOrPath) return;

    let targetPath = fileUrlOrPath;
    
    // If it's a full public URL, extract the path part
    const publicUrlPrefix = `${process.env.SUPABASE_URL}/storage/v1/object/public/${this.bucketName}/`;
    if (fileUrlOrPath.startsWith(publicUrlPrefix)) {
      targetPath = fileUrlOrPath.replace(publicUrlPrefix, '');
    }

    const { error } = await supabaseAdmin.storage
      .from(this.bucketName)
      .remove([targetPath]);

    if (error) {
      console.error(`Warning: Failed to delete old storage file ${targetPath}:`, error.message);
      // We don't throw here to avoid failing a profile update just because cleanup failed.
    }
  }
}

module.exports = new StorageService();
