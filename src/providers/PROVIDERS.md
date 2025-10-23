# Storage Providers

This directory contains storage provider implementations for zipflow.

## Current Providers

### ✅ Local Filesystem (`file://`)
- **Location**: `filesystem/filesystem-storage-provider.ts`
- **URI Scheme**: `file://`
- **Use Case**: Local development, testing, file system archiving
- **Example**: `file://./storage/input`

### ✅ AWS S3 (`s3://`)
- **Location**: `s3/s3-storage-provider.ts`
- **URI Scheme**: `s3://`
- **Use Case**: Cloud storage, production deployments
- **Compatibility**: Works with AWS S3, MinIO, and other S3-compatible services
- **Example**: `s3://my-bucket/data/`

## Planned Providers

### 🔜 Microsoft Azure Blob Storage
- **URI Scheme**: `azure://` (proposed)
- **Location**: `azure/azure-blob-storage-provider.ts` (to be created)
- **Use Case**: Azure cloud deployments
- **Example**: `azure://mycontainer/path/to/blob`
- **SDK**: `@azure/storage-blob`

### 🔜 Google Cloud Storage
- **URI Scheme**: `gs://`
- **Location**: `gcs/gcs-storage-provider.ts` (to be created)
- **Use Case**: Google Cloud Platform deployments
- **Example**: `gs://my-bucket/path/to/object`
- **SDK**: `@google-cloud/storage`

## Adding a New Provider

To add a new storage provider:

1. Create a new directory: `src/providers/<provider-name>/`
2. Implement the `StorageProvider` interface from `src/core/interfaces/storage-provider.ts`
3. Add the URI scheme to `StorageScheme` type in `src/types/index.ts`
4. Update `parseUri()` in `src/utils/uri-parser.ts` to handle the new URI scheme
5. Add provider creation logic in `src/core/provider-factory.ts`
6. Add configuration for the provider in `src/config/environment.ts` (if needed)
7. Update documentation in README.md and this file

## Provider Interface

All providers must implement:
- `listObjects()` - List objects in storage
- `getObjectStream()` - Get object as readable stream
- `uploadObject()` - Upload object from stream
- `deleteObject()` - Delete an object
- `objectExists()` - Check if object exists
- `getObjectUrl()` - Get access URL (signed URL for cloud, file:// for local)
- `createContainer()` - Create storage location if needed

See `src/core/interfaces/storage-provider.ts` for full interface definition.

