import { Duration } from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cw_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";

export interface BucketMonitoringProps {
  /**
   * The S3 bucket to monitor
   */
  bucket: s3.IBucket;

  /**
   * Optional SNS topic for alarm notifications
   */
  alarmTopic?: sns.ITopic;

  /**
   * Enable monitoring
   * @default true
   */
  enabled?: boolean;

  /**
   * Threshold for 4xx error rate (percentage)
   * @default 5
   */
  error4xxThreshold?: number;

  /**
   * Threshold for 5xx error rate (percentage)
   * @default 1
   */
  error5xxThreshold?: number;
}

/**
 * Construct for monitoring S3 bucket metrics and creating alarms
 */
export class BucketMonitoring extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alarms: cloudwatch.Alarm[] = [];

  constructor(scope: Construct, id: string, props: BucketMonitoringProps) {
    super(scope, id);

    if (props.enabled === false) {
      return;
    }

    const { bucket } = props;

    // Create CloudWatch metrics
    const bucketMetric = (metricName: string, statistic: string = "Sum") =>
      new cloudwatch.Metric({
        namespace: "AWS/S3",
        metricName,
        statistic,
        dimensionsMap: {
          BucketName: bucket.bucketName,
        },
        period: Duration.minutes(5),
      });

    // Create alarm for 4xx errors
    const error4xxAlarm = new cloudwatch.Alarm(this, "4xxErrorAlarm", {
      metric: bucketMetric("4xxErrors"),
      threshold: props.error4xxThreshold || 5,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: `High rate of 4xx errors for bucket ${bucket.bucketName}`,
      alarmName: `${bucket.bucketName}-4xx-errors`,
    });

    // Create alarm for 5xx errors
    const error5xxAlarm = new cloudwatch.Alarm(this, "5xxErrorAlarm", {
      metric: bucketMetric("5xxErrors"),
      threshold: props.error5xxThreshold || 1,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: `Server errors detected for bucket ${bucket.bucketName}`,
      alarmName: `${bucket.bucketName}-5xx-errors`,
    });

    this.alarms.push(error4xxAlarm, error5xxAlarm);

    // Add SNS action if topic provided
    if (props.alarmTopic) {
      const snsAction = new cw_actions.SnsAction(props.alarmTopic);
      error4xxAlarm.addAlarmAction(snsAction);
      error5xxAlarm.addAlarmAction(snsAction);
    }

    // Create CloudWatch Dashboard
    this.dashboard = new cloudwatch.Dashboard(this, "Dashboard", {
      dashboardName: `${bucket.bucketName}-metrics`,
    });

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Bucket Requests",
        left: [
          bucketMetric("AllRequests"),
          bucketMetric("GetRequests"),
          bucketMetric("PutRequests"),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: "Error Rates",
        left: [bucketMetric("4xxErrors"), bucketMetric("5xxErrors")],
        width: 12,
      }),
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Data Transfer",
        left: [
          bucketMetric("BytesDownloaded", "Average"),
          bucketMetric("BytesUploaded", "Average"),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: "First Byte Latency",
        left: [bucketMetric("FirstByteLatency", "Average")],
        width: 12,
      }),
    );
  }
}
