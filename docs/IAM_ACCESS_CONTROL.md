# IAM Access Control for S3 Buckets

This guide explains how to configure IAM-based access control for your S3 storage buckets using AWS CDK.

## Overview

The `BucketAccess` construct provides a secure, scalable way to manage IAM users, groups, and policies for S3 bucket access. It follows AWS best practices:

- ✅ **Group-based permissions** - Users are assigned to groups, not individual policies
- ✅ **Least privilege principle** - Grant only necessary permissions
- ✅ **Automated IAM resource creation** - Users, groups, and policies created via CDK
- ✅ **Flexible access levels** - READ_ONLY, READ_WRITE, or FULL access
- ✅ **Optional prefix restrictions** - Limit access to specific paths within bucket
- ✅ **Access key generation** - Optional programmatic access credentials

## Access Levels

### READ_ONLY

- `s3:GetObject` - Download objects
- `s3:GetObjectVersion` - Access previous versions
- `s3:ListBucket` - List bucket contents
- `s3:GetBucketLocation` - Get bucket location

### READ_WRITE (Default)

All READ_ONLY permissions plus:

- `s3:PutObject` - Upload objects
- `s3:PutObjectAcl` - Set object ACLs
- `s3:DeleteObject` - Delete objects
- `s3:DeleteObjectVersion` - Delete object versions

### FULL

All S3 operations on the bucket and its objects.

## Configuration Options

### Basic Configuration

```typescript
import { BucketAccessLevel } from "./config/storage-bucket.config";

const config: StorageBucketConfig = {
  // ... other bucket settings
  accessControl: [
    {
      userName: "imgx-api-user",
      groupName: "imgx-s3-access",
      accessLevel: BucketAccessLevel.READ_WRITE,
      createAccessKeys: true,
    },
  ],
};
```

### Advanced Configuration with Prefix Restrictions

```typescript
const config: StorageBucketConfig = {
  accessControl: [
    {
      userName: "imgx-api-user",
      groupName: "imgx-s3-access",
      accessLevel: BucketAccessLevel.READ_WRITE,
      createAccessKeys: true,
      // Restrict access to specific paths
      allowedPrefixes: ["images/", "thumbnails/"],
      tags: {
        application: "imgx",
        team: "media-processing",
      },
    },
  ],
};
```

### Multiple Users/Groups

```typescript
const config: StorageBucketConfig = {
  accessControl: [
    // Imgx API user with read-write access
    {
      userName: "imgx-api-user",
      groupName: "imgx-api-group",
      accessLevel: BucketAccessLevel.READ_WRITE,
      createAccessKeys: true,
      allowedPrefixes: ["images/", "thumbnails/"],
    },
    // Analytics team with read-only access
    {
      userName: "analytics-reader",
      groupName: "analytics-readonly-group",
      accessLevel: BucketAccessLevel.READ_ONLY,
      createAccessKeys: true,
    },
    // Admin with full access
    {
      userName: "bucket-admin",
      groupName: "bucket-admin-group",
      accessLevel: BucketAccessLevel.FULL,
      createAccessKeys: false, // Use console access only
    },
  ],
};
```

## Example: Imgx Integration

### Scenario

Imgx is an image processing service that needs to:

- Read images from the S3 bucket
- Write processed images back to the bucket
- Access only specific directories (images/ and thumbnails/)

### Step 1: Update Configuration

Create or update `config/imgx-bucket.config.ts`:

```typescript
import {
  BucketAccessLevel,
  StorageBucketConfig,
} from "./storage-bucket.config";

export const imgxStorageConfig: StorageBucketConfig = {
  versioned: true,
  encrypted: true,
  enableAccessLogging: true,
  enableMonitoring: true,
  intelligentTiering: {
    enabled: true,
    archiveAccessTierDays: 90,
    deepArchiveAccessTierDays: 180,
  },
  lifecycle: {
    transitionToIntelligentTieringDays: 30,
    noncurrentVersionExpirationDays: 90,
  },
  // IAM Access Control for Imgx
  accessControl: [
    {
      userName: "imgx-api-user",
      groupName: "imgx-s3-access",
      accessLevel: BucketAccessLevel.READ_WRITE,
      createAccessKeys: true,
      allowedPrefixes: ["images/", "thumbnails/"],
      tags: {
        application: "imgx",
        purpose: "image-processing",
        environment: "production",
      },
    },
  ],
};
```

