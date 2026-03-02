import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { StorageBucketConfig } from "../../config/storage-bucket.config";

export interface StorageBucketProps {
  /**
   * Configuration for the storage bucket
   */
  config: StorageBucketConfig;

  /**
   * Optional bucket name override
   */
  bucketName?: string;

  /**
   * Optional access log bucket
   */
  accessLogBucket?: s3.IBucket;
}

/**
 * Construct for a configurable S3 bucket with various storage optimizations
 */
export class StorageBucket extends Construct {
  /**
   * The underlying S3 bucket
   */
  public readonly bucket: s3.Bucket;

  /**
   * Optional access log bucket for this bucket
   */
  public readonly logBucket?: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageBucketProps) {
    super(scope, id);

    const { config } = props;

    // Use provided bucket name or config bucket name
    const bucketName = props.bucketName || config.bucketName;

    // Use provided removal policy or default based on config
    const removalPolicy = config.removalPolicy || cdk.RemovalPolicy.RETAIN;

    // Create access log bucket if logging is enabled
    if (config.enableAccessLogging && !props.accessLogBucket) {
      this.logBucket = new s3.Bucket(this, "LogBucket", {
        bucketName: bucketName ? `${bucketName}-logs` : undefined,
        removalPolicy,
        autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        lifecycleRules: [
          {
            expiration: cdk.Duration.days(90),
            transitions: [
              {
                storageClass: s3.StorageClass.INTELLIGENT_TIERING,
                transitionAfter: cdk.Duration.days(30),
              },
            ],
          },
        ],
      });
    }

    // Create the bucket with the specified configuration
    this.bucket = new s3.Bucket(this, "Bucket", {
      bucketName,
      removalPolicy,
      autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,

      // Security settings
      encryption:
        config.encrypted !== false
          ? s3.BucketEncryption.S3_MANAGED
          : s3.BucketEncryption.UNENCRYPTED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: config.versioned !== false,

      // Access logging
      serverAccessLogsBucket: props.accessLogBucket || this.logBucket,
      serverAccessLogsPrefix: config.enableAccessLogging
        ? "access-logs/"
        : undefined,

      // Enable EventBridge notifications if configured
      eventBridgeEnabled: config.enableEventNotifications || false,

      // Intelligent tiering configuration
      ...(config.intelligentTiering?.enabled !== false && {
        intelligentTieringConfigurations: [
          {
            name: "archive-infrequent-access",
            archiveAccessTierTime: cdk.Duration.days(
              config.intelligentTiering?.archiveAccessTierDays || 90,
            ),
            deepArchiveAccessTierTime: cdk.Duration.days(
              config.intelligentTiering?.deepArchiveAccessTierDays || 180,
            ),
          },
        ],
      }),

      // Lifecycle rules
      ...(config.lifecycle && {
        lifecycleRules: [
          {
            // Transition objects to intelligent tiering
            ...(config.intelligentTiering?.enabled !== false && {
              transitions: [
                {
                  storageClass: s3.StorageClass.INTELLIGENT_TIERING,
                  transitionAfter: cdk.Duration.days(
                    config.lifecycle.transitionToIntelligentTieringDays || 30,
                  ),
                },
              ],
            }),
            // Expire noncurrent versions
            noncurrentVersionExpiration: cdk.Duration.days(
              config.lifecycle.noncurrentVersionExpirationDays || 90,
            ),
          },
        ],
      }),
    });
  }
}
