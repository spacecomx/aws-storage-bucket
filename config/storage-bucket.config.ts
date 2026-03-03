import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";

/**
 * Access level for S3 bucket permissions
 */
export enum BucketAccessLevel {
  READ_ONLY = "READ_ONLY",
  READ_WRITE = "READ_WRITE",
  FULL = "FULL",
}

/**
 * IAM access configuration for a bucket user/group
 */
export interface IAMAccessConfig {
  /**
   * Name of the IAM user to create
   */
  userName: string;

  /**
   * Name of the IAM group to create
   */
  groupName: string;

  /**
   * Access level for the bucket
   * @default BucketAccessLevel.READ_WRITE
   */
  accessLevel?: BucketAccessLevel;

  /**
   * Whether to create access keys for programmatic access
   * @default false
   */
  createAccessKeys?: boolean;

  /**
   * Additional IAM policy statements
   */
  additionalPolicyStatements?: iam.PolicyStatement[];

  /**
   * Allowed object prefixes (paths) within the bucket
   * @example ['images/', 'thumbnails/']
   */
  allowedPrefixes?: string[];

  /**
   * Tags for IAM resources
   */
  tags?: Record<string, string>;
}

/**
 * Configuration interface for storage bucket settings
 */
export interface StorageBucketConfig {
  /**
   * Name of the bucket (optional, will be auto-generated if not provided)
   */
  bucketName?: string;

  /**
   * Removal policy for the bucket
   * @default RemovalPolicy.RETAIN for production, RemovalPolicy.DESTROY otherwise
   */
  removalPolicy?: cdk.RemovalPolicy;

  /**
   * Enable versioning for the bucket
   * @default true
   */
  versioned?: boolean;

  /**
   * Enable server-side encryption
   * @default true
   */
  encrypted?: boolean;

  /**
   * Enable S3 access logging
   * @default true for production
   */
  enableAccessLogging?: boolean;

  /**
   * Enable CloudWatch monitoring and alarms
   * @default true for production
   */
  enableMonitoring?: boolean;

  /**
   * Enable EventBridge notifications for bucket events
   * @default false
   */
  enableEventNotifications?: boolean;

  /**
   * IAM access control configurations
   * Define users, groups, and permissions for bucket access
   * @default []
   */
  accessControl?: IAMAccessConfig[];

  /**
   * Intelligent tiering configuration
   */
  intelligentTiering?: {
    /**
     * Enable intelligent tiering
     * @default true
     */
    enabled: boolean;

    /**
     * Days after which objects are moved to archive access tier
     * @default 90
     */
    archiveAccessTierDays: number;

    /**
     * Days after which objects are moved to deep archive access tier
     * @default 180
     */
    deepArchiveAccessTierDays: number;
  };

  /**
   * Lifecycle rules configuration
   */
  lifecycle?: {
    /**
     * Days after which objects are transitioned to intelligent tiering
     * @default 30
     */
    transitionToIntelligentTieringDays: number;

    /**
     * Days after which noncurrent versions expire
     * @default 90
     */
    noncurrentVersionExpirationDays: number;
  };
}

/**
 * Default configuration for media storage bucket
 */
export const mediaStorageConfig: StorageBucketConfig = {
  versioned: true,
  encrypted: true,
  enableAccessLogging: true,
  enableMonitoring: true,
  enableEventNotifications: false,
  intelligentTiering: {
    enabled: true,
    archiveAccessTierDays: 90,
    deepArchiveAccessTierDays: 180,
  },
  lifecycle: {
    transitionToIntelligentTieringDays: 30,
    noncurrentVersionExpirationDays: 90,
  },
};

/**
 * Default configuration for document storage bucket
 */
export const documentStorageConfig: StorageBucketConfig = {
  versioned: true,
  encrypted: true,
  enableAccessLogging: true,
  enableMonitoring: true,
  enableEventNotifications: false,
  intelligentTiering: {
    enabled: true,
    archiveAccessTierDays: 90, // Minimum required by AWS
    deepArchiveAccessTierDays: 180,
  },
  lifecycle: {
    transitionToIntelligentTieringDays: 15,
    noncurrentVersionExpirationDays: 60,
  },
};

/**
 * Default configuration for log storage bucket
 */
export const logStorageConfig: StorageBucketConfig = {
  versioned: false,
  encrypted: true,
  enableAccessLogging: false, // Log buckets shouldn't log to themselves
  enableMonitoring: true,
  enableEventNotifications: false,
  intelligentTiering: {
    enabled: true,
    archiveAccessTierDays: 90, // Minimum required by AWS
    deepArchiveAccessTierDays: 180,
  },
  lifecycle: {
    transitionToIntelligentTieringDays: 7,
    noncurrentVersionExpirationDays: 30,
  },
};

/**
 * Get the appropriate removal policy based on environment
 * @param environment The deployment environment
 * @returns The appropriate removal policy
 */
export function getRemovalPolicy(environment?: string): cdk.RemovalPolicy {
  const isProd = environment?.toLowerCase().includes("prod") ?? false;
  return isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
}
