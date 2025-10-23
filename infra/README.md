# Infrastructure Example

This directory contains an **example** AWS SAM template for deploying zipflow as an AWS Lambda function.

## What's Included

- `template.sam.yaml` - AWS SAM template defining the Lambda function and required resources
- `events/` - Sample Lambda event payloads for testing

## Purpose

This is provided as a **reference implementation** for users who want to deploy zipflow to AWS Lambda. It demonstrates:

- Lambda function configuration
- IAM roles and permissions
- S3 event triggers
- Environment variables setup

## Usage

### Local Testing

```bash
# Build the Lambda function
sam build -t template.sam.yaml

# Test locally with a sample event
sam local invoke ZipflowFunction -e events/test-event.json

# Start local API Gateway
sam local start-api
```

### Deployment

```bash
# Deploy to your AWS account
sam deploy --guided
```

During deployment, you'll be prompted for:
- Stack name (e.g., `zipflow-prod`)
- AWS Region
- Parameter values (S3 buckets, etc.)
- IAM role creation confirmation

## Customization

**Important:** This template is a starting point. You should customize it for your specific requirements:

- Adjust Lambda memory and timeout settings
- Configure CloudWatch alarms
- Add custom IAM policies
- Set up S3 event triggers for your buckets
- Configure VPC settings if needed
- Add tags for cost allocation

## Security Considerations

Before deploying to production:

1. Review and restrict IAM permissions to minimum required
2. Enable CloudWatch Logs encryption
3. Consider VPC deployment for private S3 access
4. Set up proper monitoring and alerting
5. Review and adjust Lambda concurrency limits

## No CI/CD

This is an open-source project without automated deployments. Users are responsible for:

- Deploying to their own AWS accounts
- Managing their own infrastructure
- Implementing their own CI/CD pipelines if desired

## Support

For questions about AWS Lambda deployment, please open an issue on GitHub.

