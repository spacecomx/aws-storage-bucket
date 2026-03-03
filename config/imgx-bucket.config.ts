import {
  BucketAccessLevel,
  StorageBucketConfig,
} from "./storage-bucket.config";

/**
 * Configuration for Imgx image processing service
 *
 * This configuration provides:
 * - Read/write access to images/ and thumbnails/ directories
 * - Intelligent tiering for cost optimization
 * - Access logging and monitoring for observability
 * - IAM user and group for programmatic access
 */
export const imgxStorageConfig: StorageBucketConfig = {
  versioned: true,
  encrypted: true,
  enableAccessLogging: true,
  enableMonitoring: true,
  enableEventNotifications: false,

  // IAM Access Control for Imgx
  accessControl: [
    {
      userName: "imgx-api-user",
      groupName: "imgx-s3-access",
      accessLevel: BucketAccessLevel.READ_WRITE,
      createAccessKeys: true,

      // Restrict access to image directories only
      allowedPrefixes: ["images/", "thumbnails/"],

      // Tag for cost tracking and organization
      tags: {
        application: "imgx",
        purpose: "image-processing",
      },
    },
  ],

  // Intelligent tiering for automatic cost optimization
  intelligentTiering: {
    enabled: true,
    archiveAccessTierDays: 90,
    deepArchiveAccessTierDays: 180,
  },

  // Lifecycle policies for long-term storage optimization
  lifecycle: {
    transitionToIntelligentTieringDays: 30,
    noncurrentVersionExpirationDays: 90,
  },
};

/**
 * Read-only configuration for analytics/reporting tools
 */
export const imgxReadOnlyConfig: StorageBucketConfig = {
  ...imgxStorageConfig,
  accessControl: [
    {
      userName: "imgx-readonly-user",
      groupName: "imgx-readonly-group",
      accessLevel: BucketAccessLevel.READ_ONLY,
      createAccessKeys: true,
      tags: {
        application: "imgx-analytics",
        purpose: "reporting",
      },
    },
  ],
};

/**
 * Development configuration with relaxed settings
 */
export const imgxDevConfig: StorageBucketConfig = {
  versioned: false,
  encrypted: true,
  enableAccessLogging: false,
  enableMonitoring: false,
  enableEventNotifications: false,

  accessControl: [
    {
      userName: "imgx-dev-user",
      groupName: "imgx-dev-group",
      accessLevel: BucketAccessLevel.READ_WRITE,
      createAccessKeys: true,
      tags: {
        environment: "development",
        application: "imgx",
      },
    },
  ],

  intelligentTiering: {
    enabled: true,
    archiveAccessTierDays: 90,
    deepArchiveAccessTierDays: 180,
  },

  lifecycle: {
    transitionToIntelligentTieringDays: 7,
    noncurrentVersionExpirationDays: 30,
  },
};
