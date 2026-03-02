#!/bin/bash

###############################################################################
# AWS Storage Bucket Deployment Script
# 
# This script demonstrates how to deploy the storage bucket stack using
# environment variables for different scenarios.
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check CDK
    if ! command -v cdk &> /dev/null; then
        print_error "AWS CDK is not installed. Run 'npm install -g aws-cdk'"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured properly."
        exit 1
    fi
    
    print_info "✓ All prerequisites met"
}

# Function to deploy to a specific environment
deploy_to_environment() {
    local ENVIRONMENT=$1
    local BUCKET_TYPE=${2:-media}
    local OWNER=${3:-platform-team}
    
    print_info "Deploying ${BUCKET_TYPE} bucket to ${ENVIRONMENT} environment..."
    
    # Set environment-specific variables
    case $ENVIRONMENT in
        dev)
            AWS_PROFILE="dev"
            CDK_DEFAULT_REGION="us-east-1"
            ;;
        staging)
            AWS_PROFILE="staging"
            CDK_DEFAULT_REGION="us-east-1"
            ;;
        production)
            AWS_PROFILE="production"
            CDK_DEFAULT_REGION="us-east-1"
            print_warn "Deploying to PRODUCTION - this will use RETAIN removal policy"
            read -p "Are you sure you want to continue? (yes/no): " confirm
            if [[ $confirm != "yes" ]]; then
                print_info "Deployment cancelled"
                exit 0
            fi
            ;;
        *)
            print_error "Unknown environment: $ENVIRONMENT"
            exit 1
            ;;
    esac
    
    # Export environment variables
    export AWS_PROFILE
    export CDK_DEFAULT_REGION
    
    # Deploy the stack
    npx cdk deploy \
        -c environment="$ENVIRONMENT" \
        -c bucketType="$BUCKET_TYPE" \
        -c owner="$OWNER" \
        -c costCenter="${COST_CENTER:-engineering}" \
        --require-approval never
    
    print_info "✓ Successfully deployed to $ENVIRONMENT"
}

# Function to show stack information
show_stack_info() {
    print_info "Current AWS Account:"
    aws sts get-caller-identity
    
    print_info "\nAvailable CDK Stacks:"
    npx cdk list
}

# Function to synthesize CloudFormation template
synthesize_template() {
    local ENVIRONMENT=${1:-dev}
    local BUCKET_TYPE=${2:-media}
    
    print_info "Synthesizing CloudFormation template..."
    
    npx cdk synth \
        -c environment="$ENVIRONMENT" \
        -c bucketType="$BUCKET_TYPE" \
        > "template-${ENVIRONMENT}-${BUCKET_TYPE}.yaml"
    
    print_info "✓ Template saved to template-${ENVIRONMENT}-${BUCKET_TYPE}.yaml"
}

# Function to show differences
show_diff() {
    local ENVIRONMENT=${1:-dev}
    local BUCKET_TYPE=${2:-media}
    
    print_info "Showing differences for $ENVIRONMENT environment..."
    
    npx cdk diff \
        -c environment="$ENVIRONMENT" \
        -c bucketType="$BUCKET_TYPE"
}

# Function to destroy stack (with confirmation)
destroy_stack() {
    local ENVIRONMENT=$1
    
    print_warn "⚠️  DESTROY operation - This will DELETE the stack!"
    print_warn "Environment: $ENVIRONMENT"
    read -p "Type 'destroy' to confirm: " confirm
    
    if [[ $confirm != "destroy" ]]; then
        print_info "Destroy cancelled"
        exit 0
    fi
    
    case $ENVIRONMENT in
        production)
            print_error "Cannot destroy production stack via this script. Use AWS Console for safety."
            exit 1
            ;;
    esac
    
    print_info "Destroying stack in $ENVIRONMENT..."
    npx cdk destroy \
        -c environment="$ENVIRONMENT" \
        --force
    
    print_info "✓ Stack destroyed"
}

# Main menu
show_menu() {
    echo ""
    echo "╔═══════════════════════════════════════════════════╗"
    echo "║   AWS Storage Bucket Deployment Script          ║"
    echo "╚═══════════════════════════════════════════════════╝"
    echo ""
    echo "1) Deploy to Development"
    echo "2) Deploy to Staging"
    echo "3) Deploy to Production"
    echo "4) Show Stack Info"
    echo "5) Synthesize Template"
    echo "6) Show Diff"
    echo "7) Destroy Stack"
    echo "8) Run Tests"
    echo "9) Exit"
    echo ""
}

# Main script execution
main() {
    check_prerequisites
    
    # If arguments provided, execute directly
    if [ $# -gt 0 ]; then
        case $1 in
            deploy)
                deploy_to_environment "${2:-dev}" "${3:-media}" "${4:-platform-team}"
                ;;
            info)
                show_stack_info
                ;;
            synth)
                synthesize_template "${2:-dev}" "${3:-media}"
                ;;
            diff)
                show_diff "${2:-dev}" "${3:-media}"
                ;;
            destroy)
                destroy_stack "${2:-dev}"
                ;;
            test)
                print_info "Running tests..."
                pnpm test
                ;;
            *)
                echo "Usage: $0 {deploy|info|synth|diff|destroy|test} [environment] [bucket-type] [owner]"
                exit 1
                ;;
        esac
        exit 0
    fi
    
    # Interactive mode
    while true; do
        show_menu
        read -p "Select an option: " choice
        
        case $choice in
            1)
                deploy_to_environment "dev" "media" "platform-team"
                ;;
            2)
                deploy_to_environment "staging" "media" "platform-team"
                ;;
            3)
                deploy_to_environment "production" "media" "platform-team"
                ;;
            4)
                show_stack_info
                ;;
            5)
                read -p "Environment (dev/staging/production): " env
                read -p "Bucket type (media/document/log): " type
                synthesize_template "$env" "$type"
                ;;
            6)
                read -p "Environment (dev/staging/production): " env
                read -p "Bucket type (media/document/log): " type
                show_diff "$env" "$type"
                ;;
            7)
                read -p "Environment (dev/staging): " env
                destroy_stack "$env"
                ;;
            8)
                print_info "Running tests..."
                pnpm test
                ;;
            9)
                print_info "Exiting..."
                exit 0
                ;;
            *)
                print_error "Invalid option. Please try again."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@"
