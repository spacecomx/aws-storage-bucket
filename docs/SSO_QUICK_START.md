# AWS SSO Quick Start Guide

## ✅ Your Approach is 100% Correct!

You're already doing it right:

1. ✅ You logged in with `aws sso login --profile k9classroom-prod-profile`
2. ✅ You have `.env.karoospitbraai.local` configured with the correct profile
3. ✅ Now just load and deploy!

## 🚀 Three Simple Steps to Deploy

### Method 1: Using Your Existing .env File (Easiest)

```bash
# Step 1: Login with SSO (do this once per session)
aws sso login --profile k9classroom-prod-profile

# Step 2: Load your environment
source .env.karoospitbraai.local

# Step 3: Deploy
npx cdk deploy
```

### Method 2: Using the New SSO .env Template

```bash
# Copy the SSO template
cp .env.sso .env.local

# Edit to match your profile
nano .env.local

# Then login and deploy
aws sso login --profile k9classroom-prod-profile
source .env.local
npx cdk deploy
```

### Method 3: Using the Deployment Script

```bash
# Make script executable (one-time)
chmod +x scripts/deploy.sh

# Use interactive menu
./scripts/deploy.sh

# Or pass arguments
./scripts/deploy.sh deploy dev media platform-team
```

## ❓ Understanding Your Setup

### Your Current Configuration

| Item            | Value                       | Status         |
| --------------- | --------------------------- | -------------- |
| **SSO Profile** | `k9classroom-prod-profile`  | ✅ Correct     |
| **AWS Account** | `967420867661`              | ✅ Configured  |
| **Region**      | `us-east-1`                 | ✅ Set         |
| **Environment** | `dev`                       | ✅ Development |
| **.env File**   | `.env.karoospitbraai.local` | ✅ Ready       |

### Why SSO is Better

You chose the **best** authentication method:

| Aspect                   | SSO                | Access Keys |
| ------------------------ | ------------------ | ----------- |
| **Security**             | ⭐⭐⭐⭐⭐         | ⭐⭐⭐      |
| **Credentials in Files** | No                 | Yes ❌      |
| **Auto Token Refresh**   | Yes ✅             | No          |
| **Session Duration**     | 4-12 hours         | Unlimited   |
| **Industry Standard**    | 2026 Best Practice | Legacy      |

## 📋 Daily Workflow

**Every time you want to deploy:**

```bash
# 1. Login (if not already logged in)
aws sso login --profile k9classroom-prod-profile

# 2. Check login status
aws sts get-caller-identity --profile k9classroom-prod-profile
# Output should show your account info

# 3. Load environment
source .env.karoospitbraai.local

# 4. Verify environment
echo "Deploying to: $ENVIRONMENT environment"
echo "Bucket type: $BUCKET_TYPE"
echo "Profile: $AWS_PROFILE"

# 5. Deploy
npx cdk deploy

# 6. Optional: Check what changed
npx cdk diff  # Before deploying

# 7. Optional: Destroy when done (dev only)
npx cdk destroy
```

## 🔄 Complete Example Flow

### Scenario: Deploy Media Bucket to Development

```bash
# Terminal Session Example:

$ aws sso login --profile k9classroom-prod-profile
# Opens browser for authentication
# ✓ Successfully logged in to k9classroom

$ source .env.karoospitbraai.local

$ echo $ENVIRONMENT
dev

$ npx cdk deploy
# Synthesizing...
# ✓ media-storage-bucket-dev (BucketXXXX)
#
# Outputs:
# media-storage-bucket-dev.StorageBucketName = media-storage-dev-20260302-111111
# media-storage-bucket-dev.StorageBucketArn = arn:aws:s3:::media-storage-dev-20260302-111111
#
# ✓ Deployment successful!
```

## 🔍 Troubleshooting

### "The token has expired"

```bash
# Just login again
aws sso login --profile k9classroom-prod-profile
```

### "Unknown profile"

```bash
# List your profiles
aws configure list-profiles

# If missing, check ~/.aws/config
cat ~/.aws/config
```

### "Access Denied"

```bash
# Verify you're using the right account
aws sts get-caller-identity --profile k9classroom-prod-profile

# Should show:
# Account: 967420867661
# UserId: ...
# Arn: ...
```

### "Session has expired"

```bash
# Logout and login again
aws sso logout --profile k9classroom-prod-profile
aws sso login --profile k9classroom-prod-profile
```

## 📁 Files You're Using

### `.env.karoospitbraai.local`

- ✅ Your custom environment file
- Contains: AWS_PROFILE, account ID, region, and deployment settings
- **Keep this file out of git** (it's in .gitignore)

### `.env.example`

- Template for basic setup
- Good for understanding all options

### `.env.sso`

- New SSO-specific template
- Pre-configured with better comments
- Copy and customize for your needs

## 🎯 Best Practices

1. **✅ Always logout when done** (on shared machines)

   ```bash
   aws sso logout --profile k9classroom-prod-profile
   ```

2. **✅ Check token expiration**

   ```bash
   aws sso login --profile k9classroom-prod-profile
   aws sts get-caller-identity
   ```

3. **✅ Use environment-specific profiles**

   ```bash
   # Different profiles for dev/staging/prod
   aws sso login --profile k9classroom-dev-profile
   aws sso login --profile k9classroom-staging-profile
   aws sso login --profile k9classroom-prod-profile
   ```

4. **✅ Keep .env files secure**
   - Never commit to git
   - Different files per environment
   - Rotate credentials periodically

## 🚗 Faster Deployment Script

Create a file `deploy-quick.sh`:

```bash
#!/bin/bash
set -e

PROFILE=${1:-k9classroom-prod-profile}
ENV=${2:-dev}
TYPE=${3:-media}

echo "🔐 Logging in with SSO..."
aws sso login --profile $PROFILE

echo "📋 Loading environment..."
source .env.karoospitbraai.local

echo "🚀 Deploying $TYPE bucket to $ENV..."
npx cdk deploy \
  -c environment=$ENV \
  -c bucketType=$TYPE \
  --require-approval never

echo "✅ Deployment complete!"
```

Then run:

```bash
chmod +x deploy-quick.sh
./deploy-quick.sh k9classroom-prod-profile dev media
```

## 📚 More Information

See the detailed guides:

- [docs/AWS_SSO_SETUP.md](../docs/AWS_SSO_SETUP.md) - Detailed SSO configuration
- [docs/ENVIRONMENT_VARIABLES.md](../docs/ENVIRONMENT_VARIABLES.md) - All environment options
- [README.md](../README.md) - Full project documentation

---

## TL;DR - Just Do This

```bash
# 1. Login
aws sso login --profile k9classroom-prod-profile

# 2. Load environment
source .env.karoospitbraai.local

# 3. Deploy
npx cdk deploy

# Done! ✅
```

**Your setup is correct. You're good to go!** 🎉
