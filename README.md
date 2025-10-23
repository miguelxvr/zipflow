# zipflow

Multi-provider streaming archiver. Compress files from S3 or local filesystem into ZIP format. Runs locally or as AWS Lambda.

## Features

- **Multi-Provider**: S3, Filesystem (easily extensible)
- **Streaming**: Memory-efficient for large files
- **Local Development**: No AWS credentials required
- **TypeScript + Node.js 22 LTS**

## Streaming Flow

The archiver uses Node.js streams to process files without loading them entirely into memory. Files are downloaded, compressed, and uploaded simultaneously in a pipeline, enabling efficient processing of large datasets with minimal resource usage.

```
┌─────────────────┐
│ Storage Provider│  1. List objects in source container
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Download File  │  2. Get readable stream for each file
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ZIP Archive    │  3. Append file to archive stream
│  (archiver)     │     - Compress on-the-fly
└────────┬────────┘     - No temp files
         │
         ▼
┌─────────────────┐
│ PassThrough     │  4. Pipe to upload stream
│   Stream        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Storage Provider│  5. Upload to target container
│    (Upload)     │     - Multipart for S3
└─────────────────┘     - Direct write for filesystem
```

**Key Benefits:**
- Constant memory usage (processes chunks, not whole files)
- Can archive terabytes with minimal RAM
- Upload starts before download completes
- No disk space needed for temporary files

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/miguelxvr/zipflow.git
cd zipflow

# Install dependencies
pnpm install
```

### Option 1: Filesystem Provider (Easiest)

No AWS credentials or Docker required:

```bash
# Create test directories
mkdir -p storage/input storage/output

# Add some test files
echo "Test data" > storage/input/test.txt

# Run the archiver
STORAGE_PROVIDER=filesystem \
FILESYSTEM_BASE_DIR=./storage \
SOURCE_CONTAINER=input \
TARGET_CONTAINER=output \
TARGET_KEY=archive.zip \
pnpm dev

# Check the result
ls -lh storage/output/archive.zip
unzip -l storage/output/archive.zip
```

### Option 2: MinIO (Local S3 Testing)

Test S3 functionality locally:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start MinIO
docker compose up -d

# 3. Upload test files
docker run --rm --network zipflow_s3-network \
  -v "$(pwd)/storage/input:/data" \
  --entrypoint=/bin/sh minio/mc:latest -c \
  'mc alias set minio http://minio:9000 minioadmin minioadmin && \
   mc cp /data/test.txt minio/test-bucket/data/test.txt'

# 4. Run the archiver
STORAGE_PROVIDER=s3 \
AWS_ENDPOINT_URL=http://localhost:9000 \
AWS_ACCESS_KEY_ID=minioadmin \
AWS_SECRET_ACCESS_KEY=minioadmin \
S3_FORCE_PATH_STYLE=true \
SOURCE_CONTAINER=test-bucket \
SOURCE_PREFIX=data/ \
TARGET_CONTAINER=test-bucket \
TARGET_KEY=archives/result.zip \
pnpm dev

# 5. Access MinIO Console
# Open http://localhost:9001 (minioadmin/minioadmin)
```

### Option 3: Using .env File

```bash
# Copy and edit environment file
cp .env.example .env
nano .env  # or your preferred editor

# Run with environment file
source .env && pnpm dev
```

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_PROVIDER` | `s3` or `filesystem` | `s3` |
| `SOURCE_CONTAINER` | Source bucket/directory | required |
| `SOURCE_PREFIX` | Filter prefix | `""` |
| `TARGET_CONTAINER` | Target bucket/directory | required |
| `TARGET_KEY` | Output file path | required |
| `COMPRESSION_LEVEL` | 0-9 | `9` |

### S3 Provider

```bash
STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
SOURCE_CONTAINER=my-bucket
TARGET_CONTAINER=my-bucket
TARGET_KEY=archive.zip
```

### Filesystem Provider

```bash
STORAGE_PROVIDER=filesystem
FILESYSTEM_BASE_DIR=./storage
SOURCE_CONTAINER=input
TARGET_CONTAINER=output
TARGET_KEY=archive.zip
```

### MinIO (Local S3)

```bash
STORAGE_PROVIDER=s3
AWS_ENDPOINT_URL=http://localhost:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
SOURCE_CONTAINER=test-bucket
TARGET_CONTAINER=test-bucket
TARGET_KEY=archive.zip
```

## Scripts

```bash
pnpm dev           # Development mode
pnpm build         # Build TypeScript
pnpm start         # Run CLI
pnpm test          # Run tests
pnpm lint          # Lint code
```

## Docker

```bash
# Start MinIO
docker compose up -d minio

# Run app
docker compose up app
```

## AWS Lambda Deployment (Optional)

The `infra/` directory contains an example AWS SAM template for deploying to your own AWS account.

### Test Lambda Locally

```bash
# Build SAM application
sam build -t infra/template.sam.yaml

# Invoke locally with test event
sam local invoke ZipflowFunction \
  -t infra/template.sam.yaml \
  -e infra/events/test-event.json

# Start local API Gateway
sam local start-api -t infra/template.sam.yaml
```

### Deploy to Your AWS Account

```bash
# Deploy with guided prompts
sam deploy -t infra/template.sam.yaml --guided

# This will prompt you for:
# - Stack name
# - AWS Region
# - Confirm changes before deployment
# - IAM role creation
```

**Note:** The SAM template is provided as an example. Customize it for your specific use case and security requirements.

## License

MIT