### Step 2: Update Stack Instantiation

In `bin/index.ts`:

```typescript
import { imgxStorageConfig } from "../config/imgx-bucket.config";

const imgxBucketStack = new StorageBucketStack(app, "ImgxStorageBucket", {
  bucketType: "custom",
  customConfig: imgxStorageConfig,
  bucketName: "imgx-media-storage",
  environment: "production",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: "S3 storage bucket for Imgx image processing service",
});
```

### Step 3: Deploy

```bash
# Set AWS credentials
export AWS_PROFILE=production
export CDK_DEFAULT_REGION=us-east-1

# Deploy the stack
npx cdk deploy ImgxStorageBucket
```

### Step 4: Retrieve Access Keys

After deployment, CloudFormation outputs will include:

```
Outputs:
ImgxStorageBucket.AccessKeyId-0 = AKIA...
ImgxStorageBucket.SecretAccessKey-0 = wJalr... (SENSITIVE!)
ImgxStorageBucket.UserName-0 = imgx-api-user
ImgxStorageBucket.GroupName-0 = imgx-s3-access
ImgxStorageBucket.UserArn-0 = arn:aws:iam::123456789012:user/imgx-api-user
```

⚠️ **IMPORTANT**: Store these credentials securely! Consider using AWS Secrets Manager or AWS Systems Manager Parameter Store.

### Step 5: Configure Imgx

Configure Imgx with the generated credentials:

```bash
# Environment variables for Imgx
export AWS_ACCESS_KEY_ID="<from outputs>"
export AWS_SECRET_ACCESS_KEY="<from outputs>"
export AWS_DEFAULT_REGION="us-east-1"
export S3_BUCKET_NAME="imgx-media-storage"
```

Or use Imgx configuration file:

```json
{
  "aws": {
    "accessKeyId": "<from outputs>",
    "secretAccessKey": "<from outputs>",
    "region": "us-east-1"
  },
  "s3": {
    "bucket": "imgx-media-storage",
    "imagePath": "images/",
    "thumbnailPath": "thumbnails/"
  }
}
```

## Deployment Examples

### Production Deployment with Imgx Access

```bash
#!/bin/bash
# deploy-imgx-bucket.sh

export AWS_PROFILE=production
export CDK_DEFAULT_ACCOUNT=123456789012
export CDK_DEFAULT_REGION=us-east-1

npx cdk deploy ImgxStorageBucket \
  -c environment=production \
  -c bucketType=custom \
  -c bucketName=imgx-media-storage \
  --require-approval never
```

### Development Environment

For development, you might want read-only access:

```typescript
const devConfig: StorageBucketConfig = {
  // ... other settings
  accessControl: [
    {
      userName: "imgx-dev-user",
      groupName: "imgx-dev-group",
      accessLevel: BucketAccessLevel.READ_ONLY, // Read-only for dev
      createAccessKeys: true,
    },
  ],
};
```

## Security Best Practices

### 1. Use IAM Roles for EC2/Lambda (Preferred)

Instead of IAM users with access keys, use IAM roles when possible:

```typescript
// For Lambda function
const imgxRole = new iam.Role(this, "ImgxLambdaRole", {
  assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
});

bucket.grantReadWrite(imgxRole);
```

### 2. Rotate Access Keys Regularly

If using access keys, implement rotation:

```bash
# Create new access key
aws iam create-access-key --user-name imgx-api-user

# Update Imgx configuration
# Then delete old access key
aws iam delete-access-key --user-name imgx-api-user --access-key-id <old-key-id>
```

### 3. Use Secrets Management

