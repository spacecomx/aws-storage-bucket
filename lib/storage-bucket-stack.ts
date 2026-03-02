import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  StorageBucketConfig,
  documentStorageConfig,
  getRemovalPolicy,
  logStorageConfig,
  mediaStorageConfig,
} from "../config/storage-bucket.config";
import { BucketEventNotification } from "./constructs/bucket-event-notification";
import { BucketMonitoring } from "./constructs/bucket-monitoring";
import { BucketPolicy } from "./constructs/bucket-policy";
import { StorageBucket } from "./constructs/storage-bucket";

export interface StorageBucketStackProps extends cdk.StackProps {
  /**
   * Optional bucket name. If not provided, a name will be generated.
   */
  bucketName?: string;

  /**
   * Type of storage bucket to create
   * @default 'media'
   */
  bucketType?: "media" | "document" | "log" | "custom";

  /**
   * Custom configuration for the bucket (required if bucketType is 'custom')
   */
  customConfig?: StorageBucketConfig;

  /**
   * Stack description
   */
  description?: string;

  /**
   * Environment for deployment. Recommended for production use.
   */
  env?: cdk.Environment;

  /**
   * Environment context variable to determine the removal policy
   * @default 'dev'
   */
  environment?: string;
}

export class StorageBucketStack extends cdk.Stack {
  /**
   * The storage bucket construct
   */
  public readonly storageBucket: StorageBucket;

  /**
   * The bucket monitoring construct (if enabled)
   */
  public readonly monitoring?: BucketMonitoring;

  /**
   * The event notification construct (if enabled)
   */
  public readonly eventNotification?: BucketEventNotification;

  constructor(scope: Construct, id: string, props?: StorageBucketStackProps) {
    super(scope, id, {
      ...props,
      description:
        props?.description ||
        `S3 bucket for ${props?.bucketType || "media"} storage with intelligent tiering`,
    });

    // Get bucket configuration
    const config = this.getBucketConfig(props);

    // Create storage resources
    this.storageBucket = this.createStorageBucket(config, props);
    this.applyBucketPolicies(this.storageBucket);

    // Create monitoring if enabled
    if (config.enableMonitoring) {
      this.monitoring = new BucketMonitoring(this, "Monitoring", {
        bucket: this.storageBucket.bucket,
        enabled: true,
      });
    }

    // Create event notifications if enabled
    if (config.enableEventNotifications) {
      this.eventNotification = new BucketEventNotification(
        this,
        "EventNotification",
        {
          bucket: this.storageBucket.bucket,
          enabled: true,
        },
      );
    }

    this.defineOutputs(this.storageBucket);
  }

  /**
   * Get the appropriate bucket configuration based on bucket type
   */
  private getBucketConfig(
    props?: StorageBucketStackProps,
  ): StorageBucketConfig {
    // Determine which configuration to use based on bucket type
    let config: StorageBucketConfig;
    switch (props?.bucketType || "media") {
      case "document":
        config = documentStorageConfig;
        break;
      case "log":
        config = logStorageConfig;
        break;
      case "custom":
        if (!props?.customConfig) {
          throw new Error(
            'customConfig is required when bucketType is "custom"',
          );
        }
        config = props.customConfig;
        break;
      case "media":
      default:
        config = mediaStorageConfig;
        break;
    }

    // Set the removal policy based on environment
    config.removalPolicy = getRemovalPolicy(props?.environment || "dev");

    return config;
  }

  /**
   * Create the storage bucket with the selected configuration
   */
  private createStorageBucket(
    config: StorageBucketConfig,
    props?: StorageBucketStackProps,
  ): StorageBucket {
    return new StorageBucket(this, "Storage", {
      config,
      bucketName: props?.bucketName || this.node.tryGetContext("bucketName"),
    });
  }

  /**
   * Apply security policies to the bucket
   */
  private applyBucketPolicies(storageBucket: StorageBucket): BucketPolicy {
    return new BucketPolicy(this, "StorageBucketPolicy", {
      bucket: storageBucket.bucket,
    });
  }

  /**
   * Define CloudFormation outputs
   */
  private defineOutputs(storageBucket: StorageBucket): void {
    new cdk.CfnOutput(this, "StorageBucketName", {
      value: storageBucket.bucket.bucketName,
      description: "Name of the storage bucket",
      exportName: `${this.stackName}-BucketName`,
    });

    new cdk.CfnOutput(this, "StorageBucketArn", {
      value: storageBucket.bucket.bucketArn,
      description: "ARN of the storage bucket",
      exportName: `${this.stackName}-BucketArn`,
    });
  }
}
