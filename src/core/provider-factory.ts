import { FilesystemStorageProvider } from '../providers/filesystem/filesystem-storage-provider.js';
import { createS3Client } from '../providers/s3/s3-client.js';
import { S3StorageProvider } from '../providers/s3/s3-storage-provider.js';
import type { EnvironmentConfig } from '../types/index.js';
import type { StorageProvider } from './interfaces/storage-provider.js';

/**
 * Create a storage provider based on URI scheme
 * 
 * Currently supported:
 * - s3:// - AWS S3 and S3-compatible storage
 * - file:// - Local filesystem
 * 
 * Planned for future:
 * - azure:// - Microsoft Blob Storage
 * - gs:// - Google Cloud Storage
 */
export function createStorageProvider(config: EnvironmentConfig): StorageProvider {
  const scheme = config.source.scheme;

  switch (scheme) {
    case 's3': {
      console.log('[ProviderFactory] Creating S3 storage provider');
      const s3Client = createS3Client(config.aws);
      return new S3StorageProvider(s3Client);
    }

    case 'file': {
      console.log('[ProviderFactory] Creating Filesystem storage provider');
      return new FilesystemStorageProvider();
    }

    // Future providers:
    // case 'azure': {
    //   console.log('[ProviderFactory] Creating Azure Blob storage provider');
    //   return new AzureBlobStorageProvider(config.azure);
    // }
    //
    // case 'gs': {
    //   console.log('[ProviderFactory] Creating Google Cloud Storage provider');
    //   return new GcsStorageProvider(config.gcs);
    // }

    default: {
      throw new Error(`Unsupported storage scheme: ${scheme}`);
    }
  }
}
