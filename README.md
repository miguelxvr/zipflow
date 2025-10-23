# zipflow

Multi-provider streaming archiver. Compress files from S3 or local filesystem into ZIP format. Runs locally or as AWS Lambda.

## Features

- **Multi-Provider Storage**: 
  - ✅ Local Filesystem (`file://`)
  - ✅ AWS S3 (`s3://`)
  - 🔜 Microsoft Blob Storage (planned)
  - 🔜 Google Cloud Storage (planned)
- **Streaming**: Memory-efficient for large files
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

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment (uncomment and customize one of the examples)
cp .env.example .env

# 3. Run
pnpm start
```

That's it! The `.env.example` file contains three ready-to-use configurations:
- **Filesystem** - Local testing, no AWS needed
- **AWS S3** - Production deployment
- **MinIO** - Local S3 testing with Docker

Just uncomment the example you want and customize the values.

## Configuration

Configuration uses **URI schemes** to specify source and target locations:

### Supported Providers

| Provider | URI Scheme | Status |
|----------|------------|--------|
| Local Filesystem | `file://./path` | ✅ Available |
| AWS S3 | `s3://bucket/path` | ✅ Available |
| S3-compatible (MinIO, etc.) | `s3://bucket/path` | ✅ Available |
| Microsoft Blob Storage | `azure://container/path` | 🔜 Planned |
| Google Cloud Storage | `gs://bucket/path` | 🔜 Planned |

| Variable | Description | Default |
|----------|-------------|---------|
| `SOURCE_URI` | Source location URI | required |
| `TARGET_URI` | Target ZIP file URI | required |
| `COMPRESSION_LEVEL` | Compression level (0-9) | `9` |
| `AWS_REGION` | AWS region (for S3) | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key (for S3) | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key (for S3) | - |

### Examples

**Filesystem:**
```bash
SOURCE_URI=file://./storage/input
TARGET_URI=file://./storage/output/archive.zip
```

**AWS S3:**
```bash
SOURCE_URI=s3://my-bucket/data/
TARGET_URI=s3://my-bucket/archives/output.zip
AWS_REGION=us-east-1
```

**MinIO:**
```bash
SOURCE_URI=s3://test-bucket/data/
TARGET_URI=s3://test-bucket/archives/result.zip
AWS_ENDPOINT_URL=http://localhost:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
```

## Scripts

```bash
pnpm start         # Build and run CLI
pnpm build         # Build TypeScript only
pnpm test          # Run tests
pnpm lint          # Lint code
pnpm format        # Format code
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
