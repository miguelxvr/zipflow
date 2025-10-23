import { PassThrough } from 'node:stream';
import { DEFAULT_SIGNED_URL_EXPIRATION, ERROR_MESSAGES } from '../config/constants.js';
import type { StorageProvider } from '../core/interfaces/storage-provider.js';
import { createArchiveStream } from '../streams/archive-transform.js';
import type { ArchiverConfig, UploadResult } from '../types/index.js';
import { ArchiveError } from '../types/index.js';

/**
 * Generic Archiver Service
 * Works with any storage provider (S3, filesystem, etc.)
 */
export class Archiver {
  constructor(private provider: StorageProvider) {}

  /**
   * Create archive from storage objects and upload to target container
   */
  async archiveFiles(config: ArchiverConfig): Promise<UploadResult & { signedUrl: string }> {
    const {
      sourceContainer,
      sourcePrefix,
      targetContainer,
      targetKey,
      compressionLevel = 9,
    } = config;

    console.log(`[Archiver] Using storage provider: ${this.provider.name}`);

    // List source files
    const objects = await this.provider.listObjects(sourceContainer, {
      prefix: sourcePrefix,
    });

    if (objects.length === 0) {
      throw new ArchiveError(
        `${ERROR_MESSAGES.NO_FILES_FOUND} in ${sourceContainer}/${sourcePrefix}`,
      );
    }

    // Filter out directories (keys ending with /)
    const files = objects.filter((obj) => obj.key && !obj.key.endsWith('/'));

    if (files.length === 0) {
      throw new ArchiveError(
        `${ERROR_MESSAGES.NO_FILES_FOUND} (only directories) in ${sourceContainer}/${sourcePrefix}`,
      );
    }

    console.log(`[Archiver] Archiving ${files.length} files to ${targetKey}`);

    // Create archive stream
    const archive = createArchiveStream(compressionLevel);

    // Create passthrough stream to pipe archive to storage
    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    // Ensure target container exists
    await this.provider.createContainer(targetContainer);

    // Start upload
    const uploadPromise = this.provider.uploadObject(targetContainer, targetKey, passThrough, {
      contentType: 'application/zip',
    });

    // Add files to archive
    for (const file of files) {
      if (!file.key) continue;

      try {
        const stream = await this.provider.getObjectStream(sourceContainer, file.key);
        archive.append(stream, { name: file.key });
        console.log(`[Archiver] Added ${file.key} to archive`);
      } catch (error) {
        console.error(`[Archiver] Failed to add ${file.key}:`, error);
        // Continue with other files
      }
    }

    // Finalize archive
    await archive.finalize();

    // Wait for upload to complete
    const result = await uploadPromise;

    // Generate signed URL
    const signedUrl = await this.provider.getObjectUrl(targetContainer, targetKey, {
      expiresIn: DEFAULT_SIGNED_URL_EXPIRATION,
    });

    console.log(`[Archiver] Archive completed: ${result.location}`);
    console.log(`[Archiver] Access URL: ${signedUrl}`);

    return {
      ...result,
      signedUrl,
    };
  }

  /**
   * List objects in a container
   */
  async listObjects(container: string, prefix: string) {
    return this.provider.listObjects(container, { prefix });
  }
}

/**
 * Factory function for creating Archiver instances
 */
export function createArchiver(provider: StorageProvider): Archiver {
  return new Archiver(provider);
}
