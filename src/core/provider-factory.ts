import { FilesystemStorageProvider } from '../providers/filesystem/filesystem-storage-provider.js';
import { createS3Client } from '../providers/s3/s3-client.js';
import { S3StorageProvider } from '../providers/s3/s3-storage-provider.js';
import type { EnvironmentConfig } from '../types/index.js';
import type { StorageProvider } from './interfaces/storage-provider.js';

/**
 * Create a storage provider based on configuration
 */
export function createStorageProvider(config: EnvironmentConfig): StorageProvider {
  switch (config.provider.type) {
    case 's3': {
      console.log('[ProviderFactory] Creating S3 storage provider');
      const s3Client = createS3Client(config.aws);
      return new S3StorageProvider(s3Client);
    }

    case 'filesystem': {
      console.log(
        `[ProviderFactory] Creating Filesystem storage provider (base: ${config.filesystem.baseDir})`,
      );
      return new FilesystemStorageProvider(config.filesystem.baseDir);
    }

    default: {
      throw new Error(`Unsupported storage provider: ${config.provider.type}`);
    }
  }
}
