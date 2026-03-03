import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import {
  BucketAccessLevel,
  StorageBucketConfig,
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

  describe("IAM Access Control Integration", () => {
    test("Creates IAM Resources When Access Control Configured", () => {
      // GIVEN
      const app = new cdk.App();
      const customConfig: StorageBucketConfig = {
        ...mediaStorageConfig,
        accessControl: [
          {
            userName: "test-api-user",
            groupName: "test-api-group",
            accessLevel: BucketAccessLevel.READ_WRITE,
          },
        ],
      };

      // WHEN
      const stack = new StorageBucketStack(app, "TestAccessControlStack", {
        bucketType: "custom",
        customConfig: customConfig,
      });

      // THEN
      const template = Template.fromStack(stack);

      // Verify IAM resources created
      template.resourceCountIs("AWS::IAM::User", 1);
      template.resourceCountIs("AWS::IAM::Group", 1);
      template.resourceCountIs("AWS::IAM::Policy", 1);

      template.hasResourceProperties("AWS::IAM::User", {
        UserName: "test-api-user",
      });

      template.hasResourceProperties("AWS::IAM::Group", {
        GroupName: "test-api-group",
      });
    });

    test("Does Not Create IAM Resources When Access Control Not Configured", () => {
      // GIVEN
      const app = new cdk.App();

      // WHEN
      const stack = new StorageBucketStack(app, "TestNoAccessControlStack", {
        bucketType: "media",
      });

      // THEN
      const template = Template.fromStack(stack);

      // Verify no IAM resources created
      template.resourceCountIs("AWS::IAM::User", 0);
      template.resourceCountIs("AWS::IAM::Group", 0);
      template.resourceCountIs("AWS::IAM::Policy", 0);
    });

    test("Handles Multiple User Configurations", () => {
      // GIVEN
      const app = new cdk.App();
      const customConfig: StorageBucketConfig = {
        ...mediaStorageConfig,
        accessControl: [
          {
            userName: "user-1",
            groupName: "group-1",
            accessLevel: BucketAccessLevel.READ_ONLY,
          },
          {
            userName: "user-2",
            groupName: "group-2",
            accessLevel: BucketAccessLevel.READ_WRITE,
          },
        ],
      };

      // WHEN
      const stack = new StorageBucketStack(app, "TestMultiUserStack", {
        bucketType: "custom",
        customConfig: customConfig,
      });

      // THEN
      const template = Template.fromStack(stack);

      // Verify multiple IAM resources created
      template.resourceCountIs("AWS::IAM::User", 2);
      template.resourceCountIs("AWS::IAM::Group", 2);
      template.resourceCountIs("AWS::IAM::Policy", 2);
    });

    test("Access Control Works with Different Bucket Types", () => {
      // GIVEN
      const app = new cdk.App();
      const customDocConfig: StorageBucketConfig = {
        ...documentStorageConfig,
        accessControl: [
          {
            userName: "doc-user",
            groupName: "doc-group",
            accessLevel: BucketAccessLevel.FULL,
            createAccessKeys: true,
          },
        ],
      };

      // WHEN
      const stack = new StorageBucketStack(app, "TestDocAccessStack", {
        bucketType: "custom",
        customConfig: customDocConfig,
      });

      // THEN
      const template = Template.fromStack(stack);

      // Verify IAM resources and access keys
      template.resourceCountIs("AWS::IAM::User", 1);
      template.resourceCountIs("AWS::IAM::AccessKey", 1);

      // Verify outputs for access keys
      template.hasOutput("*", {
        Description: Match.stringLikeRegexp("Access Key ID.*"),
      });
    });

    test("IAM Policies Reference Correct Bucket", () => {
      // GIVEN
      const app = new cdk.App();
      const customConfig: StorageBucketConfig = {
        ...mediaStorageConfig,
        accessControl: [
          {
            userName: "bucket-user",
            groupName: "bucket-group",
          },
        ],
      };

      // WHEN
      const stack = new StorageBucketStack(app, "TestPolicyReferenceStack", {
        bucketType: "custom",
        customConfig: customConfig,
        bucketName: "test-specific-bucket",
      });

      // THEN
      const template = Template.fromStack(stack);

      // Verify IAM policy exists and references S3 actions
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: "Allow",
              Action: Match.arrayWith([Match.stringLikeRegexp("s3:.*")]),
            }),
          ]),
        },
      });

      // Verify policy is attached to the correct group
      template.hasResourceProperties("AWS::IAM::Policy", {
        Groups: Match.arrayWith([Match.objectLike({ Ref: Match.anyValue() })]),
      });
    });

    test("Stack Exposes AccessControl Property", () => {
      // GIVEN
      const app = new cdk.App();
      const customConfig: StorageBucketConfig = {
        ...mediaStorageConfig,
        accessControl: [
          {
            userName: "exposed-user",
            groupName: "exposed-group",
          },
        ],
      };

      // WHEN
      const stack = new StorageBucketStack(app, "TestExposedAccessStack", {
        bucketType: "custom",
        customConfig: customConfig,
      });

      // THEN
      expect(stack.accessControl).toBeDefined();
      expect(stack.accessControl?.users.size).toBe(1);
      expect(stack.accessControl?.groups.size).toBe(1);
    });

    test("Access Control Works with Production Environment", () => {
      // GIVEN
      const app = new cdk.App();
      const customConfig: StorageBucketConfig = {
        ...mediaStorageConfig,
        accessControl: [
          {
            userName: "prod-user",
            groupName: "prod-group",
            tags: {
              environment: "production",
            },
          },
        ],
      };

      // WHEN
      const stack = new StorageBucketStack(app, "TestProdAccessStack", {
        bucketType: "custom",
        customConfig: customConfig,
        environment: "production",
      });

      // THEN
      const template = Template.fromStack(stack);

      // Verify production settings
      template.hasResource("AWS::S3::Bucket", {
        DeletionPolicy: "Retain",
      });

      // Verify IAM resources with environment tags
      template.hasResourceProperties("AWS::IAM::User", {
        Tags: Match.arrayWith([{ Key: "Environment", Value: "production" }]),
      });
    });

    test("Prefix Restrictions Applied Correctly in Stack", () => {
      // GIVEN
      const app = new cdk.App();
      const customConfig: StorageBucketConfig = {
        ...mediaStorageConfig,
        accessControl: [
          {
            userName: "prefix-user",
            groupName: "prefix-group",
            allowedPrefixes: ["uploads/", "downloads/"],
          },
        ],
      };

      // WHEN
      const stack = new StorageBucketStack(app, "TestPrefixStack", {
        bucketType: "custom",
        customConfig: customConfig,
      });

      // THEN
      const template = Template.fromStack(stack);

      // Verify prefix conditions in policy
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: {
                StringLike: {
                  "s3:prefix": ["uploads/", "downloads/"],
                },
              },
            }),
          ]),
        },
      });
    });
  });
});
