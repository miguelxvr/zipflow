import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createS3Client, getS3Client, resetS3Client } from '../src/providers/s3/s3-client.js';
import type { EnvironmentConfig } from '../src/types/index.js';

describe('S3 Client', () => {
  const mockConfig: EnvironmentConfig['aws'] = {
    region: 'us-east-1',
    forcePathStyle: false,
  };

  afterEach(() => {
    resetS3Client();
  });

  describe('createS3Client', () => {
    it('should create an S3 client with basic configuration', () => {
      const client = createS3Client(mockConfig);
      expect(client).toBeDefined();
    });

    it('should create an S3 client with custom endpoint', () => {
      const configWithEndpoint: EnvironmentConfig['aws'] = {
        ...mockConfig,
        endpoint: 'http://localhost:9000',
        forcePathStyle: true,
      };

      const client = createS3Client(configWithEndpoint);
      expect(client).toBeDefined();
    });

    it('should create an S3 client with explicit credentials', () => {
      const configWithCreds: EnvironmentConfig['aws'] = {
        ...mockConfig,
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
      };

      const client = createS3Client(configWithCreds);
      expect(client).toBeDefined();
    });
  });

  describe('getS3Client', () => {
    it('should return singleton instance', () => {
      const client1 = getS3Client(mockConfig);
      const client2 = getS3Client(mockConfig);

      expect(client1).toBe(client2);
    });

    it('should create new instance after reset', () => {
      const client1 = getS3Client(mockConfig);
      resetS3Client();
      const client2 = getS3Client(mockConfig);

      expect(client1).not.toBe(client2);
    });
  });

  describe('resetS3Client', () => {
    it('should reset the singleton instance', () => {
      const client = getS3Client(mockConfig);
      expect(client).toBeDefined();

      resetS3Client();

      const newClient = getS3Client(mockConfig);
      expect(newClient).not.toBe(client);
    });
  });
});
