import type { Readable } from 'node:stream';

/**
 * Configuration for archiver operations
 */
export interface ArchiverConfig {
  sourceContainer: string;
  sourcePrefix: string;
  targetContainer: string;
  targetKey: string;
  compressionLevel?: number;
}

/**
 * @deprecated Use ArchiverConfig with sourceContainer/targetContainer
 */
export interface LegacyArchiverConfig {
  sourceBucket: string;
  sourcePrefix: string;
  targetBucket: string;
  targetKey: string;
  compressionLevel?: number;
}

/**
 * Options for S3 upload operations
 */
export interface S3UploadOptions {
  bucket: string;
  key: string;
  stream: Readable;
  contentType?: string;
  partSize?: number;
  queueSize?: number;
}

/**
 * Progress information for upload operations
 */
export interface UploadProgress {
  loaded?: number;
  total?: number;
  part?: number;
  key?: string;
}

/**
 * Result of a successful upload operation
 */
export interface UploadResult {
  key: string;
  location: string;
  etag?: string;
  versionId?: string;
}

/**
 * Configuration for environment variables
 */
export interface EnvironmentConfig {
  provider: {
    type: 's3' | 'filesystem';
  };
  aws: {
    region: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    forcePathStyle: boolean;
  };
  filesystem: {
    baseDir: string;
  };
  storage: {
    sourceContainer: string;
    sourcePrefix: string;
    targetContainer: string;
    targetKey: string;
  };
  compression: {
    level: number;
  };
  upload: {
    partSize: number;
    queueSize: number;
    timeout: number;
  };
}

/**
 * Lambda function event for S3 archiving
 */
export interface ArchiveEvent {
  sourceBucket: string;
  sourcePrefix: string;
  targetBucket: string;
  targetKey: string;
  compressionLevel?: number;
}

/**
 * Lambda function response
 */
export interface ArchiveResponse {
  success: boolean;
  message: string;
  data?: {
    bucket: string;
    key: string;
    location: string;
    fileCount: number;
    signedUrl?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Custom error classes
 */
export class S3CompressError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 500,
  ) {
    super(message);
    this.name = 'S3CompressError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConfigurationError extends S3CompressError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 500);
    this.name = 'ConfigurationError';
  }
}

export class S3OperationError extends S3CompressError {
  constructor(message: string, code = 'S3_OPERATION_ERROR') {
    super(message, code, 500);
    this.name = 'S3OperationError';
  }
}

export class ArchiveError extends S3CompressError {
  constructor(message: string) {
    super(message, 'ARCHIVE_ERROR', 500);
    this.name = 'ArchiveError';
  }
}

export class StorageOperationError extends S3CompressError {
  constructor(message: string, code = 'STORAGE_OPERATION_ERROR') {
    super(message, code, 500);
    this.name = 'StorageOperationError';
  }
}
