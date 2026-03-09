# Chapter 6: Compute Layer (ECS)

Compute design controls application resilience, scaling costs, and deployment velocity. In modern AWS architectures, Elastic Container Service (ECS) is the standard orchestrator for Docker workloads.

This core truth must guide your design: **ECS is not your servers. ECS is a scheduling engine built on top of your servers (EC2) or AWS-managed capacity (Fargate).**

## The ECS Control Plane
*   **ECS Cluster**: A logical boundary. It does not cost money; it is simply a namespace that organizes capacity (EC2 instances or Fargate allocations) and services.
*   **Task Definition**: The immutable blueprint. It defines the Docker image, CPU/Memory constraints, injected Secrets, environment variables, and log routing (CloudWatch).
*   **ECS Service**: The reconciler. If you say `DesiredCount: 3`, the Service ensures exactly 3 tasks are running. If one dies, it schedules a new one. It also handles registering and deregistering tasks with the ALB Target Group.

### YAML Implementation: The ECS Service
The service ties everything together: the cluster, the blueprint (task definition), the network placement, and the load balancer endpoint.

```yaml
BackendService:
  Type: AWS::ECS::Service
  Properties:
    Cluster: !Ref EcsCluster
    TaskDefinition: !Ref BackendTaskDefinition
    DesiredCount: 2
    LaunchType: !Ref BackendLaunchType  # Configurable: FARGATE or EC2
    EnableExecuteCommand: !Ref EnableExecuteCommand  # Default: false (see below)
    NetworkConfiguration:
      AwsvpcConfiguration:
        AssignPublicIp: !If [IsFargateBackend, DISABLED, !Ref 'AWS::NoValue']
        Subnets:
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2
        SecurityGroups:
          - !Ref BackendEcsSecurityGroup
    LoadBalancers:
      - ContainerName: backend-app
        ContainerPort: 8080
        TargetGroupArn: !Ref BackendTargetGroup
```

> **Launch type is now parameterized.** `FrontendLaunchType` and `BackendLaunchType` parameters accept `FARGATE` or `EC2`. Where earlier versions hardcoded `LaunchType: FARGATE`, the template now uses `!Ref FrontendLaunchType` or `!Ref BackendLaunchType`. This allows mixed-mode clusters where the frontend runs on Fargate and the backend on EC2 (or vice versa).

> **`AssignPublicIp` is conditional.** For Fargate services, `AssignPublicIp` is set to `DISABLED`. For EC2 launch type, it is omitted entirely (`!Ref 'AWS::NoValue'`) since EC2-backed tasks inherit networking from the host instance. The condition `IsFargateFrontend` / `IsFargateBackend` drives this logic (e.g., `!If [IsFargateFrontend, DISABLED, !Ref 'AWS::NoValue']`).

> **`EnableExecuteCommand` is now a parameter defaulting to `false`.** Previously hardcoded to `true`, this was a security risk in production because ECS Exec grants shell access into running containers. The new `EnableExecuteCommand` parameter defaults to `false`. Enable it per-service when you need interactive debugging, then disable it again.

> **ASG uses conditional 2-AZ/3-AZ subnet placement.** When `Has3AZs` is true, the Auto Scaling Group includes a third subnet. This is handled via a conditional list so the template adapts to regions with only two Availability Zones.

## Autoscaling: Aligning Compute with Demand
Scaling in ECS operates on two distinct layers, which must not conflict:

1.  **Service Autoscaling**: Scales the number of running *tasks* based on CloudWatch metrics (like CPU utilization > 70%).
2.  **Infrastructure Autoscaling (Capacity Providers)**: Scales the underlying *EC2 instances*. If Service Autoscaling demands a new task, but the EC2 cluster is full, the Capacity Provider triggers the ASG to boot a new instance. (If using Fargate, AWS handles this layer entirely).

If you misconfigure EC2 Autoscaling (e.g., scaling based on arbitrary CPU metrics instead of ECS Capacity Provider Reservations), you will experience scheduling failures where tasks are pending forever because no hosts boot up.

## Task Definitions: Environment Variables vs Secrets
Never put plain-text passwords or API keys in the `Environment:` block of a Task Definition. Anyone who can read the CloudFormation template or the AWS Console can steal them. Use the `Secrets:` block, which delegates decryption to AWS Secrets Manager or Parameter Store at runtime.

```yaml
BackendTaskDefinition:
  Type: AWS::ECS::TaskDefinition
  Properties:
    RequiresCompatibilities: [FARGATE]
    Cpu: 256
    Memory: 512
    ExecutionRoleArn: !Ref EcsTaskExecutionRole # Required to pull secrets
    TaskRoleArn: !Ref BackendTaskRole
    ContainerDefinitions:
      - Name: backend-app
        Image: !Ref BackendImageUri
        PortMappings:
          - ContainerPort: 8080
        # UNSAFE: Plaintext Variables
        Environment:
          - Name: ENVIRONMENT
            Value: prod
          - Name: DB_PORT
            Value: !Ref DatabasePort  # Injected via parameter
        # SECURE: AWS handles injection
        Secrets:
          - Name: DB_PASSWORD
            ValueFrom: !Ref DatabaseSecretArn
```

> **`DB_PORT` environment variable.** The backend task now receives a `DB_PORT` environment variable sourced from the `DatabasePort` parameter. This avoids hardcoding the database port in application code and allows the same image to work with engines that use different default ports (MySQL 3306, PostgreSQL 5432).

> **`DeletionPolicy: Retain` on CloudWatch log groups and ECR repositories.** Both `AWS::Logs::LogGroup` and `AWS::ECR::Repository` resources now carry `DeletionPolicy: Retain`. This prevents accidental loss of diagnostic logs or container images when a stack is deleted or updated. Log groups in particular can contain months of production telemetry that cannot be regenerated.

---

## 🎯 God-Level Checklist for Chapter 6
- [ ] **What is the difference between a Task Definition and an ECS Service?** (Answer: Task Definition is the static blueprint; the Service is the active manager that ensures the desired number of instances of that blueprint are running and connected to load balancers.)
- [ ] **Are logs and secrets wired in the Task Definition cleanly?** (Answer: Yes, using the `Secrets` block for sensitive data and the `LogConfiguration` block to route `stdout/stderr` natively to CloudWatch Logs.)
- [ ] **Why disable Public IPs for Fargate tasks in a private subnet?** (Answer: It is redundant and wastes IP address space. The Fargate task reaches the internet via the NAT Gateway routing, not a direct public IP assignment.)
