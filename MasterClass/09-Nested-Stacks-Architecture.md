# Chapter 9: Nested Stacks Architecture

As your infrastructure grows, placing everything into a single 5,000-line `template.yaml` file quickly becomes unmanageable. It results in giant, terrifying Change Sets, merge conflicts, and a massive "blast radius" if an update fails.

The professional solution is to decompose large architectures into Nested Stacks.

## Why Modularize? The Blast Radius Concept
*   **Monolithic Template downside**: Modifying a tagging convention on a Lambda might trigger a replacement evaluation on the Database. The risk is too high.
*   **Nested Stacks upside**: If you only update `compute.yaml`, CloudFormation knows `networking.yaml` and `database.yaml` are untouched. The blast radius of the change is contained to the compute layer.

## The Parent/Child Orchestrator Design
A Nested Stack architecture relies on a `root.yaml` orchestrator. This template contains zero physical resources (no EC2s, no VPCs). It only contains `AWS::CloudFormation::Stack` resources.

**Parameter Surface Area:** In this project, ~150 parameters are now exposed in `root.yaml` covering every configurable aspect. Zero hidden defaults exist in any nested template -- the root orchestrator is the single source of truth for all configuration. This includes all 9 subnet CIDRs exposed as root parameters (so custom VPC CIDR ranges work), and `DatabasePort` passed through `root.yaml` to both the RDS and backend-task stacks.

**Typical Ordering Strategy:**
Dependencies flow downward. A database needs a subnet. Compute needs a database connection string.
1.  **Networking**: VPC, Subnets, Route Tables.
2.  **Security**: IAM Roles, Security Groups.
3.  **Data**: RDS, S3, Secrets Manager.
4.  **Compute**: Load Balancers, ECS Clusters, Task Definitions.
5.  **Monitoring**: Alarms, Dashboard definitions.

### YAML Implementation: The Root Orchestrator
To pass values between child stacks, the parent `root.yaml` grabs the `Outputs` of the first child (using `!GetAtt`) and feeds them into the `Parameters` of the next child.

```yaml
Resources:
  # 1. First, the Network Layer
  NetworkStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/my-templates/networking.yaml
      Parameters:
        EnvironmentName: prod

  # 2. Next, the Security Layer
  SecurityStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/my-templates/security-groups.yaml
      Parameters:
        # Pass the VPC ID output from NetworkStack into SecurityStack
        VpcId: !GetAtt NetworkStack.Outputs.VpcId

  # 3. Finally, the Compute Layer (depends on Network and Security)
  ComputeStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/my-templates/compute.yaml
      Parameters:
        VpcId: !GetAtt NetworkStack.Outputs.VpcId
        AppSecurityGroupId: !GetAtt SecurityStack.Outputs.AppSecurityGroupId
```

## Dependency Management: Inference vs explicit `DependsOn`
In the example above, CloudFormation is smart enough to infer that `SecurityStack` *must* wait for `NetworkStack` to finish building because it uses `!GetAtt NetworkStack.Outputs.VpcId`.

You only need an explicit `DependsOn` when CloudFormation cannot "see" the dependency through a reference (e.g., a Lambda function that queries a database, but the connection string isn't passed via CloudFormation). Minimize explicit `DependsOn` usage; trust the inferred graph.

**Real-World Example from this project:** All 15 redundant `DependsOn` declarations were removed from `root.yaml`. CloudFormation's implicit dependency graph via `!GetAtt` handles all ordering automatically. This is a concrete real-world example of the principle "trust the inferred graph" -- every child stack references outputs from its upstream stacks, so CloudFormation already knows the correct creation order without being told explicitly.

---

## 🎯 God-Level Checklist for Chapter 9
- [ ] **Can each child stack be understood and tested independently?** (Answer: Yes. `networking.yaml` can be tested in isolation before being linked to the root stack).
- [ ] **Are parameter/output contracts explicit and minimal?** (Answer: Pass only exactly what is needed (e.g., the specific `DbSubnetGroup` name, not the whole `DbClusterArn` if it's unused). In this project, unused parameters were cleaned up: `VpcId` was removed from both ALB templates, and `EnvironmentName` + `DNSRecordTTL` were removed from `route53.yaml`. This is a best practice for keeping parameter contracts minimal.
- [ ] **How does the root stack connect child stacks?** (Answer: Using `!GetAtt ChildStack.Outputs.OutputName` mapped to the `Parameters` property of the downstream stack.)
