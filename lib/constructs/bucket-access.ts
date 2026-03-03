import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

/**
 * Access level for S3 bucket permissions
 */
export enum BucketAccessLevel {
  /**
   * Read-only access (GetObject, ListBucket)
   */
  READ_ONLY = "READ_ONLY",

  /**
   * Read and write access (GetObject, PutObject, DeleteObject, ListBucket)
   */
  READ_WRITE = "READ_WRITE",

  /**
   * Full access to bucket and objects
   */
  FULL = "FULL",
}

/**
 * Configuration for bucket access
 */
export interface BucketAccessConfig {
  /**
   * Name of the IAM user to create
   * @example 'imgx-api-user'
   */
  readonly userName: string;

  /**
   * Name of the IAM group to create
   * @example 'imgx-s3-access'
   */
  readonly groupName: string;

  /**
   * Access level for the bucket
   * @default BucketAccessLevel.READ_WRITE
   */
  readonly accessLevel?: BucketAccessLevel;

  /**
   * Whether to create access keys for programmatic access
   * WARNING: Access keys will be stored in CloudFormation outputs.
   * Consider using IAM roles for EC2/Lambda instead.
   * @default false
   */
  readonly createAccessKeys?: boolean;

  /**
   * Additional IAM policy statements to attach to the group
   * @default []
   */
  readonly additionalPolicyStatements?: iam.PolicyStatement[];

  /**
   * Allowed object prefixes (paths) within the bucket
   * If not specified, grants access to entire bucket
   * @example ['images/', 'uploads/']
   */
  readonly allowedPrefixes?: string[];

  /**
   * Tags to apply to IAM resources
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for BucketAccess construct
 */
export interface BucketAccessProps {
  /**
   * The S3 bucket to grant access to
   */
  readonly bucket: s3.IBucket;

  /**
   * Access configurations for users/groups
   */
  readonly accessConfigs: BucketAccessConfig[];

  /**
   * Environment name (used for tagging)
   */
  readonly environment: string;
}

/**
 * Construct for managing IAM-based S3 bucket access
 *
 * Creates IAM users, groups, and policies for controlled access to S3 buckets.
 * Follows AWS best practices:
 * - Users are assigned to groups (not individual policies)
 * - Least privilege principle
 * - Resource-based access control
 *
 * @example
 * ```typescript
 * const access = new BucketAccess(this, 'ImgxAccess', {
 *   bucket: bucket,
 *   environment: 'production',
 *   accessConfigs: [{
 *     userName: 'imgx-api-user',
 *     groupName: 'imgx-s3-access',
 *     accessLevel: BucketAccessLevel.READ_WRITE,
 *     createAccessKeys: true,
 *     allowedPrefixes: ['images/', 'thumbnails/'],
 *   }],
 * });
 * ```
 */
export class BucketAccess extends Construct {
  /**
   * Created IAM users (keyed by user name)
   */
  public readonly users: Map<string, iam.User>;

  /**
   * Created IAM groups (keyed by group name)
   */
  public readonly groups: Map<string, iam.Group>;

  /**
   * Created access keys (keyed by user name)
   */
  public readonly accessKeys: Map<string, iam.CfnAccessKey>;

  constructor(scope: Construct, id: string, props: BucketAccessProps) {
    super(scope, id);

    this.users = new Map();
    this.groups = new Map();
    this.accessKeys = new Map();

    props.accessConfigs.forEach((config, index) => {
      this.createUserAndGroup(config, props.bucket, props.environment, index);
    });
  }

