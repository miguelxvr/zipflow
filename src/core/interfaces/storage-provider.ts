import type { Readable } from 'node:stream';

/**
 * Storage object metadata
 */
export interface StorageObject {
  key: string;
  size?: number;
  lastModified?: Date;
  etag?: string;
}

/**
 * Options for listing objects
 */
export interface ListObjectsOptions {
  prefix?: string;
  maxKeys?: number;
}

/**
 * Options for uploading objects
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Result of an upload operation
 */
export interface UploadResult {
  key: string;
  location: string;
  etag?: string;
  versionId?: string;
}

/**
 * Options for generating access URLs
 */
export interface GetUrlOptions {
  expiresIn?: number;
}

/**
 * Abstract storage provider interface
 * Supports multiple storage backends (S3, filesystem, etc.)
 */
export interface StorageProvider {
  /**
   * Provider name for logging/identification
   */
  readonly name: string;

  /**
   * List objects in a container/bucket
   */
  listObjects(container: string, options?: ListObjectsOptions): Promise<StorageObject[]>;

  /**
   * Get an object as a readable stream
   */
  getObjectStream(container: string, key: string): Promise<Readable>;

  /**
   * Upload an object from a readable stream
   */
  uploadObject(
    container: string,
    key: string,
    stream: Readable,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * Delete an object
   */
  deleteObject(container: string, key: string): Promise<void>;

  /**
   * Check if an object exists
   */
  objectExists(container: string, key: string): Promise<boolean>;

  /**
   * Get a URL to access the object (signed URL for S3, file path for filesystem)
   */
  getObjectUrl(container: string, key: string, options?: GetUrlOptions): Promise<string>;

  /**
   * Create a container/bucket if it doesn't exist
   */
  createContainer(container: string): Promise<void>;
}
