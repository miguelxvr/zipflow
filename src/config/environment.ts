import { z } from 'zod';
import type { EnvironmentConfig } from '../types/index.js';
import { ConfigurationError } from '../types/index.js';

/**
 * Zod schema for environment variable validation
 */
const envSchema = z.object({
  // Storage Provider Configuration
  STORAGE_PROVIDER: z.enum(['s3', 'filesystem']).default('s3'),

  // AWS Configuration (for S3 provider)
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ENDPOINT_URL: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Filesystem Configuration (for filesystem provider)
  FILESYSTEM_BASE_DIR: z.string().default('./storage'),

  // Storage Configuration (generic naming)
  SOURCE_CONTAINER: z.string().min(1, 'SOURCE_CONTAINER is required'),
  SOURCE_PREFIX: z.string().default(''),
  TARGET_CONTAINER: z.string().min(1, 'TARGET_CONTAINER is required'),
  TARGET_KEY: z.string().min(1, 'TARGET_KEY is required'),

  // Compression Configuration
  COMPRESSION_LEVEL: z
    .string()
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().min(0).max(9))
    .default('9'),

  // Upload Configuration
  UPLOAD_PART_SIZE: z
    .string()
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().positive())
    .default('5242880'), // 5MB
  UPLOAD_QUEUE_SIZE: z
    .string()
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().positive())
    .default('1'),
  UPLOAD_TIMEOUT: z
    .string()
    .transform((val) => Number.parseInt(val, 10))
    .pipe(z.number().positive())
    .default('3600000'), // 60 minutes

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
});

type EnvSchema = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 */
function parseEnvironment(): EnvSchema {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new ConfigurationError(`Environment validation failed: ${errors}`);
    }
    throw error;
  }
}

/**
 * Get validated and typed configuration
 */
export function getConfig(): EnvironmentConfig {
  const env = parseEnvironment();

  const awsConfig: EnvironmentConfig['aws'] = {
    region: env.AWS_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  };

  if (env.AWS_ENDPOINT_URL !== undefined) {
    awsConfig.endpoint = env.AWS_ENDPOINT_URL;
  }
  if (env.AWS_ACCESS_KEY_ID !== undefined) {
    awsConfig.accessKeyId = env.AWS_ACCESS_KEY_ID;
  }
  if (env.AWS_SECRET_ACCESS_KEY !== undefined) {
    awsConfig.secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  }

  return {
    provider: {
      type: env.STORAGE_PROVIDER,
    },
    aws: awsConfig,
    filesystem: {
      baseDir: env.FILESYSTEM_BASE_DIR,
    },
    storage: {
      sourceContainer: env.SOURCE_CONTAINER,
      sourcePrefix: env.SOURCE_PREFIX,
      targetContainer: env.TARGET_CONTAINER,
      targetKey: env.TARGET_KEY,
    },
    compression: {
      level: env.COMPRESSION_LEVEL,
    },
    upload: {
      partSize: env.UPLOAD_PART_SIZE,
      queueSize: env.UPLOAD_QUEUE_SIZE,
      timeout: env.UPLOAD_TIMEOUT,
    },
  };
}

/**
 * Validate environment without returning config (useful for startup checks)
 */
export function validateEnvironment(): void {
  parseEnvironment();
}

/**
 * Get configuration with overrides (useful for Lambda events)
 */
export function getConfigWithOverrides(overrides: Partial<EnvironmentConfig>): EnvironmentConfig {
  const baseConfig = getConfig();

  return {
    provider: { ...baseConfig.provider, ...overrides.provider },
    aws: { ...baseConfig.aws, ...overrides.aws },
    filesystem: { ...baseConfig.filesystem, ...overrides.filesystem },
    storage: { ...baseConfig.storage, ...overrides.storage },
    compression: { ...baseConfig.compression, ...overrides.compression },
    upload: { ...baseConfig.upload, ...overrides.upload },
  };
}
