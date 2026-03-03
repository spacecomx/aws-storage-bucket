#!/bin/bash

###############################################################################
# Deploy Imgx Storage Bucket with IAM Access Control
#
# This script deploys an S3 bucket configured for Imgx image processing
# with IAM users, groups, and appropriate permissions.
#
# Usage:
#   ./scripts/deploy-imgx-bucket.sh [environment] [region]
#
# Examples:
#   ./scripts/deploy-imgx-bucket.sh production us-east-1
#   ./scripts/deploy-imgx-bucket.sh dev us-west-2
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${1:-production}"
REGION="${2:-us-east-1}"
BUCKET_NAME="imgx-media-storage-${ENVIRONMENT}"
STACK_NAME="ImgxStorageBucket-${ENVIRONMENT}"

echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}  Imgx Storage Bucket Deployment${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Environment: ${GREEN}${ENVIRONMENT}${NC}"
echo -e "  Region:      ${GREEN}${REGION}${NC}"
echo -e "  Bucket:      ${GREEN}${BUCKET_NAME}${NC}"
echo -e "  Stack:       ${GREEN}${STACK_NAME}${NC}"
echo ""

# Verify AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured.${NC}"
    echo -e "${YELLOW}Please configure AWS credentials:${NC}"
    echo "  export AWS_PROFILE=your-profile"
    echo "  or"
    echo "  export AWS_ACCESS_KEY_ID=your-key-id"
    echo "  export AWS_SECRET_ACCESS_KEY=your-secret-key"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✓ Using AWS Account: ${ACCOUNT_ID}${NC}"
echo ""

# Set environment variables for CDK
export CDK_DEFAULT_ACCOUNT="${ACCOUNT_ID}"
export CDK_DEFAULT_REGION="${REGION}"
export ENVIRONMENT="${ENVIRONMENT}"
export BUCKET_NAME="${BUCKET_NAME}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    pnpm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
fi

# Build the project
echo -e "${YELLOW}Building project...${NC}"
pnpm build
echo -e "${GREEN}✓ Project built successfully${NC}"
echo ""

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
if ! pnpm test; then
    echo -e "${RED}Error: Tests failed. Fix issues before deploying.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All tests passed${NC}"
echo ""

# Bootstrap CDK if needed
echo -e "${YELLOW}Checking CDK bootstrap...${NC}"
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region "${REGION}" &> /dev/null; then
    echo -e "${YELLOW}CDK not bootstrapped in ${REGION}. Bootstrapping now...${NC}"
    npx cdk bootstrap aws://${ACCOUNT_ID}/${REGION}
    echo -e "${GREEN}✓ CDK bootstrapped${NC}"
else
    echo -e "${GREEN}✓ CDK already bootstrapped${NC}"
fi
echo ""

# Synthesize CloudFormation template
echo -e "${YELLOW}Synthesizing CloudFormation template...${NC}"
npx cdk synth --app "npx ts-node bin/examples/deploy-imgx-bucket.ts" \
    -c environment="${ENVIRONMENT}" \
    -c bucketName="${BUCKET_NAME}" \
    "${STACK_NAME}" > /dev/null
echo -e "${GREEN}✓ Template synthesized${NC}"
echo ""

# Show what will be deployed
echo -e "${YELLOW}Reviewing changes...${NC}"
npx cdk diff --app "npx ts-node bin/examples/deploy-imgx-bucket.ts" \
    -c environment="${ENVIRONMENT}" \
    -c bucketName="${BUCKET_NAME}" \
    "${STACK_NAME}" || true
echo ""

# Confirm deployment
if [ "${ENVIRONMENT}" == "production" ]; then
    echo -e "${RED}WARNING: You are about to deploy to PRODUCTION!${NC}"
    echo -e "${YELLOW}This will create IAM users with access keys.${NC}"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    if [ "${CONFIRM}" != "yes" ]; then
        echo -e "${YELLOW}Deployment cancelled.${NC}"
        exit 0
    fi
fi
echo ""

# Deploy the stack
echo -e "${YELLOW}Deploying stack...${NC}"
echo -e "${BLUE}This may take a few minutes...${NC}"
echo ""

npx cdk deploy --app "npx ts-node bin/examples/deploy-imgx-bucket.ts" \
    -c environment="${ENVIRONMENT}" \
    -c bucketName="${BUCKET_NAME}" \
    -c owner="media-team" \
    -c costCenter="media-processing" \
    "${STACK_NAME}" \
    --require-approval never \
    --outputs-file "outputs-${ENVIRONMENT}.json"

echo ""
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo -e "${YELLOW}Stack Outputs:${NC}"
cat "outputs-${ENVIRONMENT}.json"
echo ""

# Extract and display important outputs
echo -e "${YELLOW}Important Information:${NC}"
echo ""
echo -e "${GREEN}Bucket Name:${NC}"
aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`StorageBucketName`].OutputValue' \
    --output text || echo "  Not available yet"

echo ""
echo -e "${GREEN}IAM User:${NC}"
aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?contains(OutputKey,`UserName`)].OutputValue' \
    --output text || echo "  Not available yet"

echo ""
echo -e "${GREEN}IAM Group:${NC}"
aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?contains(OutputKey,`GroupName`)].OutputValue' \
    --output text || echo "  Not available yet"

echo ""
echo -e "${RED}⚠️  SECURITY NOTICE:${NC}"
echo -e "${YELLOW}Access keys have been created and stored in CloudFormation outputs.${NC}"
echo -e "${YELLOW}Retrieve them with:${NC}"
echo ""
echo "  aws cloudformation describe-stacks \\"
echo "    --stack-name ${STACK_NAME} \\"
echo "    --region ${REGION} \\"
echo "    --query 'Stacks[0].Outputs'"
echo ""
echo -e "${RED}Store these credentials securely (AWS Secrets Manager recommended)!${NC}"
echo ""

# Save deployment info
DEPLOYMENT_INFO="deployment-info-${ENVIRONMENT}.txt"
cat > "${DEPLOYMENT_INFO}" << EOF
Imgx Storage Bucket Deployment
==============================

Environment:    ${ENVIRONMENT}
Region:         ${REGION}
Bucket Name:    ${BUCKET_NAME}
Stack Name:     ${STACK_NAME}
Account ID:     ${ACCOUNT_ID}
Deployed At:    $(date)
Deployed By:    $(aws sts get-caller-identity --query Arn --output text)

Next Steps:
-----------
1. Retrieve access keys from CloudFormation outputs
2. Store credentials in AWS Secrets Manager
3. Configure Imgx with the credentials
4. Test access with sample upload/download
5. Monitor CloudWatch dashboard: ${BUCKET_NAME}-metrics

Documentation:
--------------
- IAM Access Control: docs/IAM_ACCESS_CONTROL.md
- Configuration: config/imgx-bucket.config.ts
- Example Code: bin/examples/deploy-imgx-bucket.ts
EOF

echo -e "${GREEN}✓ Deployment info saved to: ${DEPLOYMENT_INFO}${NC}"
echo ""
echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}  Next Steps${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""
echo "1. Retrieve and securely store access keys"
echo "2. Configure Imgx with the credentials"
echo "3. Test access with sample operations"
echo "4. Monitor CloudWatch dashboard"
echo "5. Review S3 access logs"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
