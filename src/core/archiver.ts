import { PassThrough } from 'node:stream';
import { DEFAULT_SIGNED_URL_EXPIRATION, ERROR_MESSAGES } from '../config/constants.js';
import type { StorageProvider } from '../core/interfaces/storage-provider.js';
import { createArchiveStream } from '../streams/archive-transform.js';
import type { ArchiverConfig, UploadResult } from '../types/index.js';
import { ArchiveError } from '../types/index.js';
import { parseUri } from '../utils/uri-parser.js';

/**
 * Generic Archiver Service
 * Works with any storage provider (S3, filesystem, etc.)
 */
export class Archiver {
  constructor(private provider: StorageProvider) {}

  /**
   * Create archive from storage objects and upload to target
   */
  async archiveFiles(config: ArchiverConfig): Promise<UploadResult & { signedUrl: string }> {
    const { sourceUri, targetUri, compressionLevel = 9 } = config;

    // Parse URIs
    const source = parseUri(sourceUri);
    const target = parseUri(targetUri);

    console.log(`[Archiver] Using storage provider: ${this.provider.name}`);

    // For S3: bucket is container, path is prefix/key
    // For File: use absolute paths - container is base dir, key is relative path
    let sourceContainer: string;
    let sourcePrefix: string;
    let targetContainer: string;
    let targetKey: string;

    if (source.scheme === 's3') {
      sourceContainer = source.bucket || '';
      sourcePrefix = source.path;
      targetContainer = target.bucket || '';
      targetKey = target.path;
    } else {
      // file:// - use the path as-is (filesystem provider will handle absolute paths)
      sourceContainer = source.path;
      sourcePrefix = '';
      targetContainer = '';
      targetKey = target.path;
    }

    // List source files
    const objects = await this.provider.listObjects(sourceContainer, {
      prefix: sourcePrefix,
    });

    if (objects.length === 0) {
      throw new ArchiveError(`${ERROR_MESSAGES.NO_FILES_FOUND} in ${sourceUri}`);
    }

    // Filter out directories (keys ending with /)
    const files = objects.filter((obj) => obj.key && !obj.key.endsWith('/'));

    if (files.length === 0) {
      throw new ArchiveError(`${ERROR_MESSAGES.NO_FILES_FOUND} (only directories) in ${sourceUri}`);
    }

    console.log(`[Archiver] Archiving ${files.length} files to ${targetUri}`);

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
