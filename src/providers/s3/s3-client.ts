import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { LOG_PREFIX } from '../../config/constants.js';
import type { EnvironmentConfig } from '../../types/index.js';

/**
 * Create and configure S3 client
 */
export function createS3Client(config: EnvironmentConfig['aws']): S3Client {
  const clientConfig: S3ClientConfig = {
    region: config.region,
    forcePathStyle: config.forcePathStyle,
  };

  // Add custom endpoint for MinIO or LocalStack
  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
    console.log(`${LOG_PREFIX.S3_CLIENT} Using custom endpoint: ${config.endpoint}`);
  }

  // Add explicit credentials if provided (useful for MinIO)
  if (config.accessKeyId && config.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    };
  }

  return new S3Client(clientConfig);
}

/**
 * Singleton S3 client instance
 */
let s3ClientInstance: S3Client | null = null;

/**
 * Get or create S3 client singleton
 */
export function getS3Client(config: EnvironmentConfig['aws']): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = createS3Client(config);
  }
  return s3ClientInstance;
}

/**
 * Reset S3 client (useful for testing)
 */
export function resetS3Client(): void {
  if (s3ClientInstance) {
    s3ClientInstance.destroy();
    s3ClientInstance = null;
  }
}
