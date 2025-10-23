import type { Readable } from 'node:stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  DEFAULT_UPLOAD_PART_SIZE,
  DEFAULT_UPLOAD_QUEUE_SIZE,
  ERROR_MESSAGES,
  LOG_PREFIX,
  STANDARD_SIGNED_URL_EXPIRATION,
} from '../../config/constants.js';
import type {
  GetUrlOptions,
  ListObjectsOptions,
  StorageObject,
  StorageProvider,
  UploadOptions,
  UploadResult,
} from '../../core/interfaces/storage-provider.js';
import { S3OperationError } from '../../types/index.js';

/**
 * S3 Storage Provider
 * Implements storage operations using AWS S3
 */
export class S3StorageProvider implements StorageProvider {
  readonly name = 'S3';

  constructor(private client: S3Client) {}

  async listObjects(container: string, options?: ListObjectsOptions): Promise<StorageObject[]> {
    try {
      console.log(
        `${LOG_PREFIX.S3_CLIENT} Listing objects in s3://${container}/${options?.prefix || ''}`,
      );

      const command = new ListObjectsV2Command({
        Bucket: container,
        Prefix: options?.prefix,
        MaxKeys: options?.maxKeys,
      });

      const response = await this.client.send(command);
      const contents = response.Contents || [];

      const objects: StorageObject[] = contents.map((item) => {
        const obj: StorageObject = {
          key: item.Key || '',
        };
        if (item.Size !== undefined) obj.size = item.Size;
        if (item.LastModified !== undefined) obj.lastModified = item.LastModified;
        if (item.ETag !== undefined) obj.etag = item.ETag;
        return obj;
      });

      console.log(`${LOG_PREFIX.S3_CLIENT} Found ${objects.length} objects`);

      return objects;
    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      throw new S3OperationError(`${ERROR_MESSAGES.LIST_OBJECTS_FAILED}: ${message}`);
    }
  }

  async getObjectStream(container: string, key: string): Promise<Readable> {
    try {
      console.log(`${LOG_PREFIX.S3_DOWNLOAD} Fetching s3://${container}/${key}`);

      const command = new GetObjectCommand({
        Bucket: container,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new S3OperationError(`${ERROR_MESSAGES.NO_RESPONSE_BODY} for ${key}`);
      }

      return response.Body as Readable;
    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      throw new S3OperationError(`${ERROR_MESSAGES.FETCH_FAILED} ${key}: ${message}`);
    }
  }

  async uploadObject(
    container: string,
    key: string,
    stream: Readable,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    try {
      console.log(`${LOG_PREFIX.S3_UPLOAD} Starting upload to s3://${container}/${key}`);

      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: container,
          Key: key,
          Body: stream,
          ContentType: options?.contentType || 'application/zip',
          Metadata: options?.metadata,
        },
        partSize: DEFAULT_UPLOAD_PART_SIZE,
        queueSize: DEFAULT_UPLOAD_QUEUE_SIZE,
      });

      // Progress tracking
      upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(
            `${LOG_PREFIX.S3_UPLOAD} Progress: ${progress.loaded.toLocaleString()} / ${progress.total.toLocaleString()} bytes (${percent.toFixed(1)}%)`,
          );
        }
      });

      const result = await upload.done();

      console.log(`${LOG_PREFIX.S3_UPLOAD} Upload completed successfully`);

      const uploadResult: UploadResult = {
        key,
        location: result.Location || `s3://${container}/${key}`,
      };

      if (result.ETag !== undefined) uploadResult.etag = result.ETag;
      if (result.VersionId !== undefined) uploadResult.versionId = result.VersionId;

      return uploadResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      throw new S3OperationError(`${ERROR_MESSAGES.UPLOAD_FAILED}: ${message}`);
    }
  }

  async deleteObject(container: string, key: string): Promise<void> {
    try {
      console.log(`${LOG_PREFIX.S3_CLIENT} Deleting s3://${container}/${key}`);

      const command = new DeleteObjectCommand({
        Bucket: container,
        Key: key,
      });

      await this.client.send(command);

      console.log(`${LOG_PREFIX.S3_CLIENT} Deleted successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      throw new S3OperationError(`Failed to delete ${key}: ${message}`);
    }
  }

  async objectExists(container: string, key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: container,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async getObjectUrl(container: string, key: string, options?: GetUrlOptions): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: container,
        Key: key,
      });

      return await getSignedUrl(this.client, command, {
        expiresIn: options?.expiresIn || STANDARD_SIGNED_URL_EXPIRATION,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      throw new S3OperationError(`${ERROR_MESSAGES.SIGNED_URL_FAILED}: ${message}`);
    }
  }

  async createContainer(container: string): Promise<void> {
    // S3 buckets must be created separately (requires special permissions)
    // This is a no-op for S3 provider
    console.log(`${LOG_PREFIX.S3_CLIENT} Container ${container} assumed to exist`);
  }
}
