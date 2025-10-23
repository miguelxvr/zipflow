import type { Context } from 'aws-lambda';
import { ERROR_MESSAGES, LOG_PREFIX } from '../config/constants.js';
import { getConfig, getConfigWithOverrides } from '../config/environment.js';
import { createArchiver } from '../core/archiver.js';
import { createStorageProvider } from '../core/provider-factory.js';
import type { ArchiveEvent, ArchiveResponse } from '../types/index.js';
import { S3CompressError } from '../types/index.js';

/**
 * AWS Lambda handler for archiving operations
 *
 * Supports multiple invocation types:
 * 1. Direct invocation with ArchiveEvent payload
 * 2. S3 event trigger (extracts bucket/key from S3 event)
 * 3. API Gateway event
 */
export async function handler(
  event: ArchiveEvent | any,
  context: Context,
): Promise<ArchiveResponse> {
  const startTime = Date.now();

  console.log(`${LOG_PREFIX.LAMBDA} Execution started`, {
    requestId: context.awsRequestId,
    functionName: context.functionName,
    memoryLimit: context.memoryLimitInMB,
  });

  try {
    // Parse event to extract archive configuration
    const archiveEvent = parseEvent(event);

    console.log(`${LOG_PREFIX.LAMBDA} Archive configuration:`, {
      sourceContainer: archiveEvent.sourceBucket,
      sourcePrefix: archiveEvent.sourcePrefix,
      targetContainer: archiveEvent.targetBucket,
      targetKey: archiveEvent.targetKey,
    });

    // Get configuration with event overrides
    const config = getConfigWithOverrides({
      storage: {
        sourceContainer: archiveEvent.sourceBucket,
        sourcePrefix: archiveEvent.sourcePrefix,
        targetContainer: archiveEvent.targetBucket,
        targetKey: archiveEvent.targetKey,
      },
      compression: {
        level: archiveEvent.compressionLevel ?? 9,
      },
    });

    // Create storage provider
    const provider = createStorageProvider(config);

    // Create archiver
    const archiver = createArchiver(provider);

    // Execute archiving operation
    const result = await archiver.archiveFiles({
      sourceContainer: config.storage.sourceContainer,
      sourcePrefix: config.storage.sourcePrefix,
      targetContainer: config.storage.targetContainer,
      targetKey: config.storage.targetKey,
      compressionLevel: config.compression.level,
    });

    // List objects to get file count
    const objects = await archiver.listObjects(
      config.storage.sourceContainer,
      config.storage.sourcePrefix,
    );
    const fileCount = objects.filter((obj) => obj.key && !obj.key.endsWith('/')).length;

    const duration = Date.now() - startTime;

    console.log(`${LOG_PREFIX.LAMBDA} Execution completed`, {
      duration: `${duration}ms`,
      fileCount,
    });

    return {
      success: true,
      message: `Successfully archived ${fileCount} files`,
      data: {
        bucket: config.storage.targetContainer,
        key: result.key,
        location: result.location,
        fileCount,
        signedUrl: result.signedUrl,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`${LOG_PREFIX.LAMBDA} Execution failed`, {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof S3CompressError) {
      return {
        success: false,
        message: error.message,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    return {
      success: false,
      message: 'Internal server error',
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR,
      },
    };
  }
}

/**
 * Parse event to extract archive configuration
 */
function parseEvent(event: any): ArchiveEvent {
  // Handle direct invocation with ArchiveEvent
  if (event.sourceBucket && event.targetBucket) {
    return {
      sourceBucket: event.sourceBucket,
      sourcePrefix: event.sourcePrefix || '',
      targetBucket: event.targetBucket,
      targetKey: event.targetKey,
      compressionLevel: event.compressionLevel,
    };
  }

  // Handle S3 event trigger
  if (event.Records?.[0]?.s3) {
    const s3Record = event.Records[0].s3;
    const config = getConfig();

    return {
      sourceBucket: s3Record.bucket.name,
      sourcePrefix: s3Record.object.key,
      targetBucket: config.storage.targetContainer,
      targetKey: config.storage.targetKey,
      compressionLevel: config.compression.level,
    };
  }

  // Handle API Gateway event
  if (event.body) {
    const body = JSON.parse(event.body);
    return {
      sourceBucket: body.sourceBucket,
      sourcePrefix: body.sourcePrefix || '',
      targetBucket: body.targetBucket,
      targetKey: body.targetKey,
      compressionLevel: body.compressionLevel,
    };
  }

  // Fallback to environment variables
  const config = getConfig();
  return {
    sourceBucket: config.storage.sourceContainer,
    sourcePrefix: config.storage.sourcePrefix,
    targetBucket: config.storage.targetContainer,
    targetKey: config.storage.targetKey,
    compressionLevel: config.compression.level,
  };
}
