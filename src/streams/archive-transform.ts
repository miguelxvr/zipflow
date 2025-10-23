import archiver, { type Archiver } from 'archiver';
import { DEFAULT_COMPRESSION_LEVEL, LOG_PREFIX } from '../config/constants.js';
import { ArchiveError } from '../types/index.js';

/**
 * Create and configure an archiver instance for ZIP compression
 */
export function createArchiveStream(compressionLevel = DEFAULT_COMPRESSION_LEVEL): Archiver {
  const archive = archiver('zip', {
    zlib: { level: compressionLevel },
  });

  // Event handlers
  archive.on('warning', (warning) => {
    if (warning.code === 'ENOENT') {
      console.warn(`${LOG_PREFIX.ARCHIVE} Warning: ${warning.message}`);
    } else {
      throw new ArchiveError(`Archive warning: ${warning.message}`);
    }
  });

  archive.on('error', (error) => {
    throw new ArchiveError(`Archive error: ${error.message}`);
  });

  archive.on('progress', (progress) => {
    const { processed, total } = progress.entries;
    if ((processed >= 1 && processed <= 10) || processed % 100 === 0 || processed === total) {
      console.log(`${LOG_PREFIX.ARCHIVE} Progress: ${processed}/${total} files`);
    }
  });

  archive.on('finish', () => {
    console.log(`${LOG_PREFIX.ARCHIVE} Stream finalized`);
  });

  archive.on('end', () => {
    console.log(`${LOG_PREFIX.ARCHIVE} Data drained`);
  });

  archive.on('close', () => {
    console.log(`${LOG_PREFIX.ARCHIVE} Stream closed`);
  });

  return archive;
}
