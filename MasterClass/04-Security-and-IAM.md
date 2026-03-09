# Chapter 4: Security Boundaries and IAM

Security in AWS is a two-pronged approach: Network Controls (Security Groups) and Identity Controls (IAM Roles). If either is weak, your architecture is compromised.

## The Network Security Model: SG Chaining
Security Groups (SGs) act as stateful firewalls at the ENI (Elastic Network Interface) level.
The golden rule of AWS networking: **Do not use IP CIDRs for internal routing. Chain your Security Groups.**

Instead of saying "Allow port 3306 from `10.0.1.0/24`", you say "Allow port 3306 from `ApplicationSecurityGroup`". This makes your traffic rules dynamic, auto-scaling, and impervious to IP changes.

### YAML Implementation: The Tier-to-Tier Trust
Notice how the Database SG explicitly references the ECS Task SG as its source. If an EC2 instance is spun up in the same subnet but doesn't have the `EcsTaskSecurityGroup` attached, it cannot reach the DB.

```yaml
EcsTaskSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Allow inbound from ALB only
    VpcId: !Ref VpcId
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 8080
        ToPort: 8080
        SourceSecurityGroupId: !Ref AlbSecurityGroup # The magic link

DatabaseSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Allow inbound from ECS Tasks only
    VpcId: !Ref VpcId
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 3306
        ToPort: 3306
        SourceSecurityGroupId: !Ref EcsTaskSecurityGroup # Chained trust
```

## IAM Role Separation (The ECS Model)
IAM (Identity and Access Management) defines what compute resources are allowed to *do* to other AWS services.
In ECS, over-permissioning is the most common vulnerability. You must separate roles clearly.

### 1. The EC2 Instance Role (Container Instance Role)
*   **Used by:** The underlying EC2 host (if not using Fargate).
*   **Purpose:** Allows the ECS Agent on the EC2 instance to talk to the ECS Control Plane and pull images.
*   **Contains:** `AmazonEC2ContainerServiceforEC2Role` managed policy.
*   **App Logic?** NONE. The EC2 host should have zero access to S3, DynamoDB, or App Secrets.

### 2. The Task Execution Role
*   **Used by:** The ECS Agent provisioning the specific container.
*   **Purpose:** Allows ECS to pull the image from ECR, and pull secrets from Secrets Manager to inject into the environment before the container starts. It also writes to CloudWatch Logs.
*   **App Logic?** NONE.

### 3. The Task Role
*   **Used by:** Your actual application code running *inside* the container.
*   **Purpose:** The business logic permissions. If your app needs to read from a specific S3 bucket or put messages on an SQS queue, those permissions go here.

## Least Privilege Principle in Code
Never use `Resource: "*"` unless the API action strictly requires it. Scope down to the exact ARN of the resource.

### Real-World Least Privilege Examples from This Repo

**VPC Flow Log Role -- Resource Scoping by ARN:**
The VPC Flow Log IAM role's `Resource` is scoped to `!GetAtt VPCFlowLogGroup.Arn` and its `:*` suffix, rather than the common anti-pattern of `Resource: '*'`. This ensures the role can only write logs to the specific CloudWatch Log Group created for VPC flow logs -- not to any arbitrary log group in the account.

**ECS Task Execution Role -- Condition Key Scoping:**
The `kms:Decrypt` permission on the Task Execution Role includes a `kms:ViaService` condition key that restricts KMS decryption usage to `secretsmanager.{region}.amazonaws.com` and `ssm.{region}.amazonaws.com` only. This means even if the role has decrypt access to a KMS key, it can only exercise that permission when the call originates from Secrets Manager or SSM Parameter Store -- not from any other AWS service or direct API call. This is a textbook example of least privilege that goes beyond just scoping by ARN, adding a second dimension of restriction via condition keys.

### YAML Implementation: A Highly Scoped Task Role
```yaml
AppTaskRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:
      Statement:
        - Effect: Allow
          Principal:
            Service: ecs-tasks.amazonaws.com
          Action: sts:AssumeRole
    Policies:
      - PolicyName: S3UploadAccess
        PolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - s3:PutObject
              Resource: !Sub "arn:aws:s3:::${MyProtectedBucket}/*" # Highly scoped
```

---

## 🎯 God-Level Checklist for Chapter 4
- [ ] **Can you explain Task Role vs. Task Execution Role clearly?** (Answer: Execution Role is for the AWS infrastructure to pull images/secrets to start the container. Task Role is the identity of the running application code to interact with other AWS services.)
- [ ] **Are internal service paths locked to SG-to-SG rules?** (Answer: Yes, Security Groups should reference other Security Groups, not IP ranges, to create dynamic trust boundaries regardless of auto-scaling events.)
- [ ] **Why must you avoid wildcard (`*`) resources in IAM policies?** (Answer: It violates Least Privilege. If the container is breached, the attacker gains access to ALL resources of that type in the account, rather than just the specific resource the app needed.)
