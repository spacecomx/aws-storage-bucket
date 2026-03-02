# Environment Variables Quick Reference

This guide provides a quick reference for all environment variables used in the AWS Storage Bucket CDK project.

## � AWS Authentication Methods

### Method 1: AWS SSO (Recommended ⭐⭐⭐⭐⭐)

AWS SSO is the **recommended** and most secure method:

```bash
# 1. Login with SSO (do this once per session)
aws sso login --profile k9classroom-prod-profile

# 2. Verify you're logged in
aws sts get-caller-identity --profile k9classroom-prod-profile

# 3. Load your environment
source .env.karoospitbraai.local

# 4. Deploy
npx cdk deploy
```

**Advantages:**

- ✅ Automatic credential refresh
- ✅ No exposed credentials in files
- ✅ Centralized IAM management
- ✅ Compliance best practice
- ✅ No manual credential rotation needed

**See:** [AWS_SSO_SETUP.md](./AWS_SSO_SETUP.md) for detailed SSO configuration

### Method 2: AWS Profile with Access Keys ⭐⭐⭐

Fallback option using AWS profiles configured in `~/.aws/credentials`:

```bash
# Configure profile
aws configure --profile my-profile

# Then use
export AWS_PROFILE="my-profile"
source .env
npx cdk deploy
```

### Method 3: Direct Access Keys ⚠️

**Not recommended** - use only for CI/CD or when required:

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_SESSION_TOKEN="your-session-token"  # Optional

npx cdk deploy
```

## �🔑 Required Variables

### AWS Authentication

```bash
# Option 1: Use AWS Profile (Recommended)
export AWS_PROFILE="your-profile-name"

# Option 2: Use Access Keys
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_SESSION_TOKEN="your-session-token"  # Optional, for temporary credentials
```

### AWS Region & Account

```bash
export AWS_DEFAULT_REGION="us-east-1"
export CDK_DEFAULT_ACCOUNT="123456789012"
export CDK_DEFAULT_REGION="us-east-1"
```

## ⚙️ Configuration Variables

### Deployment Environment

```bash
export ENVIRONMENT="production"  # dev, staging, production
```

**Impact:**

- `dev`: DESTROY removal policy, auto-delete enabled
- `staging`: DESTROY removal policy, auto-delete enabled
- `production`: RETAIN removal policy, auto-delete disabled

### Bucket Configuration

```bash
export BUCKET_TYPE="media"  # media, document, log, custom
export BUCKET_NAME="my-custom-bucket-name"  # Auto-generated if not set
export STACK_NAME="MyProductionMediaBucket"  # Auto-generated if not set
```

### Organizational Tags

```bash
export OWNER="platform-team"
export COST_CENTER="engineering"
export PROJECT="data-platform"
```

## 🎛️ Feature Flags

```bash
export ENABLE_MONITORING="true"              # Enable CloudWatch monitoring
export ENABLE_ACCESS_LOGGING="true"          # Enable S3 access logs
export ENABLE_EVENT_NOTIFICATIONS="false"    # Enable EventBridge notifications
```

## 🚨 Monitoring Configuration

```bash
export ERROR_4XX_THRESHOLD="10"  # Number of 4xx errors before alarm
export ERROR_5XX_THRESHOLD="5"   # Number of 5xx errors before alarm
```

## 📦 Usage Examples

### Example 1: Development Environment

```bash
export AWS_PROFILE="dev"
export AWS_DEFAULT_REGION="us-east-1"
export ENVIRONMENT="dev"
export BUCKET_TYPE="media"
export OWNER="dev-team"

npx cdk deploy
```

### Example 2: Production with Full Configuration

```bash
export AWS_PROFILE="production"
export CDK_DEFAULT_ACCOUNT="123456789012"
export CDK_DEFAULT_REGION="us-east-1"
export ENVIRONMENT="production"
export BUCKET_TYPE="media"
export BUCKET_NAME="prod-media-storage-2026"
export OWNER="platform-team"
export COST_CENTER="engineering"
export ENABLE_MONITORING="true"
export ENABLE_ACCESS_LOGGING="true"

npx cdk deploy \
  -c environment=$ENVIRONMENT \
  -c bucketType=$BUCKET_TYPE \
  -c bucketName=$BUCKET_NAME \
  -c owner=$OWNER \
  -c costCenter=$COST_CENTER
```

### Example 3: Using .env File

Create a `.env` file (copy from `.env.example`):

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env

# Load and deploy
source .env
npx cdk deploy -c environment=$ENVIRONMENT -c bucketType=$BUCKET_TYPE
```