  private createUserAndGroup(
    config: BucketAccessConfig,
    bucket: s3.IBucket,
    environment: string,
    index: number,
  ): void {
    const accessLevel = config.accessLevel ?? BucketAccessLevel.READ_WRITE;

    // Create IAM Group
    const group = new iam.Group(this, `Group-${index}`, {
      groupName: config.groupName,
    });
    this.groups.set(config.groupName, group);

    // Apply tags to group
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(group).add(key, value);
      });
    }
    cdk.Tags.of(group).add("Environment", environment);
    cdk.Tags.of(group).add("ManagedBy", "CDK");

    // Create policy statements based on access level
    const policyStatements = this.createPolicyStatements(
      bucket,
      accessLevel,
      config.allowedPrefixes,
    );

    // Add any additional policy statements
    if (config.additionalPolicyStatements) {
      policyStatements.push(...config.additionalPolicyStatements);
    }

    // Create and attach policy to group
    const policy = new iam.Policy(this, `Policy-${index}`, {
      policyName: `${config.groupName}-policy`,
      statements: policyStatements,
    });
    policy.attachToGroup(group);

    // Apply tags to policy
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(policy).add(key, value);
      });
    }
    cdk.Tags.of(policy).add("Environment", environment);
    cdk.Tags.of(policy).add("ManagedBy", "CDK");

    // Create IAM User
    const user = new iam.User(this, `User-${index}`, {
      userName: config.userName,
      groups: [group],
    });
    this.users.set(config.userName, user);

    // Apply tags to user
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(user).add(key, value);
      });
    }
    cdk.Tags.of(user).add("Environment", environment);
    cdk.Tags.of(user).add("ManagedBy", "CDK");

    // Create access keys if requested
    if (config.createAccessKeys) {
      const accessKey = new iam.CfnAccessKey(this, `AccessKey-${index}`, {
        userName: user.userName,
      });
      this.accessKeys.set(config.userName, accessKey);

      // Output access key information (WARNING: Sensitive!)
      new cdk.CfnOutput(this, `AccessKeyId-${index}`, {
        value: accessKey.ref,
        description: `Access Key ID for user ${config.userName}`,
        exportName: `${config.userName}-AccessKeyId`,
      });

      new cdk.CfnOutput(this, `SecretAccessKey-${index}`, {
        value: accessKey.attrSecretAccessKey,
        description: `Secret Access Key for user ${config.userName} (SENSITIVE!)`,
        exportName: `${config.userName}-SecretAccessKey`,
      });
    }

    // Output user and group information
    new cdk.CfnOutput(this, `UserName-${index}`, {
      value: user.userName,
      description: `IAM User for ${config.userName}`,
      exportName: `${config.userName}-Name`,
    });

    new cdk.CfnOutput(this, `GroupName-${index}`, {
      value: group.groupName,
      description: `IAM Group for ${config.groupName}`,
      exportName: `${config.groupName}-Name`,
    });

    new cdk.CfnOutput(this, `UserArn-${index}`, {
      value: user.userArn,
      description: `ARN for user ${config.userName}`,
      exportName: `${config.userName}-Arn`,
    });
  }

  private createPolicyStatements(
    bucket: s3.IBucket,
    accessLevel: BucketAccessLevel,
    allowedPrefixes?: string[],
  ): iam.PolicyStatement[] {
    const statements: iam.PolicyStatement[] = [];

    // Bucket-level permissions (ListBucket)
    const listBucketActions = ["s3:ListBucket", "s3:GetBucketLocation"];

    const listStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: listBucketActions,
      resources: [bucket.bucketArn],
    });

    // If prefixes are specified, add condition to ListBucket
    if (allowedPrefixes && allowedPrefixes.length > 0) {
      listStatement.addCondition("StringLike", {
        "s3:prefix": allowedPrefixes,
      });
    }

    statements.push(listStatement);

    // Object-level permissions
    const objectResource = allowedPrefixes
      ? allowedPrefixes.map((prefix) => `${bucket.bucketArn}/${prefix}*`)
      : [`${bucket.bucketArn}/*`];

    switch (accessLevel) {
      case BucketAccessLevel.READ_ONLY:
        statements.push(
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:GetObject", "s3:GetObjectVersion"],
            resources: objectResource,
          }),
        );
        break;

      case BucketAccessLevel.READ_WRITE:
        statements.push(
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              "s3:GetObject",
              "s3:GetObjectVersion",
              "s3:PutObject",
              "s3:PutObjectAcl",
              "s3:DeleteObject",
              "s3:DeleteObjectVersion",
            ],
            resources: objectResource,
          }),
        );
        break;

      case BucketAccessLevel.FULL:
        statements.push(
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:*"],
            resources: [...objectResource, bucket.bucketArn],
          }),
        );
        break;
    }

    return statements;
  }
}
