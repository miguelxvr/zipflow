/**
 * Application-wide constants
 */

/** Default signed URL expiration time (24 hours in seconds) */
export const DEFAULT_SIGNED_URL_EXPIRATION = 24 * 60 * 60;

/** Standard signed URL expiration time (1 hour in seconds) */
export const STANDARD_SIGNED_URL_EXPIRATION = 3600;

/** Default compression level for ZIP archives (0-9) */
export const DEFAULT_COMPRESSION_LEVEL = 9;

/** Default S3 multipart upload part size (5MB in bytes) */
export const DEFAULT_UPLOAD_PART_SIZE = 5 * 1024 * 1024;

/** Default S3 upload queue size */
export const DEFAULT_UPLOAD_QUEUE_SIZE = 1;

/** Default upload timeout (1 hour in milliseconds) */
export const DEFAULT_UPLOAD_TIMEOUT = 60 * 60 * 1000;

/** Logging prefixes for consistent log formatting */
export const LOG_PREFIX = {
  ARCHIVE: '[Archive]',
  CLI: '[CLI]',
  LAMBDA: '[Lambda]',
  S3_ARCHIVER: '[S3Archiver]',
  S3_CLIENT: '[S3Client]',
  S3_DOWNLOAD: '[S3Download]',
  S3_UPLOAD: '[S3Upload]',
} as const;

/** Error messages */
export const ERROR_MESSAGES = {
  UNKNOWN_ERROR: 'Unknown error',
  NO_FILES_FOUND: 'No files found',
  NO_RESPONSE_BODY: 'No body in response',
  UPLOAD_FAILED: 'Upload failed',
  LIST_OBJECTS_FAILED: 'Failed to list objects',
  FETCH_FAILED: 'Failed to fetch',
  SIGNED_URL_FAILED: 'Failed to generate signed URL',
} as const;
