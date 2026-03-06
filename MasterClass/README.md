# The CloudFormation MasterClass: Building a Production-Ready 3-Tier Stack

Welcome to the definitive CloudFormation tracking course.

The goal of this MasterClass is to rapidly elevate you from basic scripting ("I know how to provision an S3 bucket") to architectural mastery ("I can orchestrate a secure, highly-available, multi-AZ deployment with safe rollback strategies").

This folder provides a structured learning path directly tied to the *actual* production templates provided in the wider repository.

## Who This Is For
*   **Developers** transitioning from AWS Console click-ops to repeatable automation.
*   **Infrastructure/DevOps Engineers** preparing for senior-level design reviews.
*   **Candidates** practicing for AWS Solutions Architect or DevOps engineering interviews.

## 📚 The God-Level Learning Path

This MasterClass is divided into logical architectural boundaries. Each chapter contains "God-Level Checklists" you must be able to answer before moving on.

1.  [Chapter 1: CloudFormation and Infrastructure as Code](./01-Introduction.md)
2.  [Chapter 2: Anatomy of a God-Level Template (Core Elements)](./02-Core-Elements.md)
3.  [Chapter 3: Networking Foundations (VPCs, Subnets, Routing)](./03-Networking.md)
4.  [Chapter 4: Security Boundaries and IAM (SGs and Least Privilege)](./04-Security-and-IAM.md)
5.  [Chapter 5: Load Balancing and Target Groups](./05-Load-Balancing.md)
6.  [Chapter 6: Compute Layer (ECS, Fargate, ASGs)](./06-Compute.md)
7.  [Chapter 7: Databases and Storage (Data Safety Policies)](./07-Databases-and-Storage.md)
8.  [Chapter 8: Secrets Management and Injection](./08-Secrets-Management.md)
9.  [Chapter 9: Nested Stacks Architecture (Blast Radius Reduction)](./09-Nested-Stacks-Architecture.md)
10. [Chapter 10: Advanced Functions and Observability](./10-Advanced-Functions-and-Monitoring.md)
11. [Chapter 11: 10 Tricky Interview Questions (With Expert Answers)](./11-Tricky-Interview-Questions.md)

## How to Get the Most Out of This
This is not passive reading material. It requires active correlation.

1.  **Read the Chapter**: Internalize the concepts and review the YAML snippets.
2.  **Verify with the Repo**: After reading *Chapter 3: Networking*, immediately open `/networking/vpc.yaml` in this repository and trace the resources discussed.
3.  **Self-Correction**: Attempt to answer the checklist questions at the bottom of each file from memory. If you cannot explain it to a rubber duck, reread the section.

## What the Templates Cover

The production templates this MasterClass is built on include:
*   **25 nested stacks** orchestrated by a single `root.yaml` with **~150 configurable parameters**
*   **Configurable 2-AZ or 3-AZ** deployment via `NumberOfAZs` parameter with conditional resources
*   **Optional HTTPS/TLS** with ACM certificate, HTTP-to-HTTPS redirect, TLS 1.3 policy
*   **Configurable LaunchType** (FARGATE or EC2) per service with conditional `AssignPublicIp`
*   **Engine-aware RDS** log exports (MySQL/MariaDB vs PostgreSQL via conditions)
*   **Scoped IAM** everywhere (no `Resource: '*'`, `kms:ViaService` conditions, log group-specific policies)
*   **DeletionPolicy: Retain** on VPC, IGW, EIPs, log groups, ECR repos, secrets
*   **Zero redundant `DependsOn`** -- implicit dependency graph via `!GetAtt`
*   **cfn-lint validated**: 0 errors, 0 actionable warnings across all 18 templates

## Success Criteria
By completing this MasterClass, you will be able to:
*   Defend your architectural choices (like SG chaining vs IP blocking) in professional code reviews.
*   Refactor dangerous, monolithic templates into safe, modular Nested Stacks.
*   Explain advanced failure modes (`UPDATE_ROLLBACK_FAILED`) and recovery strategies.
*   Securely inject application secrets without exposing them in CloudFormation state.
*   Design conditional multi-AZ architectures with `Conditions` and `!If`.
*   Implement HTTPS/TLS patterns with conditional listeners and redirects.
*   Scope IAM policies using `kms:ViaService`, resource ARNs, and `aws:SourceAccount` conditions.
