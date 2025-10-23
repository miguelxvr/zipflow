import { ConfigurationError } from '../types/index.js';

/**
 * Supported storage schemes
 * 
 * Currently supported:
 * - s3: AWS S3 and S3-compatible storage (MinIO, etc.)
 * - file: Local filesystem
 * 
 * Planned for future:
 * - azure: Microsoft Blob Storage
 * - gs: Google Cloud Storage
 */
export type StorageScheme = 's3' | 'file';

/**
 * Parsed storage URI
 */
export interface ParsedUri {
  scheme: StorageScheme;
  bucket?: string; // For S3, Azure Blob, GCS
  path: string; // Key/prefix for S3, file path for filesystem, blob path for Azure, object path for GCS
  fullPath: string; // Original URI
}

/**
 * Parse a storage URI
 * 
 * Supported formats:
 * - S3: s3://bucket/path/to/file
 * - File: file://./path or file:///absolute/path
 * 
 * Future support planned for:
 * - Azure: azure://container/blob/path
 * - GCS: gs://bucket/path/to/object
 */
export function parseUri(uri: string): ParsedUri {
  if (!uri) {
    throw new ConfigurationError('URI cannot be empty');
  }

  // S3 URI: s3://bucket/path/to/file
  if (uri.startsWith('s3://')) {
    const withoutScheme = uri.slice(5); // Remove 's3://'
    const firstSlash = withoutScheme.indexOf('/');

    if (firstSlash === -1) {
      // Just bucket, no path
      return {
        scheme: 's3',
        bucket: withoutScheme,
        path: '',
        fullPath: uri,
      };
    }

    const bucket = withoutScheme.slice(0, firstSlash);
    const path = withoutScheme.slice(firstSlash + 1);

    if (!bucket) {
      throw new ConfigurationError(`Invalid S3 URI: ${uri} (missing bucket)`);
    }

    return {
      scheme: 's3',
      bucket,
      path,
      fullPath: uri,
    };
  }

  // File URI: file://./path or file:///absolute/path
  if (uri.startsWith('file://')) {
    const path = uri.slice(7); // Remove 'file://'

    if (!path) {
      throw new ConfigurationError(`Invalid file URI: ${uri} (missing path)`);
    }

    return {
      scheme: 'file',
      path,
      fullPath: uri,
    };
  }

  throw new ConfigurationError(
    `Unsupported URI scheme: ${uri} (supported: s3://, file://)`,
  );
}

/**
 * Extract directory/prefix from a URI path
 * For s3://bucket/path/to/file.zip returns path/to/
 * For file://./storage/output/file.zip returns ./storage/output/
 */
export function getUriDirectory(uri: string): string {
  const parsed = parseUri(uri);
  const lastSlash = parsed.path.lastIndexOf('/');

  if (lastSlash === -1) {
    return '';
  }

  return parsed.path.slice(0, lastSlash + 1);
}

/**
 * Extract filename from a URI path
 * For s3://bucket/path/to/file.zip returns file.zip
 * For file://./storage/output/file.zip returns file.zip
 */
export function getUriFilename(uri: string): string {
  const parsed = parseUri(uri);
  const lastSlash = parsed.path.lastIndexOf('/');

  if (lastSlash === -1) {
    return parsed.path;
  }

  return parsed.path.slice(lastSlash + 1);
}

/**
 * Join URI base with path
 * joinUri('s3://bucket/base/', 'subdir/file.txt') => 's3://bucket/base/subdir/file.txt'
 */
export function joinUri(base: string, ...paths: string[]): string {
  const parsed = parseUri(base);
  const joinedPath = [parsed.path, ...paths]
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/'); // Remove duplicate slashes

  if (parsed.scheme === 's3') {
    return `s3://${parsed.bucket}/${joinedPath}`;
  }

  return `file://${joinedPath}`;
}

