import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import { ERROR_MESSAGES, LOG_PREFIX } from '../../config/constants.js';
import type {
  GetUrlOptions,
  ListObjectsOptions,
  StorageObject,
  StorageProvider,
  UploadOptions,
  UploadResult,
} from '../../core/interfaces/storage-provider.js';
import { StorageOperationError } from '../../types/index.js';

/**
 * Filesystem Storage Provider
 * Implements storage operations using local filesystem
 */
export class FilesystemStorageProvider implements StorageProvider {
  readonly name = 'Filesystem';

  constructor(private baseDir: string) {
    this.baseDir = resolve(baseDir);
  }

  private getFullPath(container: string, key = ''): string {
    return resolve(this.baseDir, container, key);
  }

  async listObjects(container: string, options?: ListObjectsOptions): Promise<StorageObject[]> {
    try {
      const containerPath = this.getFullPath(container);
      const prefix = options?.prefix || '';
      const searchPath = join(containerPath, prefix);

      console.log(`${LOG_PREFIX.S3_CLIENT} Listing objects in ${searchPath}`);

      const objects: StorageObject[] = [];

      async function scan(dir: string): Promise<void> {
        try {
          const entries = await readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isFile()) {
              const stats = await stat(fullPath);
              const relativePath = relative(containerPath, fullPath);

              // Filter by prefix if provided
              if (!prefix || relativePath.startsWith(prefix)) {
                objects.push({
                  key: relativePath.replace(/\\/g, '/'), // Normalize path separators
                  size: stats.size,
                  lastModified: stats.mtime,
                });

                // Check maxKeys limit
                if (options?.maxKeys && objects.length >= options.maxKeys) {
                  return;
                }
              }
            } else if (entry.isDirectory()) {
              await scan(fullPath);
            }
          }
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      await scan(searchPath);

      console.log(`${LOG_PREFIX.S3_CLIENT} Found ${objects.length} objects`);

      return objects;
    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      throw new StorageOperationError(`${ERROR_MESSAGES.LIST_OBJECTS_FAILED}: ${message}`);
    }
  }

  async getObjectStream(container: string, key: string): Promise<Readable> {
    try {
      const filePath = this.getFullPath(container, key);
      console.log(`${LOG_PREFIX.S3_DOWNLOAD} Fetching file://${filePath}`);

      // Check if file exists
      await stat(filePath);

      return createReadStream(filePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new StorageOperationError(`File not found: ${key}`);
      }
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      throw new StorageOperationError(`${ERROR_MESSAGES.FETCH_FAILED} ${key}: ${message}`);
    }
  }

  async uploadObject(
    container: string,
    key: string,
    stream: Readable,
    _options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      const filePath = this.getFullPath(container, key);
      console.log(`${LOG_PREFIX.S3_UPLOAD} Starting upload to file://${filePath}`);

      // Ensure directory exists
      await mkdir(join(filePath, '..'), { recursive: true });

      // Create write stream
      const writeStream = createWriteStream(filePath);

      // Track progress
      let bytesWritten = 0;
      stream.on('data', (chunk) => {
        bytesWritten += chunk.length;
        if (bytesWritten % (1024 * 1024) === 0) {
          // Log every MB
          console.log(
            `${LOG_PREFIX.S3_UPLOAD} Progress: ${(bytesWritten / 1024 / 1024).toFixed(2)} MB`,
          );
        }
      });

      // Pipe stream to file
      await pipeline(stream, writeStream);

      console.log(`${LOG_PREFIX.S3_UPLOAD} Upload completed successfully`);

      return {
        key,
        location: `file://${filePath}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      throw new StorageOperationError(`${ERROR_MESSAGES.UPLOAD_FAILED}: ${message}`);
    }
  }

  async deleteObject(container: string, key: string): Promise<void> {
    try {
      const filePath = this.getFullPath(container, key);
      console.log(`${LOG_PREFIX.S3_CLIENT} Deleting file://${filePath}`);

      await unlink(filePath);

      console.log(`${LOG_PREFIX.S3_CLIENT} Deleted successfully`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, consider it deleted
        return;
      }
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      throw new StorageOperationError(`Failed to delete ${key}: ${message}`);
    }
  }

  async objectExists(container: string, key: string): Promise<boolean> {
    try {
      const filePath = this.getFullPath(container, key);
      await stat(filePath);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async getObjectUrl(container: string, key: string, _options?: GetUrlOptions): Promise<string> {
    try {
      const filePath = this.getFullPath(container, key);

      // Check if file exists
      if (!(await this.objectExists(container, key))) {
        throw new StorageOperationError(`File not found: ${key}`);
      }

      // Return file:// URL
      return pathToFileURL(filePath).href;
    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      throw new StorageOperationError(`Failed to get URL for ${key}: ${message}`);
    }
  }

  async createContainer(container: string): Promise<void> {
    try {
      const containerPath = this.getFullPath(container);
      console.log(`${LOG_PREFIX.S3_CLIENT} Creating directory ${containerPath}`);

      await mkdir(containerPath, { recursive: true });

      console.log(`${LOG_PREFIX.S3_CLIENT} Directory created`);
    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      throw new StorageOperationError(`Failed to create container ${container}: ${message}`);
    }
  }
}
