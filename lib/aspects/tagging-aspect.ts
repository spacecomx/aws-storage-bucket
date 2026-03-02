import { IAspect, Tags } from "aws-cdk-lib";
import { IConstruct } from "constructs";

export interface TaggingAspectProps {
  /**
   * Environment name (dev, staging, prod)
   */
  environment: string;

  /**
   * Application or service name
   */
  application?: string;

  /**
   * Cost center for billing
   */
  costCenter?: string;

  /**
   * Team or department owner
   */
  owner?: string;

  /**
   * Additional custom tags
   */
  customTags?: Record<string, string>;
}

/**
 * CDK Aspect that applies consistent tagging across all resources
 */
export class TaggingAspect implements IAspect {
  constructor(private readonly props: TaggingAspectProps) {}

  public visit(node: IConstruct): void {
    // Apply standard tags to all taggable resources
    Tags.of(node).add("Environment", this.props.environment);
    Tags.of(node).add("ManagedBy", "CDK");
    Tags.of(node).add(
      "Application",
      this.props.application || "storage-bucket",
    );

    if (this.props.costCenter) {
      Tags.of(node).add("CostCenter", this.props.costCenter);
    }

    if (this.props.owner) {
      Tags.of(node).add("Owner", this.props.owner);
    }

    // Apply any custom tags
    if (this.props.customTags) {
      Object.entries(this.props.customTags).forEach(([key, value]) => {
        Tags.of(node).add(key, value);
      });
    }
  }
}
