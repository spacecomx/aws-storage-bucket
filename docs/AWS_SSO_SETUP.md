# AWS SSO Setup & Usage Guide

This guide explains how to properly use AWS SSO with the AWS Storage Bucket CDK project.

## ✅ Your Approach is Correct

Manual SSO login is the **recommended** way to authenticate with AWS SSO:

```bash
# Step 1: Log in with SSO (you already did this)
aws sso login --profile k9classroom-prod-profile

# Step 2: Load your environment file
source .env.karoospitbraai.local

# Step 3: Deploy with CDK
npx cdk deploy
```

## 🔐 Understanding AWS SSO vs Access Keys

| Feature                 | SSO                  | Access Keys |
| ----------------------- | -------------------- | ----------- |
| **Security**            | ⭐⭐⭐⭐⭐ Better    | ⭐⭐⭐      |
| **Automatic Refresh**   | ✅ Yes               | ❌ Manual   |
| **Session Duration**    | Configurable (1-12h) | Unlimited   |
| **Credential Rotation** | ✅ Automatic         | ❌ Manual   |
| **Best Practice**       | ✅ Recommended       | ⚠️ Legacy   |
| **Setup Complexity**    | Medium               | Easy        |

**SSO is the modern, more secure approach** - you're using the right method!

## 📋 AWS SSO Prerequisites

### 1. Configure AWS SSO Profile

Your AWS CLI should have SSO configured in `~/.aws/config`:

```bash
# View your config
cat ~/.aws/config

# Should look like:
# [profile k9classroom-prod-profile]
# sso_session = k9classroom
# sso_account_id = 967420867661
# sso_role_name = DevOpsRole
# region = us-east-1
#
# [sso-session k9classroom]
# sso_start_url = https://your-org.awsapps.com/start
# sso_region = us-east-1
# sso_registration_scopes = sso:account:access
```

### 2. Configure AWS SSO Session

You should have SSO session configured. To set it up from scratch:

```bash
aws configure sso
# Follow the prompts:
# - SSO session name: k9classroom
# - SSO start URL: https://your-org.awsapps.com/start
# - SSO region: us-east-1
# - Account ID: 967420867661
# - Role name: DevOpsRole
# - Region: us-east-1
# - Profile name: k9classroom-prod-profile
```

## 🔑 Complete SSO Workflow

### Step 1: Initial Setup (One-time)

```bash
# Configure SSO profile
aws configure sso

# Verify the profile was created
aws sts get-caller-identity --profile k9classroom-prod-profile
# Error is expected here until you login
```

### Step 2: Login Before Each Use Session

```bash
# Login with SSO (valid for 4-12 hours depending on configuration)
aws sso login --profile k9classroom-prod-profile

# Verify successful login
aws sts get-caller-identity --profile k9classroom-prod-profile
# Output should show your AWS account info
```

### Step 3: Load Environment & Deploy

```bash
# Load your environment configuration
source .env.karoospitbraai.local

# Verify environment is set
echo "Profile: $AWS_PROFILE"
echo "Account: $CDK_DEFAULT_ACCOUNT"
echo "Region: $CDK_DEFAULT_REGION"

# Deploy your CDK stack
npx cdk deploy -c environment=$ENVIRONMENT -c bucketType=$BUCKET_TYPE

# Or just use the deployment script
./scripts/deploy.sh
```

## 🚀 Using .env.karoospitbraai.local Correctly

Your `.env.karoospitbraai.local` file is configured correctly:

```bash
# Current configuration (good!)
AWS_PROFILE=k9classroom-prod-profile
AWS_DEFAULT_REGION=us-east-1
CDK_DEFAULT_ACCOUNT=967420867661
CDK_DEFAULT_REGION=us-east-1
ENVIRONMENT=dev
BUCKET_TYPE=media
OWNER=platform-team
```

### Preferred Usage Method

```bash
# Method 1: Load .env file and use default deployment
source .env.karoospitbraai.local
npx cdk deploy

# Method 2: Load .env file and override specific values
source .env.karoospitbraai.local
npx cdk deploy \
  -c environment=staging \
  -c bucketType=document

# Method 3: Use with deployment script
source .env.karoospitbraai.local
./scripts/deploy.sh

# Method 4: Export variables in one command
$(cat .env.karoospitbraai.local | xargs) npx cdk deploy
```

## 🔄 Daily Workflow with SSO

Here's the recommended daily workflow:

