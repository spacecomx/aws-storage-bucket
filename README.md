# @spacecomx/aws-storage-bucket

Enterprise-grade AWS CDK stack for deploying highly available, secure, and cost-optimized S3 storage buckets with comprehensive monitoring, logging, and compliance features.

[![CDK Version](https://img.shields.io/badge/AWS_CDK-2.240.0-orange.svg)](https://docs.aws.amazon.com/cdk/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## ✨ Features

### 🔒 Security & Compliance

- Server-side encryption with S3-managed keys (AES-256)
- Block all public access by default
- HTTPS/SSL enforcement for all requests
- Automated security compliance checks with **cdk-nag**
- Bucket policies preventing unencrypted uploads
- S3 access logging for audit trails
- **IAM-based access control** with users, groups, and policies

### 📊 Observability & Monitoring

- **CloudWatch Dashboards** with real-time metrics
- **Automated Alarms** for 4xx/5xx errors with SNS notifications
- Request monitoring (GET, PUT, All requests)
- Data transfer tracking (upload/download)
- First byte latency metrics
- **EventBridge integration** for real-time event processing

### 💰 Cost Optimization

- **Intelligent Tiering** for automatic cost savings
- Configurable lifecycle policies
- Archive access tiers (90/180 days)
- Automatic transition rules
- Noncurrent version expiration
- Log retention policies

### 🏗️ Enterprise Features

- **Multi-environment support** (dev, staging, production)
- **Comprehensive tagging strategy** for cost allocation
- **CDK Aspects** for cross-cutting concerns
- TypeScript strict mode with **ES2022** target
- Versioning enabled (configurable per bucket type)
- Environment-aware removal policies

### 📦 Bucket Type Presets

- **Media Storage**: Optimized for images, videos, and media files
- **Document Storage**: Optimized for documents and PDFs
- **Log Storage**: Optimized for application and access logs
- **Custom**: Define your own configuration

## 🚀 Prerequisites

- **Node.js**: 22.x or later
- **AWS CLI**: Configured with appropriate credentials
- **AWS CDK**: 2.240.0 (installed automatically)
- **pnpm**: 10.x or later (recommended)

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/spacecomx/aws-storage-bucket.git
cd aws-storage-bucket

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test
```

## 🔁 GitHub Workflows (Minimal)

This repository uses two lightweight GitHub Actions workflows:

- **CI on Pull Requests** (`.github/workflows/ci.yml`)
  - Runs `pnpm lint`, `pnpm typecheck`, and `pnpm test`
  - Triggered on `pull_request` and `merge_group`
- **Manual Version Bump PR** (`.github/workflows/version-bump-pr.yml`)
  - Triggered manually via `workflow_dispatch`
  - Supports `patch`, `minor`, `major`, `prerelease`, and `custom`
  - Creates a pull request that updates `package.json` version metadata only

### Recommended Branch Protection (2026)

For your default branch, require these status checks before merge:

- `lint`
- `typecheck`
- `test`

Also enable:

- Require pull request reviews before merging
- Dismiss stale approvals when new commits are pushed
- Require branches to be up to date before merging

## 🔧 Environment Variables

The stack supports configuration through environment variables and CDK context variables.

### AWS Credentials (Required)

```bash
# Set AWS credentials
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_SESSION_TOKEN="your-session-token"  # Optional, for temporary credentials

# Or use AWS profile
export AWS_PROFILE="your-profile-name"

# Set default region
export AWS_DEFAULT_REGION="us-east-1"

# Set account for deployment
export CDK_DEFAULT_ACCOUNT="123456789012"
export CDK_DEFAULT_REGION="us-east-1"
```

### Application Configuration (Optional)

```bash
# Environment type (affects removal policy and monitoring)
export ENVIRONMENT="production"  # or "dev", "staging"

# Bucket configuration
export BUCKET_TYPE="media"       # media, document, log, or custom
export BUCKET_NAME="my-custom-bucket-name"

# Stack naming
export STACK_NAME="MyProductionMediaBucket"

# Tagging and organization
export OWNER="platform-team"
export COST_CENTER="engineering"
export PROJECT="data-platform"

# Monitoring configuration
export ENABLE_MONITORING="true"
export ENABLE_ACCESS_LOGGING="true"
export ENABLE_EVENT_NOTIFICATIONS="false"

# Alarm thresholds
export ERROR_4XX_THRESHOLD="10"
export ERROR_5XX_THRESHOLD="5"
```

## 📚 Usage Examples

### Example 1: Quick Development Deployment

```bash
# Set environment variables
export AWS_PROFILE="dev"
export CDK_DEFAULT_REGION="us-east-1"

# Deploy with defaults (dev environment, media bucket)
npx cdk deploy
```

### Example 2: Production Deployment with Full Monitoring

```bash
# Set AWS credentials and region
export AWS_PROFILE="production"
export CDK_DEFAULT_REGION="us-east-1"
export CDK_DEFAULT_ACCOUNT="123456789012"

# Set environment and configuration
export ENVIRONMENT="production"
export BUCKET_TYPE="media"
export OWNER="platform-team"
export COST_CENTER="engineering"

# Deploy with context variables
npx cdk deploy \
  -c environment=production \
  -c bucketType=media \
  -c owner=platform-team \
  -c costCenter=engineering \
  -c bucketName=prod-media-storage
```

### Example 3: Document Storage with Custom Tags

```bash
# Environment variables
export AWS_PROFILE="production"
export CDK_DEFAULT_REGION="eu-west-1"

# Deploy with custom tags
npx cdk deploy \
  -c environment=production \
  -c bucketType=document \
  -c owner=data-team \
  -c costCenter=analytics \
  -c tags='{"project":"data-lake","compliance":"gdpr","retention":"7years"}'
```

### Example 4: Log Bucket (No Recursive Logging)

```bash
export AWS_PROFILE="production"
export CDK_DEFAULT_REGION="us-west-2"

npx cdk deploy \
  -c environment=production \
  -c bucketType=log \
  -c bucketName=application-logs \
  -c owner=devops-team
```

### Example 5: Multi-Environment Deployment Script

```bash
#!/bin/bash
# deploy.sh - Deploy to multiple environments

ENVIRONMENTS=("dev" "staging" "production")
BUCKET_TYPE="media"

for ENV in "${ENVIRONMENTS[@]}"; do
  echo "Deploying to $ENV environment..."

  export AWS_PROFILE="${ENV}"
  export ENVIRONMENT="$ENV"

  npx cdk deploy \
    -c environment="$ENV" \
    -c bucketType="$BUCKET_TYPE" \
    -c owner=platform-team \
    -c stackName="${BUCKET_TYPE}-storage-${ENV}" \
    --require-approval never

  echo "✓ Deployed to $ENV"
done
```

### Example 6: Using .env File

Create a `.env` file in your project root:

```bash
# .env
AWS_PROFILE=production
AWS_DEFAULT_REGION=us-east-1
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=us-east-1

ENVIRONMENT=production
BUCKET_TYPE=media
OWNER=platform-team
COST_CENTER=engineering
```

Then load and deploy:

```bash
# Load environment variables
source .env

# Or use with dotenv
npm install dotenv-cli
npx dotenv npx cdk deploy \
  -c environment=$ENVIRONMENT \
  -c bucketType=$BUCKET_TYPE \
  -c owner=$OWNER \
  -c costCenter=$COST_CENTER
```

## ⚙️ Configuration Options

### Context Variables

All configuration can be provided via CDK context (`-c` flag):

| Variable      | Type        | Default         | Description                                       |
| ------------- | ----------- | --------------- | ------------------------------------------------- |
| `environment` | string      | `dev`           | Deployment environment (dev, staging, production) |
| `bucketType`  | string      | `media`         | Bucket type preset (media, document, log, custom) |
| `bucketName`  | string      | auto-generated  | Custom S3 bucket name                             |
| `stackName`   | string      | auto-generated  | CloudFormation stack name                         |
| `description` | string      | auto-generated  | Stack description                                 |
| `owner`       | string      | `platform-team` | Team/person responsible for the bucket            |
| `costCenter`  | string      | -               | Cost center for billing allocation                |
| `tags`        | JSON object | `{}`            | Additional custom tags                            |

### Environment-Specific Behavior

| Environment  | Removal Policy | Auto-Delete | Monitoring  | Access Logging |
| ------------ | -------------- | ----------- | ----------- | -------------- |
| `dev`        | DESTROY        | Yes         | Optional    | Optional       |
| `staging`    | DESTROY        | Yes         | Recommended | Recommended    |
| `production` | **RETAIN**     | No          | **Enabled** | **Enabled**    |

## 📊 Bucket Type Configurations

### Media Storage

```typescript
{
  versioned: true,
  encrypted: true,
  enableAccessLogging: true,
  enableMonitoring: true,
  intelligentTiering: {
    archiveAccessTierDays: 90,
    deepArchiveAccessTierDays: 180
  },
  lifecycle: {
    transitionToIntelligentTieringDays: 30,
    noncurrentVersionExpirationDays: 90
  }
}
```

### Document Storage

```typescript
{
  versioned: true,
  encrypted: true,
  enableAccessLogging: true,
  enableMonitoring: true,
  intelligentTiering: {
    archiveAccessTierDays: 90,
    deepArchiveAccessTierDays: 180
  },
  lifecycle: {
    transitionToIntelligentTieringDays: 15,
    noncurrentVersionExpirationDays: 60
  }
}
```

### Log Storage

```typescript
{
  versioned: false,
  encrypted: true,
  enableAccessLogging: false,  // Prevents recursive logging
  enableMonitoring: true,
  intelligentTiering: {
    archiveAccessTierDays: 90,
    deepArchiveAccessTierDays: 180
  },
  lifecycle: {
    transitionToIntelligentTieringDays: 7,
    noncurrentVersionExpirationDays: 30
  }
}
```

## 🔍 Monitoring & Observability

### CloudWatch Dashboard

Each bucket automatically gets a CloudWatch dashboard with:

- Request metrics (AllRequests, GetRequests, PutRequests)
- Error rates (4xx, 5xx)
- Data transfer (BytesDownloaded, BytesUploaded)
- Latency metrics (FirstByteLatency)

Access via AWS Console: **CloudWatch > Dashboards > {bucket-name}-metrics**

### CloudWatch Alarms

Automatic alarms are created for:

- **4xx Errors**: Threshold 5 errors over 2 evaluation periods
- **5xx Errors**: Threshold 1 error over 2 evaluation periods

Configure SNS notifications by providing an alarm topic.

### S3 Access Logs

Access logs are automatically stored in a separate log bucket:

- Bucket naming: `{main-bucket-name}-logs`
- Log prefix: `access-logs/`
- Retention: 90 days with intelligent tiering

### EventBridge Integration

Enable real-time event processing:

```bash
npx cdk deploy \
  -c enableEventNotifications=true \
  -c bucketType=media
```

Captures events:

- Object Created
- Object Removed
- Object Restored

## 🏷️ Tagging Strategy

All resources are automatically tagged with:

| Tag           | Source  | Example                   |
| ------------- | ------- | ------------------------- |
| `Environment` | Context | `production`              |
| `ManagedBy`   | Auto    | `CDK`                     |
| `Application` | Context | `storage-bucket`          |
| `Owner`       | Context | `platform-team`           |
| `CostCenter`  | Context | `engineering`             |
| Custom Tags   | Context | `{"project":"data-lake"}` |

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run tests with coverage
pnpm test -- --coverage
```

## 🛠️ Useful Commands

```bash
# Build TypeScript
pnpm build

# Watch for changes
pnpm watch

# Clean build artifacts
pnpm clean

# Clean everything (including node_modules)
pnpm clean:all

# Synthesize CloudFormation template
npx cdk synth

# Show differences from deployed stack
npx cdk diff

# Deploy to AWS
npx cdk deploy

# Destroy stack (careful in production!)
npx cdk destroy

# List all stacks
npx cdk list

# Show CloudFormation template
npx cdk synth > template.yaml
```

## 🔐 Security Best Practices

This stack implements:

- ✅ **Encryption at rest**: S3-managed encryption (SSE-S3)
- ✅ **Encryption in transit**: HTTPS/TLS enforcement
- ✅ **Access control**: Block all public access
- ✅ **Audit logging**: S3 access logs enabled
- ✅ **Versioning**: Enabled for data protection
- ✅ **Bucket policies**: Deny HTTP and unencrypted uploads
- ✅ **Compliance**: cdk-nag checks for AWS best practices
- ✅ **IAM**: Least privilege access patterns

## 📈 Cost Optimization

Estimated monthly costs (heavily dependent on usage):

| Bucket Type                 | Storage (100GB) | Requests (1M) | Total Est. |
| --------------------------- | --------------- | ------------- | ---------- |
| Media (Intelligent-Tier)    | ~$2.30          | ~$0.50        | **~$2.80** |
| Document (Intelligent-Tier) | ~$2.30          | ~$0.40        | **~$2.70** |
| Log (Intelligent-Tier)      | ~$1.80          | ~$0.30        | **~$2.10** |

_Costs reduce significantly as data moves to archive tiers_

## 🚨 Troubleshooting

### CDK Deployment Fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify CDK bootstrap
npx cdk bootstrap aws://ACCOUNT-ID/REGION

# Check for errors
npx cdk synth
```

### Bucket Name Already Exists

```bash
# Use a custom bucket name
npx cdk deploy -c bucketName=my-unique-bucket-name-12345
```

### Permission Denied

```bash
# Ensure your IAM user/role has required permissions:
# - s3:*
# - cloudformation:*
# - iam:*
# - cloudwatch:*
# - logs:*
```

## 📖 Additional Documentation

- [IAM Access Control Guide](docs/IAM_ACCESS_CONTROL.md) - Configure IAM users, groups, and permissions
- [IMPROVEMENTS.md](IMPROVEMENTS.md) - Detailed list of 2026 enhancements
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/best-practices.html)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributors

- [Wayne Gibson](https://github.com/waynegibson) - Initial work

## 🙏 Acknowledgments

- AWS CDK Team for the excellent framework
- Community contributors and testers

---

**Version:** 0.1.0  
**CDK Version:** 2.240.0  
**Last Updated:** March 2, 2026  
**Compliance:** AWS Solutions Checks Enabled
