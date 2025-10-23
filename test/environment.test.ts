import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getConfig, getConfigWithOverrides } from '../src/config/environment.js';
import { ConfigurationError } from '../src/types/index.js';

describe('Environment Configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set required environment variables for tests
    process.env.SOURCE_URI = 's3://test-source/data/';
    process.env.TARGET_URI = 's3://test-target/output.zip';
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('getConfig', () => {
    it('should return valid configuration with required URI env vars', () => {
      const config = getConfig();

      expect(config).toHaveProperty('source');
      expect(config).toHaveProperty('target');
      expect(config).toHaveProperty('aws');
      expect(config).toHaveProperty('compression');
      expect(config).toHaveProperty('upload');

      expect(config.source.uri).toBe('s3://test-source/data/');
      expect(config.source.scheme).toBe('s3');
      expect(config.source.bucket).toBe('test-source');
      expect(config.source.path).toBe('data/');

      expect(config.target.uri).toBe('s3://test-target/output.zip');
      expect(config.target.scheme).toBe('s3');
      expect(config.target.bucket).toBe('test-target');
      expect(config.target.path).toBe('output.zip');
    });

    it('should use default values for optional env vars', () => {
      const config = getConfig();

      expect(config.aws.region).toBe('us-east-1');
      expect(config.compression.level).toBe(9);
      expect(config.upload.partSize).toBe(5242880);
    });

    it('should throw ConfigurationError when required env var is missing', () => {
      process.env.SOURCE_URI = undefined;

      expect(() => getConfig()).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError when source and target schemes differ', () => {
      process.env.SOURCE_URI = 's3://bucket/path';
      process.env.TARGET_URI = 'file://./output.zip';

      expect(() => getConfig()).toThrow(ConfigurationError);
      expect(() => getConfig()).toThrow(/same storage type/);
    });

    it('should parse file:// URIs correctly', () => {
      process.env.SOURCE_URI = 'file://./storage/input';
      process.env.TARGET_URI = 'file://./storage/output/archive.zip';

      const config = getConfig();

      expect(config.source.scheme).toBe('file');
      expect(config.source.path).toBe('./storage/input');
      expect(config.source.bucket).toBeUndefined();

      expect(config.target.scheme).toBe('file');
      expect(config.target.path).toBe('./storage/output/archive.zip');
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
        source: {
          uri: 's3://override-source/data/',
          scheme: 's3',
          bucket: 'override-source',
          path: 'data/',
        },
      });

      expect(config.source.uri).toBe('s3://override-source/data/');
      expect(config.source.bucket).toBe('override-source');
    });

    it('should preserve non-overridden values', () => {
      const config = getConfigWithOverrides({
        compression: {
          level: 5,
        },
      });

      expect(config.compression.level).toBe(5);
      expect(config.source.uri).toBe('s3://test-source/data/');
    });
  });
});