```bash
# 1. Login at the start of your session (if not already logged in)
aws sso login --profile k9classroom-prod-profile

# 2. Verify you're logged in
aws sts get-caller-identity --profile k9classroom-prod-profile
# Should show your account info

# 3. Load environment variables
source .env.karoospitbraai.local

# 4. Deploy or manage your stacks
npx cdk deploy
npx cdk diff
npx cdk destroy

# 5. Create deployment script for automation
cat > deploy-prod.sh << 'EOF'
#!/bin/bash
set -e

# Login if needed
aws sso login --profile k9classroom-prod-profile

# Load environment
source .env.karoospitbraai.local

# Deploy
npx cdk deploy -c environment=$ENVIRONMENT -c bucketType=$BUCKET_TYPE

echo "✓ Deployment complete!"
EOF

chmod +x deploy-prod.sh
./deploy-prod.sh
```

## 🔐 Security Guidelines

### ✅ DO:

- ✅ Use `aws sso login` for authentication
- ✅ Let AWS manage credential refresh automatically
- ✅ Use SSO profiles instead of access keys
- ✅ Set proper IAM permissions at the SSO role level
- ✅ Keep `.env` files in `.gitignore`
- ✅ Use separate profiles for dev/staging/production

### ❌ DON'T:

- ❌ Hard-code AWS credentials in `.env` files
- ❌ Commit `.env` files to version control
- ❌ Use legacy access keys if SSO is available
- ❌ Share AWS credentials across teams
- ❌ Use root account credentials
- ❌ Keep SSO credentials in plain text files

## 🆘 Troubleshooting SSO

### Check SSO Configuration

```bash
# Verify SSO profile exists
aws configure list --profile k9classroom-prod-profile

# Check SSO config file
cat ~/.aws/config | grep -A 5 "k9classroom-prod-profile"

# Check credentials are cached
ls -la ~/.aws/sso/cache/
```

### Fix: Expired SSO Credentials

```bash
# If you get "Token has expired"
aws sso login --profile k9classroom-prod-profile

# Or force re-login
aws sso logout --profile k9classroom-prod-profile
aws sso login --profile k9classroom-prod-profile
```

### Fix: Profile Not Found

```bash
# Verify the profile name
aws configure list-profiles

# If not listed, reconfigure
aws configure sso
```

### Fix: Wrong Account/Role

```bash
# Verify current identity
aws sts get-caller-identity --profile k9classroom-prod-profile

# If wrong account, update ~/.aws/config
# Ensure sso_account_id and sso_role_name are correct
```

## 📊 Complete SSO Setup Checklist

- [ ] AWS SSO is configured in your organization
- [ ] You know your SSO start URL
- [ ] You have `.aws/config` configured with SSO profile
- [ ] You can run `aws sso login --profile k9classroom-prod-profile`
- [ ] `aws sts get-caller-identity --profile k9classroom-prod-profile` returns your account info
- [ ] `.env.karoospitbraai.local` has correct AWS_PROFILE value
- [ ] `.gitignore` includes `.env*` files
- [ ] You understand token expiration (typically 4-12 hours)
- [ ] You have tested `npx cdk deploy` with the profile

## 🚀 Quick Reference Commands

```bash
# Check if logged in
aws sts get-caller-identity --profile k9classroom-prod-profile

# Login
aws sso login --profile k9classroom-prod-profile

# Logout
aws sso logout --profile k9classroom-prod-profile

# Load environment and deploy
source .env.karoospitbraai.local && npx cdk deploy

# Check current AWS credentials being used
aws sts get-caller-identity --profile k9classroom-prod-profile

# List all available profiles
aws configure list-profiles

# Switch between profiles
export AWS_PROFILE=k9classroom-prod-profile
aws sts get-caller-identity

# Deploy with verbose output
source .env.karoospitbraai.local && npx cdk deploy --verbose
```

## 🎯 Summary

Your current approach is **correct**:

1. ✅ You're using SSO (the recommended method)
2. ✅ You manually login with `aws sso login`
3. ✅ You have `.env.karoospitbraai.local` configured correctly
4. ✅ You can now load and deploy

**No changes needed!** Just follow this simple workflow:

```bash
# Every session
aws sso login --profile k9classroom-prod-profile
source .env.karoospitbraai.local
npx cdk deploy
```

## 📚 Related Documentation

- [AWS SSO Documentation](https://docs.aws.amazon.com/singlesignon/)
- [AWS CLI SSO Configuration](https://docs.aws.amazon.com/cli/latest/userguide/sso-configure.html)
- [ENVIRONMENT_VARIABLES.md](../docs/ENVIRONMENT_VARIABLES.md) - Environment variable reference
- [.env.example](../.env.example) - Environment template
