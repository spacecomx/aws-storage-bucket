import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import {
  BucketAccess,
  BucketAccessLevel,
} from "../lib/constructs/bucket-access";

describe("BucketAccess", () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let bucket: s3.Bucket;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");
    bucket = new s3.Bucket(stack, "TestBucket", {
      bucketName: "test-bucket",
    });
  });

  describe("User and Group Creation", () => {
    test("Creates IAM User with Correct Name", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "test-user",
            groupName: "test-group",
            accessLevel: BucketAccessLevel.READ_WRITE,
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::IAM::User", {
        UserName: "test-user",
      });
    });

    test("Creates IAM Group with Correct Name", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "test-user",
            groupName: "test-group",
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::IAM::Group", {
        GroupName: "test-group",
      });
    });

    test("Assigns User to Group", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "test-user",
            groupName: "test-group",
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::IAM::User", {
        UserName: "test-user",
        Groups: [{ Ref: Match.stringLikeRegexp("Group.*") }],
      });
    });

    test("Applies Environment Tags to IAM Resources", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "production",
        accessConfigs: [
          {
            userName: "test-user",
            groupName: "test-group",
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);

      // Check user tags (IAM Groups and Policies don't support tags in CloudFormation)
      template.hasResourceProperties("AWS::IAM::User", {
        Tags: Match.arrayWith([
          { Key: "Environment", Value: "production" },
          { Key: "ManagedBy", Value: "CDK" },
        ]),
      });
    });

    test("Applies Custom Tags to IAM Resources", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "test-user",
            groupName: "test-group",
            tags: {
              application: "imgx",
              team: "media",
            },
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::IAM::User", {
        Tags: Match.arrayWith([
          { Key: "application", Value: "imgx" },
          { Key: "team", Value: "media" },
        ]),
      });
    });
  });

  describe("Access Levels", () => {
    test("READ_ONLY Access Level Creates Correct Permissions", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "readonly-user",
            groupName: "readonly-group",
            accessLevel: BucketAccessLevel.READ_ONLY,
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            // List bucket permission
            Match.objectLike({
              Effect: "Allow",
              Action: ["s3:ListBucket", "s3:GetBucketLocation"],
            }),
            // Read-only object permissions
            Match.objectLike({
              Effect: "Allow",
              Action: ["s3:GetObject", "s3:GetObjectVersion"],
            }),
          ]),
        },
      });
    });

    test("READ_WRITE Access Level Includes Write Permissions", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "readwrite-user",
            groupName: "readwrite-group",
            accessLevel: BucketAccessLevel.READ_WRITE,
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: "Allow",
              Action: [
                "s3:GetObject",
                "s3:GetObjectVersion",
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:DeleteObject",
                "s3:DeleteObjectVersion",
              ],
            }),
          ]),
        },
      });
    });

    test("FULL Access Level Grants All S3 Permissions", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "admin-user",
            groupName: "admin-group",
            accessLevel: BucketAccessLevel.FULL,
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: "Allow",
              Action: "s3:*",
            }),
          ]),
        },
      });
    });

    test("Defaults to READ_WRITE When Access Level Not Specified", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "default-user",
            groupName: "default-group",
            // No accessLevel specified
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith([
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
              ]),
            }),
          ]),
        },
      });
    });
  });

  describe("Prefix Restrictions", () => {
    test("Restricts Access to Specific Prefixes", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "prefix-user",
            groupName: "prefix-group",
            allowedPrefixes: ["images/", "thumbnails/"],
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            // ListBucket with prefix condition
            Match.objectLike({
              Action: ["s3:ListBucket", "s3:GetBucketLocation"],
              Condition: {
                StringLike: {
                  "s3:prefix": ["images/", "thumbnails/"],
                },
              },
            }),
          ]),
        },
      });

      // Verify policy has multiple resource ARNs for prefixes
      const resources = template.findResources("AWS::IAM::Policy");
      const policyResource = Object.values(resources)[0] as any;
      const statements = policyResource.Properties.PolicyDocument.Statement;

      // Find the object-level statement (not the ListBucket statement)
      const objectStatement = statements.find(
        (s: any) =>
          s.Action && s.Action.includes && s.Action.includes("s3:GetObject"),
      );

      expect(objectStatement).toBeDefined();
      expect(objectStatement.Resource).toHaveLength(2); // Two prefixes
    });

    test("Allows Full Bucket Access When No Prefixes Specified", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "full-bucket-user",
            groupName: "full-bucket-group",
            // No allowedPrefixes specified
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);

      // Verify ListBucket statement exists without prefix condition
      const resources = template.findResources("AWS::IAM::Policy");
      const policyResource = Object.values(resources)[0] as any;
      const statements = policyResource.Properties.PolicyDocument.Statement;

      const listStatement = statements.find(
        (s: any) =>
          s.Action && s.Action.includes && s.Action.includes("s3:ListBucket"),
      );

      expect(listStatement).toBeDefined();
      expect(listStatement.Condition).toBeUndefined();

      // Verify object-level statement exists with wildcard resource
      const objectStatement = statements.find(
        (s: any) =>
          s.Action && s.Action.includes && s.Action.includes("s3:GetObject"),
      );

      expect(objectStatement).toBeDefined();
      expect(objectStatement.Resource).toBeDefined();
    });
  });

  describe("Access Keys", () => {
    test("Creates Access Keys When Requested", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "api-user",
            groupName: "api-group",
            createAccessKeys: true,
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.resourceCountIs("AWS::IAM::AccessKey", 1);

      // Verify access key references the user
      template.hasResourceProperties("AWS::IAM::AccessKey", {
        UserName: Match.objectLike({
          Ref: Match.stringLikeRegexp(".*User.*"),
        }),
      });
    });

    test("Does Not Create Access Keys By Default", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "console-user",
            groupName: "console-group",
            // createAccessKeys not specified (defaults to false)
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.resourceCountIs("AWS::IAM::AccessKey", 0);
    });

    test("Creates CloudFormation Outputs for Access Keys", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "output-user",
            groupName: "output-group",
            createAccessKeys: true,
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      const outputs = template.findOutputs("*");
      const outputKeys = Object.keys(outputs);

      // Check that outputs were created
      expect(outputKeys.length).toBeGreaterThan(0);

      // Verify access key outputs exist
      const hasAccessKeyOutput = outputKeys.some(
        (key) =>
          key.includes("AccessKey") ||
          outputs[key].Description?.includes("Access Key"),
      );
      expect(hasAccessKeyOutput).toBe(true);

      // Verify user outputs exist
      const hasUserOutput = outputKeys.some(
        (key) =>
          key.includes("User") || outputs[key].Description?.includes("user"),
      );
      expect(hasUserOutput).toBe(true);
    });
  });

  describe("Multiple Users and Groups", () => {
    test("Creates Multiple Users and Groups", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "user-1",
            groupName: "group-1",
          },
          {
            userName: "user-2",
            groupName: "group-2",
          },
          {
            userName: "user-3",
            groupName: "group-3",
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.resourceCountIs("AWS::IAM::User", 3);
      template.resourceCountIs("AWS::IAM::Group", 3);
      template.resourceCountIs("AWS::IAM::Policy", 3);
    });

    test("Each User Gets Unique Configuration", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "readonly-user",
            groupName: "readonly-group",
            accessLevel: BucketAccessLevel.READ_ONLY,
            createAccessKeys: false,
          },
          {
            userName: "readwrite-user",
            groupName: "readwrite-group",
            accessLevel: BucketAccessLevel.READ_WRITE,
            createAccessKeys: true,
          },
          {
            userName: "admin-user",
            groupName: "admin-group",
            accessLevel: BucketAccessLevel.FULL,
            createAccessKeys: true,
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);

      // Verify users created
      template.hasResourceProperties("AWS::IAM::User", {
        UserName: "readonly-user",
      });
      template.hasResourceProperties("AWS::IAM::User", {
        UserName: "readwrite-user",
      });
      template.hasResourceProperties("AWS::IAM::User", {
        UserName: "admin-user",
      });

      // Verify access keys (2 out of 3 users)
      template.resourceCountIs("AWS::IAM::AccessKey", 2);
    });
  });

  describe("CloudFormation Outputs", () => {
    test("Creates Outputs for User and Group Names", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "test-user",
            groupName: "test-group",
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      const outputs = template.findOutputs("*");
      const outputKeys = Object.keys(outputs);

      // Verify outputs were created
      expect(outputKeys.length).toBeGreaterThan(0);

      // Verify user-related outputs exist
      const hasUserOutputs = outputKeys.some(
        (key) =>
          outputs[key].Description?.includes("test-user") ||
          outputs[key].Export?.Name?.includes("test-user"),
      );
      expect(hasUserOutputs).toBe(true);

      // Verify group-related outputs exist
      const hasGroupOutputs = outputKeys.some(
        (key) =>
          outputs[key].Description?.includes("test-group") ||
          outputs[key].Export?.Name?.includes("test-group"),
      );
      expect(hasGroupOutputs).toBe(true);
    });
  });

  describe("Additional Policy Statements", () => {
    test("Allows Additional Custom Policy Statements", () => {
      // GIVEN
      const customStatement = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetBucketVersioning"],
        resources: [bucket.bucketArn],
      });

      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "custom-user",
            groupName: "custom-group",
            additionalPolicyStatements: [customStatement],
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: "s3:GetBucketVersioning",
            }),
          ]),
        },
      });
    });
  });

  describe("Integration", () => {
    test("Works with Existing S3 Bucket", () => {
      // GIVEN
      const existingBucket = new s3.Bucket(stack, "ExistingBucket", {
        bucketName: "my-existing-bucket",
        encryption: s3.BucketEncryption.S3_MANAGED,
      });

      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket: existingBucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "external-user",
            groupName: "external-group",
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);

      // Verify S3 buckets (test bucket + existing bucket, but no additional buckets from BucketAccess)
      template.resourceCountIs("AWS::S3::Bucket", 2);
      template.resourceCountIs("AWS::IAM::User", 1);
      template.resourceCountIs("AWS::IAM::Group", 1);
    });

    test("Construct Exposes Created Resources", () => {
      // WHEN
      const access = new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "exposed-user",
            groupName: "exposed-group",
            createAccessKeys: true,
          },
        ],
      });

      // THEN
      expect(access.users.size).toBe(1);
      expect(access.groups.size).toBe(1);
      expect(access.accessKeys.size).toBe(1);

      expect(access.users.get("exposed-user")).toBeDefined();
      expect(access.groups.get("exposed-group")).toBeDefined();
      expect(access.accessKeys.get("exposed-user")).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    test("Handles Empty Access Configs Array", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [],
      });

      // THEN
      const template = Template.fromStack(stack);
      template.resourceCountIs("AWS::IAM::User", 0);
      template.resourceCountIs("AWS::IAM::Group", 0);
      template.resourceCountIs("AWS::IAM::Policy", 0);
    });

    test("Policy Attached to Group Not User", () => {
      // WHEN
      new BucketAccess(stack, "BucketAccess", {
        bucket,
        environment: "test",
        accessConfigs: [
          {
            userName: "proper-user",
            groupName: "proper-group",
          },
        ],
      });

      // THEN
      const template = Template.fromStack(stack);

      // Policy should reference the group
      template.hasResourceProperties("AWS::IAM::Policy", {
        Groups: [{ Ref: Match.stringLikeRegexp("Group.*") }],
      });

      // User should not have inline policies
      const users = template.findResources("AWS::IAM::User");
      Object.values(users).forEach((user: any) => {
        expect(user.Properties.Policies).toBeUndefined();
      });
    });
  });
});
