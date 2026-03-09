# Chapter 10: Advanced Functions and Observability

To move from basic scripting to professional-grade infrastructure engineering, you must master CloudFormation's intrinsic functions and embed observability directly into your architecture.

## Intrinsic Functions You Use Constantly

These functions allow your templates to dynamically resolve values at stack creation time, making them portable across regions, accounts, and environments.

*   `!Ref`: The most common function. It returns the value of a parameter or the *Physical ID* (or in some cases, the ARN) of a resource.
*   `!GetAtt`: Retrieves specific attributes from a resource. For example, `!GetAtt MyLoadBalancer.DNSName` returns the public URL of the ALB.
*   `!Sub`: Interpolates strings. This is vital for constructing ARNs and names dynamically.

```yaml
# Using !Sub to dynamically build an S3 Bucket ARN based on the AWS Account ID
BucketRolePolicy:
  Type: AWS::IAM::Policy
  Properties:
    PolicyName: AppBucketAccess
    PolicyDocument:
      Statement:
        - Effect: Allow
          Action: s3:PutObject
          Resource: !Sub "arn:aws:s3:::my-app-bucket-${AWS::AccountId}-${EnvironmentName}/*"
```

*   `!FindInMap`: Returns the value corresponding to keys in a two-level map declared in the `Mappings` section. Core use case: choosing the correct AMI based on `AWS::Region`. **Real-world example from this project:** The S3 bucket policy for ALB access logs uses `!FindInMap [ELBAccountMap, !Ref 'AWS::Region', AccountId]` to resolve the correct ELB account ID across 28 AWS regions -- a perfect `Mappings` + `!FindInMap` use case where the mapping table replaces what would otherwise be a massive chain of `!If` conditions.
*   `!Select` + `!GetAZs`: Used together to dynamically pick Availability Zones without hardcoding them.

```yaml
PublicSubnet1:
  Type: AWS::EC2::Subnet
  Properties:
    # Gets the first AZ (index 0) in the current region dynamically
    AvailabilityZone: !Select [0, !GetAZs ''] 
```

## Conditions and Environment Logic
`Conditions` allow you to include or exclude resources based on input parameters. This is how you use a single "Networking" template to deploy a cheap `dev` environment and an expensive `prod` environment.

```yaml
Parameters:
  EnvironmentType:
    Type: String
    AllowedValues: [dev, prod]

Conditions:
  IsProduction: !Equals [!Ref EnvironmentType, prod]

Resources:
  # Only deploy the NAT Gateway if we are in Production
  MyProdNatGateway:
    Type: AWS::EC2::NatGateway
    Condition: IsProduction
    Properties:
      SubnetId: !Ref PublicSubnet1
```
Use `AWS::NoValue` to conditionally omit a specific *property* inside a resource without deleting the whole resource.

**Real-World Condition Examples from this project:**

```yaml
# Conditionally create 3rd-AZ resources
Has3AZs: !Equals [!Ref NumberOfAZs, 3]

# Enable HTTPS listener and HTTP-to-HTTPS redirect
HasHTTPS: !Not [!Equals [!Ref ACMCertificateArn, '']]

# Control AssignPublicIp based on launch type
IsFargateFrontend: !Equals [!Ref FrontendLaunchType, 'FARGATE']

# Engine-conditional log exports (combining multiple conditions)
IsMySQLOrMariaDB: !Or [!Condition IsMySQL, !Condition IsMariaDB]
```

These demonstrate three key patterns: using `!If` with `AWS::NoValue` to conditionally omit properties, conditional resource creation (entire resources gated by `Condition:`), and conditional property values that change behavior without duplicating resource definitions.

## Observability as Code
Monitoring must be provisioned *with* the infrastructure, not bolted on manually afterward by an operations team. If an ECS Service doesn't have a CloudWatch Log Group defined in IaC, the deployment should fail code review.

**Persistence:** CloudWatch log groups in this project have `DeletionPolicy: Retain` so they survive stack deletion -- you never want to lose operational logs just because a stack was torn down.

**Security-Observability Intersection:** The VPC Flow Log IAM role is scoped to a specific log group ARN rather than using a wildcard. This ensures the flow log role can only write to its designated log group, following least-privilege even for observability resources.

### Defining Alarms
You should define CloudWatch Alarms alongside your application resources.

```yaml
HighCpuAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmDescription: "Scale up if CPU > 70%"
    Namespace: AWS/ECS
    MetricName: CPUUtilization
    Statistic: Average
    Period: 60
    EvaluationPeriods: 3
    Threshold: 70
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref WebServerScaleUpPolicy
```

---

## 🎯 God-Level Checklist for Chapter 10
- [ ] **Are log groups, retention policies, and basic alarms defined in your templates?** (Answer: Yes. Observability is a first-class citizen of IaC, not an afterthought.)
- [ ] **When do you use `!Ref` vs `!GetAtt`?** (Answer: `!Ref` typically returns the physical ID (like `vpc-1234`), while `!GetAtt` fetches secondary properties like a database's Endpoint Address or an ALB's DNS Name.)
- [ ] **Do your conditions reduce cost while preserving safety in non-prod?** (Answer: Yes, by conditionally removing NAT Gateways, Multi-AZ deployments, or scaling down instance sizes in `dev` while maintaining the exact same architectural shape).
