import { Duration } from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export interface BucketEventNotificationProps {
  /**
   * The S3 bucket to monitor for events
   */
  bucket: s3.IBucket;

  /**
   * Optional SNS topic for notifications
   */
  notificationTopic?: sns.ITopic;

  /**
   * Optional Lambda function for event processing
   */
  eventProcessor?: lambda.IFunction;

  /**
   * Enable notifications
   * @default true
   */
  enabled?: boolean;

  /**
   * S3 event types to monitor
   * @default ['Object Created', 'Object Removed']
   */
  eventTypes?: string[];
}

/**
 * Construct for EventBridge-based S3 event notifications
 * This is the modern approach vs. legacy S3 notification configurations
 */
export class BucketEventNotification extends Construct {
  public readonly eventRule: events.Rule;
  public readonly deadLetterQueue?: sqs.Queue;

  constructor(
    scope: Construct,
    id: string,
    props: BucketEventNotificationProps,
  ) {
    super(scope, id);

    if (props.enabled === false) {
      return;
    }

    const { bucket, eventTypes = ["Object Created", "Object Removed"] } = props;

    // Create DLQ for failed event processing
    this.deadLetterQueue = new sqs.Queue(this, "EventDLQ", {
      retentionPeriod: Duration.days(14),
      encryption: sqs.QueueEncryption.SQS_MANAGED,
    });

    // Create EventBridge rule for S3 events
    this.eventRule = new events.Rule(this, "EventRule", {
      description: `S3 events for bucket ${bucket.bucketName}`,
      eventPattern: {
        source: ["aws.s3"],
        detailType: eventTypes,
        detail: {
          bucket: {
            name: [bucket.bucketName],
          },
        },
      },
    });

    // Add SNS target if provided
    if (props.notificationTopic) {
      this.eventRule.addTarget(
        new targets.SnsTopic(props.notificationTopic, {
          deadLetterQueue: this.deadLetterQueue,
        }),
      );
    }

    // Add Lambda target if provided
    if (props.eventProcessor) {
      this.eventRule.addTarget(
        new targets.LambdaFunction(props.eventProcessor, {
          deadLetterQueue: this.deadLetterQueue,
          maxEventAge: Duration.hours(2),
          retryAttempts: 2,
        }),
      );
    }

    // If no targets provided, at least log to CloudWatch Logs
    if (!props.notificationTopic && !props.eventProcessor) {
      this.eventRule.addTarget(
        new targets.CloudWatchLogGroup(
          new (require("aws-cdk-lib/aws-logs").LogGroup)(this, "EventLogs", {
            retention: require("aws-cdk-lib/aws-logs").RetentionDays.ONE_MONTH,
          }),
        ),
      );
    }
  }
}
