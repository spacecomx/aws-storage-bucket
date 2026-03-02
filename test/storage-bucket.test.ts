import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
  documentStorageConfig,
  logStorageConfig,
  mediaStorageConfig,
} from "../config/storage-bucket.config";
import { StorageBucketStack } from "../lib/storage-bucket-stack";

describe("StorageBucketStack", () => {
  test("Media Bucket Created with Correct Configuration", () => {
    // GIVEN
    const app = new cdk.App();

    // WHEN
    const stack = new StorageBucketStack(app, "TestMediaBucketStack", {
      bucketType: "media",
    });

    // THEN
    const template = Template.fromStack(stack);

    // Verify bucket creation (main bucket + access log bucket + monitoring resources)
    template.resourceCountIs("AWS::S3::Bucket", 2); // Main bucket and log bucket

    // Verify bucket properties for media type
    template.hasResourceProperties("AWS::S3::Bucket", {
      VersioningConfiguration: {
        Status: "Enabled",
      },
      IntelligentTieringConfigurations: [
        {
          Id: "archive-infrequent-access",
          Status: "Enabled",
          Tierings: [
            {
              AccessTier: "ARCHIVE_ACCESS",
              Days: mediaStorageConfig.intelligentTiering
                ?.archiveAccessTierDays,
            },
            {
              AccessTier: "DEEP_ARCHIVE_ACCESS",
              Days: mediaStorageConfig.intelligentTiering
                ?.deepArchiveAccessTierDays,
            },
          ],
        },
      ],
    });
  });

  test("Document Bucket Created with Correct Configuration", () => {
    // GIVEN
    const app = new cdk.App();

    // WHEN
    const stack = new StorageBucketStack(app, "TestDocumentBucketStack", {
      bucketType: "document",
    });

    // THEN
    const template = Template.fromStack(stack);

    // Verify bucket properties for document type
    template.hasResourceProperties("AWS::S3::Bucket", {
      IntelligentTieringConfigurations: [
        {
          Tierings: [
            {
              AccessTier: "ARCHIVE_ACCESS",
              Days: documentStorageConfig.intelligentTiering
                ?.archiveAccessTierDays,
            },
            {
              AccessTier: "DEEP_ARCHIVE_ACCESS",
              Days: documentStorageConfig.intelligentTiering
                ?.deepArchiveAccessTierDays,
            },
          ],
        },
      ],
    });
  });

  test("Log Bucket Created with Correct Configuration", () => {
    // GIVEN
    const app = new cdk.App();

    // WHEN
    const stack = new StorageBucketStack(app, "TestLogBucketStack", {
      bucketType: "log",
    });

    // THEN
    const template = Template.fromStack(stack);

    // Verify bucket properties for log type
    template.hasResourceProperties("AWS::S3::Bucket", {
      IntelligentTieringConfigurations: [
        {
          Tierings: [
            {
              AccessTier: "ARCHIVE_ACCESS",
              Days: logStorageConfig.intelligentTiering?.archiveAccessTierDays,
            },
            {
              AccessTier: "DEEP_ARCHIVE_ACCESS",
              Days: logStorageConfig.intelligentTiering
                ?.deepArchiveAccessTierDays,
            },
          ],
        },
      ],
    });
  });

  test("Bucket Uses RETAIN Removal Policy in Production Environment", () => {
    // GIVEN
    const app = new cdk.App();

    // WHEN
    const stack = new StorageBucketStack(app, "TestProductionBucketStack", {
      bucketType: "media",
      environment: "production",
    });

    // THEN
    const template = Template.fromStack(stack);

    // Verify bucket has RETAIN deletion policy (which means no DeletionPolicy property in the template)
    template.hasResource("AWS::S3::Bucket", {
      DeletionPolicy: "Retain",
      UpdateReplacePolicy: "Retain",
    });

    // Verify AutoDeleteObjects is not set to true
    const bucketResources = template.findResources("AWS::S3::Bucket");
    const bucketLogicalId = Object.keys(bucketResources)[0];
    const bucketResource = bucketResources[bucketLogicalId];
    expect(bucketResource.Properties.AutoDeleteObjects).toBeUndefined();

    // Make sure there's no Lambda for auto-deletion
    template.resourceCountIs("AWS::Lambda::Function", 0);
  });
});
