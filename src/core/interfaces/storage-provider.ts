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
 * 
 * Currently implemented:
 * - S3StorageProvider: AWS S3 and S3-compatible storage
 * - FilesystemStorageProvider: Local filesystem
 * 
 * Planned implementations:
 * - AzureBlobStorageProvider: Microsoft Azure Blob Storage
 * - GcsStorageProvider: Google Cloud Storage
 */
export interface StorageProvider {
  /**
   * Provider name for logging/identification
   */
  readonly name: string;

  /**
   * List objects in storage
   * @param container - S3 bucket name or filesystem directory path
   * @param options - List options
   */
  listObjects(container: string, options?: ListObjectsOptions): Promise<StorageObject[]>;

  /**
   * Get an object as a readable stream
   * @param container - S3 bucket name or filesystem directory path
   * @param key - Object key or file path
   */
  getObjectStream(container: string, key: string): Promise<Readable>;

  /**
   * Upload an object from a readable stream
   * @param container - S3 bucket name or filesystem directory path
   * @param key - Object key or file path
   * @param stream - Readable stream
   * @param options - Upload options
   */
  uploadObject(
    container: string,
    key: string,
    stream: Readable,
    options?: UploadOptions,
  ): Promise<UploadResult>;

  /**
   * Delete an object
   * @param container - S3 bucket name or filesystem directory path
   * @param key - Object key or file path
   */
  deleteObject(container: string, key: string): Promise<void>;

  /**
   * Check if an object exists
   * @param container - S3 bucket name or filesystem directory path
   * @param key - Object key or file path
   */
  objectExists(container: string, key: string): Promise<boolean>;

  /**
   * Get a URL to access the object
   * @param container - S3 bucket name or filesystem directory path
   * @param key - Object key or file path
   * @param options - URL generation options
   * @returns Signed URL for S3, file:// URL for filesystem
   */
  getObjectUrl(container: string, key: string, options?: GetUrlOptions): Promise<string>;

  /**
   * Create storage location if it doesn't exist
   * @param container - S3 bucket name or filesystem directory path
   */
  createContainer(container: string): Promise<void>;
}