Store credentials in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name imgx/s3-credentials \
  --description "S3 credentials for Imgx" \
  --secret-string '{
    "accessKeyId":"<key-id>",
    "secretAccessKey":"<secret-key>",
    "bucket":"imgx-media-storage"
  }'
```

### 4. Enable CloudTrail Logging

Monitor API calls:

```bash
# CloudTrail logs will show all S3 API calls made by imgx-api-user
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=Username,AttributeValue=imgx-api-user
```

### 5. Use Bucket Encryption

All buckets are encrypted by default. Ensure Imgx uses HTTPS:

```typescript
const imgxClient = new S3Client({
  region: "us-east-1",
  // Force HTTPS
  endpoint: "https://s3.us-east-1.amazonaws.com",
});
```

## Monitoring IAM Access

### CloudWatch Metrics

Monitor bucket access via CloudWatch metrics (automatically enabled):

- Request counts by operation type
- Error rates (4xx, 5xx)
- Data transfer metrics

### S3 Access Logs

Access logs show detailed request information:

```bash
# View recent access logs
aws s3 ls s3://imgx-media-storage-logs/access-logs/ --recursive | tail -20

# Parse logs to see Imgx user activity
aws s3 cp s3://imgx-media-storage-logs/access-logs/2026-03-03.log - | \
  grep imgx-api-user
```

### CloudTrail Events

Query CloudTrail for IAM and S3 events:

```bash
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=imgx-media-storage \
  --start-time 2026-03-01 \
  --max-results 50
```

## Troubleshooting

### Access Denied Errors

If Imgx receives "Access Denied" errors:

1. **Check IAM permissions**:

   ```bash
   aws iam get-user --user-name imgx-api-user
   aws iam list-groups-for-user --user-name imgx-api-user
   aws iam list-attached-group-policies --group-name imgx-s3-access
   ```

2. **Verify bucket policy**:

   ```bash
   aws s3api get-bucket-policy --bucket imgx-media-storage
   ```

3. **Check prefix restrictions**:
   - Ensure Imgx is accessing allowed paths (images/, thumbnails/)
   - Verify path format (should end with /)

4. **Test IAM policy**:
   ```bash
   aws iam simulate-principal-policy \
     --policy-source-arn arn:aws:iam::123456789012:user/imgx-api-user \
     --action-names s3:GetObject s3:PutObject \
     --resource-arns arn:aws:s3:::imgx-media-storage/images/*
   ```

### Invalid Access Key

If credentials don't work:

1. **Verify credentials in CloudFormation outputs**
2. **Check if access key is active**:
   ```bash
   aws iam list-access-keys --user-name imgx-api-user
   ```
3. **Regenerate if necessary** (see rotation steps above)

### Prefix Restrictions Not Working

If prefix restrictions aren't enforced:

1. Check the IAM policy condition
2. Ensure paths end with `/` (e.g., `images/` not `images`)
3. Verify Imgx is using correct path format

## Cost Considerations

IAM users, groups, and policies have no direct cost, but consider:

- **API request costs**: Monitor request rates from Imgx user
- **Data transfer costs**: Outbound data transfer charges apply
- **CloudTrail logging costs**: If enabled for governance

View costs by tag:

```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-03-01,End=2026-03-31 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --filter file://filter.json

# filter.json
{
  "Tags": {
    "Key": "application",
    "Values": ["imgx"]
  }
}
```

## Additional Resources

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [CDK IAM Documentation](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam-readme.html)

## Next Steps

1. ✅ Deploy stack with IAM access control
2. ✅ Retrieve and securely store access keys
3. ✅ Configure Imgx with credentials
4. ✅ Test access with sample operations
5. ✅ Monitor CloudWatch metrics
6. ✅ Review S3 access logs
7. ⬜ Implement access key rotation policy
8. ⬜ Consider migrating to IAM roles (if applicable)

---

**Last Updated**: March 3, 2026  
**Version**: 0.1.0  
**Status**: Production Ready ✅
