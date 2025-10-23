import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getConfig, getConfigWithOverrides } from '../src/config/environment.js';
import { ConfigurationError } from '../src/types/index.js';

describe('Environment Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set required environment variables for tests
    process.env.SOURCE_CONTAINER = 'test-source';
    process.env.TARGET_CONTAINER = 'test-target';
    process.env.TARGET_KEY = 'test/output.zip';
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('getConfig', () => {
    it('should return valid configuration with required env vars', () => {
      const config = getConfig();

      expect(config).toHaveProperty('provider');
      expect(config).toHaveProperty('aws');
      expect(config).toHaveProperty('filesystem');
      expect(config).toHaveProperty('storage');
      expect(config).toHaveProperty('compression');
      expect(config).toHaveProperty('upload');

      expect(config.storage.sourceContainer).toBe('test-source');
      expect(config.storage.targetContainer).toBe('test-target');
      expect(config.storage.targetKey).toBe('test/output.zip');
    });

    it('should use default values for optional env vars', () => {
      const config = getConfig();

      expect(config.aws.region).toBe('us-east-1');
      expect(config.compression.level).toBe(9);
      expect(config.upload.partSize).toBe(5242880);
    });

    it('should throw ConfigurationError when required env var is missing', () => {
      process.env.SOURCE_CONTAINER = undefined;

      expect(() => getConfig()).toThrow(ConfigurationError);
    });

    it('should parse boolean environment variables correctly', () => {
      process.env.S3_FORCE_PATH_STYLE = 'true';

      const config = getConfig();
      expect(config.aws.forcePathStyle).toBe(true);
    });

    it('should parse numeric environment variables correctly', () => {
      process.env.COMPRESSION_LEVEL = '5';
      process.env.UPLOAD_PART_SIZE = '10485760';

      const config = getConfig();
      expect(config.compression.level).toBe(5);
      expect(config.upload.partSize).toBe(10485760);
    });
  });

  describe('getConfigWithOverrides', () => {
    it('should merge overrides with base config', () => {
      const config = getConfigWithOverrides({
        storage: {
          sourceContainer: 'override-source',
          sourcePrefix: 'override-prefix/',
          targetContainer: 'test-target',
          targetKey: 'test/output.zip',
        },
      });

      expect(config.storage.sourceContainer).toBe('override-source');
      expect(config.storage.sourcePrefix).toBe('override-prefix/');
    });

    it('should preserve non-overridden values', () => {
      const config = getConfigWithOverrides({
        compression: {
          level: 5,
        },
      });

      expect(config.compression.level).toBe(5);
      expect(config.storage.sourceContainer).toBe('test-source');
    });
  });
});
