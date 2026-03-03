#!/usr/bin/env node
/**
 * Example deployment for Imgx integration with S3 bucket access control
 *
 * This example shows how to deploy a bucket with IAM-based access control
 * for the Imgx image processing service.
 *
 * Usage:
 *   ts-node bin/examples/deploy-imgx-bucket.ts
 *
 * Or compile and run:
 *   npx cdk deploy ImgxStorageBucket
 */

import * as cdk from "aws-cdk-lib";
import { Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { imgxStorageConfig } from "../../config/imgx-bucket.config";
import { TaggingAspect } from "../../lib/aspects/tagging-aspect";
import { StorageBucketStack } from "../../lib/storage-bucket-stack";

const app = new cdk.App();

// Get environment from context or environment variable
const environment =
  app.node.tryGetContext("environment") ||
  process.env.ENVIRONMENT ||
  "production";
const bucketName =
  app.node.tryGetContext("bucketName") ||
  process.env.BUCKET_NAME ||
  "imgx-media-storage";

// Create the Imgx storage bucket stack
const imgxStack = new StorageBucketStack(app, "ImgxStorageBucket", {
  bucketType: "custom",
  customConfig: imgxStorageConfig,
  bucketName: bucketName,
  environment: environment,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
  description:
    "S3 storage bucket for Imgx image processing service with IAM access control",
});

// Apply tagging for cost tracking and organization
Aspects.of(imgxStack).add(
  new TaggingAspect({
    environment: environment,
    application: "imgx-storage",
    owner: app.node.tryGetContext("owner") || "media-team",
    costCenter: app.node.tryGetContext("costCenter") || "media-processing",
    customTags: {
      service: "imgx",
      purpose: "image-processing",
      ...(app.node.tryGetContext("tags") || {}),
    },
  }),
  { priority: 100 },
);

// Apply AWS Solutions security checks
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

app.synth();