### Example 4: Multi-Environment Deployment

```bash
#!/bin/bash
ENVIRONMENTS=("dev" "staging" "production")

for ENV in "${ENVIRONMENTS[@]}"; do
  export AWS_PROFILE="$ENV"
  export ENVIRONMENT="$ENV"
  export OWNER="${ENV}-team"

  npx cdk deploy \
    -c environment=$ENV \
    -c bucketType=media \
    -c owner=$OWNER \
    --require-approval never
done
```

## 🔄 Context Variables vs Environment Variables

Both can be used, choose based on your needs:

### Environment Variables (System-wide)

```bash
export BUCKET_TYPE="media"
npx cdk deploy
```

### Context Variables (Per-command)

```bash
npx cdk deploy -c bucketType=media
```

### Combined Approach (Recommended)

```bash
# Set stable values as environment variables
export AWS_PROFILE="production"
export ENVIRONMENT="production"
export OWNER="platform-team"

# Override specific values with context
npx cdk deploy \
  -c bucketType=document \
  -c bucketName=special-docs-bucket
```

## 🛡️ Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use AWS profiles** instead of hard-coded credentials
3. **Rotate credentials** regularly
4. **Use temporary credentials** (STS) when possible
5. **Set minimal IAM permissions** for deployment

## 🔍 Debugging

### Check Current AWS Configuration

```bash
# Verify credentials
aws sts get-caller-identity

# Check region
echo $AWS_DEFAULT_REGION

# Show all AWS-related environment variables
env | grep AWS
```

### Test Configuration

```bash
# Synthesize without deploying
npx cdk synth

# Show what would change
npx cdk diff

# List available stacks
npx cdk list
```

## 📋 Complete Variable Reference

| Variable                     | Type    | Default         | Required | Description                   |
| ---------------------------- | ------- | --------------- | -------- | ----------------------------- |
| `AWS_PROFILE`                | string  | -               | Yes\*    | AWS CLI profile name          |
| `AWS_ACCESS_KEY_ID`          | string  | -               | Yes\*    | AWS access key                |
| `AWS_SECRET_ACCESS_KEY`      | string  | -               | Yes\*    | AWS secret key                |
| `AWS_SESSION_TOKEN`          | string  | -               | No       | AWS session token (temporary) |
| `AWS_DEFAULT_REGION`         | string  | `us-east-1`     | Yes      | AWS region                    |
| `CDK_DEFAULT_ACCOUNT`        | string  | -               | Yes      | AWS account ID                |
| `CDK_DEFAULT_REGION`         | string  | -               | Yes      | CDK deployment region         |
| `ENVIRONMENT`                | string  | `dev`           | No       | Deployment environment        |
| `BUCKET_TYPE`                | string  | `media`         | No       | Bucket type preset            |
| `BUCKET_NAME`                | string  | auto            | No       | Custom bucket name            |
| `STACK_NAME`                 | string  | auto            | No       | CloudFormation stack name     |
| `OWNER`                      | string  | `platform-team` | No       | Resource owner                |
| `COST_CENTER`                | string  | -               | No       | Cost allocation               |
| `PROJECT`                    | string  | -               | No       | Project name                  |
| `ENABLE_MONITORING`          | boolean | `true`          | No       | Enable monitoring             |
| `ENABLE_ACCESS_LOGGING`      | boolean | `true`          | No       | Enable access logs            |
| `ENABLE_EVENT_NOTIFICATIONS` | boolean | `false`         | No       | Enable EventBridge            |
| `ERROR_4XX_THRESHOLD`        | number  | `10`            | No       | 4xx error alarm threshold     |
| `ERROR_5XX_THRESHOLD`        | number  | `5`             | No       | 5xx error alarm threshold     |

\* Either `AWS_PROFILE` OR credentials (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`) required

## 🚀 Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit with your values
nano .env

# 3. Load environment
source .env

# 4. Deploy
npx cdk deploy -c environment=$ENVIRONMENT -c bucketType=$BUCKET_TYPE
```

## 📚 Related Documentation

- [README.md](../README.md) - Main documentation
- [AWS_SSO_SETUP.md](./AWS_SSO_SETUP.md) - **AWS SSO configuration guide** ⭐ Start here if using SSO
- [IMPROVEMENTS.md](../IMPROVEMENTS.md) - Feature details
- [.env.example](../.env.example) - Environment template
- [scripts/deploy.sh](../scripts/deploy.sh) - Deployment script
