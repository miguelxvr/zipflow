#!/usr/bin/env node

import { LOG_PREFIX } from '../config/constants.js';
import { getConfig } from '../config/environment.js';
import { createArchiver } from '../core/archiver.js';
import { createStorageProvider } from '../core/provider-factory.js';
import { S3CompressError } from '../types/index.js';

/**
 * CLI entry point for archiving files
 */
async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Storage Archiver - Archive Files to ZIP');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Load and validate configuration
    console.log(`${LOG_PREFIX.CLI} Loading configuration from environment...`);
    const config = getConfig();

    console.log(`${LOG_PREFIX.CLI} Configuration:`);
    console.log(`  Storage Type: ${config.source.scheme.toUpperCase()}`);
    console.log(`  Source: ${config.source.uri}`);
    console.log(`  Target: ${config.target.uri}`);
    console.log(`  Compression Level: ${config.compression.level}`);

    if (config.source.scheme === 's3') {
      console.log(`  AWS Region: ${config.aws.region}`);
      if (config.aws.endpoint) {
        console.log(`  Custom Endpoint: ${config.aws.endpoint} (MinIO mode)`);
      }
    }
    console.log('');

    // Create storage provider
    console.log(`${LOG_PREFIX.CLI} Creating storage provider...`);
    const provider = createStorageProvider(config);

    // Create archiver
    const archiver = createArchiver(provider);

    // Execute archiving
    console.log(`${LOG_PREFIX.CLI} Starting archive operation...`);
    console.log('');

    const startTime = Date.now();

    const result = await archiver.archiveFiles({
      sourceUri: config.source.uri,
      targetUri: config.target.uri,
      compressionLevel: config.compression.level,
    });

    const duration = Date.now() - startTime;

    // Success
    console.log('');
    console.log('='.repeat(60));
    console.log('✓ Archive Operation Completed Successfully');
    console.log('='.repeat(60));
    console.log(`Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log(`Location: ${result.location}`);
    console.log(`Key: ${result.key}`);
    if (result.etag) {
      console.log(`ETag: ${result.etag}`);
    }
    console.log('');
    console.log('Access URL:');
    console.log(result.signedUrl);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('✗ Archive Operation Failed');
    console.error('='.repeat(60));

    if (error instanceof S3CompressError) {
      console.error(`Error Code: ${error.code}`);
      console.error(`Message: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (process.env['NODE_ENV'] === 'development') {
        console.error('');
        console.error('Stack Trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error occurred');
    }

    console.error('');
    process.exit(1);
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
