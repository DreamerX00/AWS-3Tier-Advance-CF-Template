# Chapter 5: Load Balancing and Target Groups

The Application Load Balancer (ALB) is the Layer 7 (HTTP/HTTPS) traffic control plane for web workloads. In a microservices or 3-Tier architecture, understanding the ALB's building blocks is essential for routing traffic securely and maintaining high availability.

## Essential ALB Components
An ALB configuration is fundamentally composed of three interconnected parts:

1.  **Load Balancer (The Entry Point)**: Sits in the public subnets (for internet-facing) or private subnets (for internal services). It holds the public IP or internal DNS name.
2.  **Listener (The Protocol Rule)**: Defines the port and protocol (e.g., HTTPS on 443). It acts as the "if this incoming request matches" condition.
3.  **Target Group (The Destination)**: A logical pool of backend resources (ECS tasks, EC2 instances, Lambda functions) where traffic is routed. The Target Group also defines the Health Check policy.

### YAML Implementation: The Listener and Target Group Link
Notice how the `Listener` directs traffic to the `TargetGroup` via the `DefaultActions` block.

The Public ALB now supports an **optional HTTPS listener** (port 443). Two new parameters control this: `ACMCertificateArn` (the ARN of the ACM certificate) and `SSLPolicy` (e.g., `ELBSecurityPolicy-TLS13-1-2-2021-06`). A `HasHTTPS` condition is derived from whether a certificate ARN is provided. When `HasHTTPS` is true, the HTTPS listener is created and the HTTP listener's default action automatically redirects to HTTPS (`301 redirect`). When no certificate is provided, only the HTTP listener is created and traffic flows normally.

ALB default actions now return a **`404 Not Found`** fixed response instead of `200 OK`. This ensures that any request not matched by a listener rule receives a clear "not found" status, rather than a misleading success response.

```yaml
PublicAlbHttpsListener:
  Type: AWS::ElasticLoadBalancingV2::Listener
  Condition: HasHTTPS
  Properties:
    LoadBalancerArn: !Ref PublicLoadBalancer
    Port: 443
    Protocol: HTTPS
    Certificates:
      - CertificateArn: !Ref ACMCertificateArn
    SslPolicy: !Ref SSLPolicy
    DefaultActions:
      - Type: fixed-response
        FixedResponseConfig:
          StatusCode: '404'

PublicAlbHttpListener:
  Type: AWS::ElasticLoadBalancingV2::Listener
  Properties:
    LoadBalancerArn: !Ref PublicLoadBalancer
    Port: 80
    Protocol: HTTP
    DefaultActions:
      - !If
        - HasHTTPS
        - Type: redirect
          RedirectConfig:
            Protocol: HTTPS
            Port: '443'
            StatusCode: HTTP_301
        - Type: fixed-response
          FixedResponseConfig:
            StatusCode: '404'

FrontendTargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    Port: 8080 # The port your container actually listens on
    Protocol: HTTP
    TargetType: ip # Mandatory for ECS awsvpc networking
```

> **Template hygiene note:** The previously unused `VpcId` parameter has been removed from both the public and internal ALB templates. Target Groups in this stack infer VPC from the subnet configuration, so the standalone parameter was unnecessary.

## Dual ALB Pattern in 3-Tier Systems
Standard enterprise architecture separates internet traffic from internal service-to-service traffic.
*   **Public ALB**: Sits in Public Subnets. Contains internet-facing certificates, WAF rules, and limits blast radius from bad actors. Forwards to the Frontend app.
*   **Internal ALB**: Sits in Private Subnets. Has NO internet route. Used strictly for the Frontend application to communicate with the Backend API.

This pattern guarantees that even if the Public ALB is compromised or misconfigured, attackers cannot directly hit your backend microservices.

## Health Check Design: Liveness vs Readiness
Health checks attached to Target Groups must validate **readiness** (is the app ready to handle requests?), not just process liveness (is the container running?).

*   **Path**: Use a dedicated endpoint (e.g., `/health`) that queries critical dependencies (like a quick DB `SELECT 1`).
*   **HealthyThreshold**: How many consecutive successes before sending traffic?
*   **UnhealthyThreshold**: How many consecutive failures before draining connections?

If your health check is just `/` (the root route) and it takes 3 seconds to render because of complex queries, the ALB will assume the container is dead and kill it prematurely.

```yaml
    # Inside the TargetGroup properties:
    HealthCheckPath: /api/health
    HealthCheckIntervalSeconds: 30
    HealthCheckTimeoutSeconds: 5
    HealthyThresholdCount: 2
    UnhealthyThresholdCount: 3
    Matcher:
      HttpCode: 200
```

---

## ALB Access Logs: S3 Bucket Policy with ELB Account ID Mapping

If you enable ALB access logs to an S3 bucket, the bucket policy must grant write access to the **ELB service account** for your region. AWS publishes a different ELB account ID per region (28 regions currently). The recommended pattern uses a `Mappings` section with `!FindInMap` to resolve the correct account ID at deploy time. Additionally, the policy should grant `s3:PutObject` to `delivery.logs.amazonaws.com` with an `aws:SourceAccount` condition to restrict log delivery to your own account only.

```yaml
Mappings:
  ElbAccountId:
    us-east-1:
      AccountId: '127311923021'
    eu-west-1:
      AccountId: '156460612806'
    # ... 28 regions total

# In the S3 BucketPolicy:
- Effect: Allow
  Principal:
    AWS: !Sub
      - 'arn:aws:iam::${ElbAccount}:root'
      - ElbAccount: !FindInMap [ElbAccountId, !Ref 'AWS::Region', AccountId]
  Action: s3:PutObject
  Resource: !Sub '${LogBucket.Arn}/AWSLogs/${AWS::AccountId}/*'
- Effect: Allow
  Principal:
    Service: delivery.logs.amazonaws.com
  Action: s3:PutObject
  Resource: !Sub '${LogBucket.Arn}/AWSLogs/${AWS::AccountId}/*'
  Condition:
    StringEquals:
      aws:SourceAccount: !Ref 'AWS::AccountId'
```

---

## 🎯 God-Level Checklist for Chapter 5
- [ ] **Is the backend only reachable through the intended ALB path?** (Answer: Yes, enforced via Security Groups where the backend SG only allows ingress from the ALB SG.)
- [ ] **Why is `TargetType: ip` required for ECS Fargate?** (Answer: Fargate provisions ENIs directly into your VPC for each task, bypassing the EC2 host networking. The ALB must route to those specific IPs, not EC2 instance IDs.)
- [ ] **Do your health checks validate readiness or just liveness?** (Answer: Readiness. Misconfigured interval/timeout settings during app startup are the #1 cause of false failovers in ECS deployments.)
- [ ] **Does the HTTPS listener activate only when a certificate is provided?** (Answer: Yes. The `HasHTTPS` condition gates the HTTPS listener and flips the HTTP listener to redirect mode automatically.)
- [ ] **Do ALB default actions return an appropriate status code?** (Answer: Yes. Default actions return `404 Not Found`, not `200 OK`, to avoid masking routing misconfigurations.)
