const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class R2StorageService {
  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    this.bucketName = process.env.R2_BUCKET_NAME;

    const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true // Cloudflare R2 requires path-style endpoint for the default r2.cloudflarestorage.com domain
    });
  }

  /**
   * Generates a presigned URL for direct frontend upload.
   * @param {string} objectKey The destination path in R2.
   * @param {string} mimeType The exact content type of the file.
   * @param {number} expiresIn Seconds until the URL expires.
   * @returns {Promise<string>} The presigned URL.
   */
  async getSignedUploadUrl(objectKey, mimeType, expiresIn = 3600) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: mimeType,
    });
    
    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Generates a short-lived download URL for secure access.
   * @param {string} objectKey The path in R2.
   * @param {number} expiresIn Seconds until the URL expires.
   * @returns {Promise<string>} The presigned download URL.
   */
  async getSignedDownloadUrl(objectKey, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Verifies an object exists in R2 and returns its metadata.
   * Useful for verifying frontend upload completion.
   * @param {string} objectKey The path in R2.
   */
  async headObject(objectKey) {
    const command = new HeadObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
    });
    return await this.s3Client.send(command);
  }

  /**
   * Deletes an object from R2.
   * @param {string} objectKey The path in R2.
   */
  async deleteObject(objectKey) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
    });
    return await this.s3Client.send(command);
  }
}

// Export as a singleton
module.exports = new R2StorageService();
