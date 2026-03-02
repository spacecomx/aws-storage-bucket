#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { getAppConfig } from "../config/app-config";
import { TaggingAspect } from "../lib/aspects/tagging-aspect";
import { StorageBucketStack } from "../lib/storage-bucket-stack";

const app = new cdk.App();
const config = getAppConfig(app);

const stack = new StorageBucketStack(app, config.stackName, {
  bucketType: config.bucketType,
  bucketName: config.bucketName,
  description: config.description,
  environment: config.environment,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
});

// Apply tagging aspect for consistent resource tagging
// Priority 100 = mutating phase (runs before internal Tag aspects at priority 200)
Aspects.of(stack).add(
  new TaggingAspect({
    environment: config.environment,
    application: "storage-bucket",
    owner: app.node.tryGetContext("owner") || "platform-team",
    costCenter: app.node.tryGetContext("costCenter"),
    customTags: app.node.tryGetContext("tags") || {},
  }),
  { priority: 100 },
);

// Apply AWS Solutions security checks (cdk-nag)
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
