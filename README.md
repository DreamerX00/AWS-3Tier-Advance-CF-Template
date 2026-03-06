<p align="center">
  <img src="https://img.shields.io/badge/AWS-CloudFormation-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white" alt="AWS CloudFormation"/>
  <img src="https://img.shields.io/badge/Infrastructure-as%20Code-232F3E?style=for-the-badge&logo=amazonwebservices&logoColor=white" alt="IaC"/>
  <img src="https://img.shields.io/badge/Production-Ready-00C853?style=for-the-badge" alt="Production Ready"/>
  <img src="https://img.shields.io/badge/cfn--lint-0%20Errors-4CAF50?style=for-the-badge" alt="cfn-lint clean"/>
</p>

<h1 align="center">☁️ AWS 3-Tier Architecture — CloudFormation Templates</h1>

<p align="center">
  <b>A battle-tested, production-grade, fully parameterized 3-tier infrastructure stack deployed entirely through AWS CloudFormation nested stacks.</b>
</p>

<p align="center">
  <i>One root template. 25 nested stacks. ~150 configurable parameters. Zero click-ops.</i>
</p>

---

## 🏗️ Architecture Overview

```
                        ┌─────────────────────────────────┐
                        │         ☁️ Route 53 DNS          │
                        │    (Optional Custom Domain)      │
                        └───────────────┬─────────────────┘
                                        │
                        ┌───────────────▼─────────────────┐
                        │     🛡️ AWS WAF (Web ACL)         │
                        │   Rate Limiting · IP Blocking    │
                        └───────────────┬─────────────────┘
                                        │
          ┌─────────────────────────────▼─────────────────────────────┐
          │                   🌐 PUBLIC SUBNETS                       │
          │  ┌─────────────────────────────────────────────────────┐  │
          │  │          ⚖️ Public Application Load Balancer         │  │
          │  │      HTTP → HTTPS Redirect · TLS 1.3 · ACM Cert    │  │
          │  └──────────────────────┬──────────────────────────────┘  │
          │                    NAT Gateway                            │
          └────────────────────────┼──────────────────────────────────┘
                                   │
          ┌────────────────────────▼──────────────────────────────────┐
          │                   🔒 PRIVATE SUBNETS                      │
          │                                                           │
          │  ┌──────────────────┐      ┌──────────────────────────┐  │
          │  │  🖥️ Frontend ECS  │      │    🖥️ Backend ECS        │  │
          │  │  Fargate / EC2   │─────▶│    Fargate / EC2         │  │
          │  │  (Web Tier)      │      │    (App Tier)            │  │
          │  └──────────────────┘      └────────────┬─────────────┘  │
          │                                         │                 │
          │        ⚖️ Internal ALB (Private)         │                 │
          └─────────────────────────────────────────┼─────────────────┘
                                                    │
          ┌─────────────────────────────────────────▼─────────────────┐
          │                   🗄️ DATA SUBNETS (Isolated)              │
          │                                                           │
          │  ┌──────────────────┐      ┌──────────────────────────┐  │
          │  │  🐘 Amazon RDS    │      │   🪣 S3 Buckets           │  │
          │  │  Multi-AZ        │      │   Assets · Access Logs   │  │
          │  │  MySQL/Postgres  │      │   Versioned · Encrypted  │  │
          │  └──────────────────┘      └──────────────────────────┘  │
          └───────────────────────────────────────────────────────────┘
```

---

## 📂 Repository Structure

```
3-Tier/
├── 📄 root.yaml                      # 🎯 Master orchestrator (~150 params)
│
├── 🌐 networking/
│   ├── vpc.yaml                       # VPC + Subnets (2-AZ or 3-AZ)
│   ├── nat.yaml                       # NAT Gateway + Elastic IPs
│   ├── route-tables.yaml              # Public/Private/Data route tables
│   └── security-groups.yaml           # SG chaining (no open CIDR rules)
│
├── ⚖️ loadbalancer/
│   ├── public-alb.yaml                # Internet-facing ALB + HTTPS
│   ├── internal-alb.yaml              # Private ALB (frontend→backend)
│   └── target-groups.yaml             # Health-checked target groups
│
├── 🖥️ compute/
│   ├── ecs-cluster.yaml               # ECS cluster + capacity providers
│   ├── frontend-task.yaml             # Frontend task definition
│   ├── frontend-service.yaml          # Frontend ECS service
│   ├── backend-task.yaml              # Backend task definition
│   ├── backend-service.yaml           # Backend ECS service
│   ├── autoscaling.yaml               # CPU/Memory auto-scaling policies
│   └── launch-template.yaml           # EC2 launch template (when not Fargate)
│
├── 🗄️ database/
│   ├── rds.yaml                       # RDS instance (Multi-AZ, encrypted)
│   └── db-subnet-group.yaml           # Isolated data subnet group
│
├── 🔐 security/
│   └── waf.yaml                       # AWS WAF WebACL + rate limiting
│
├── 🔑 iam/
│   ├── ecs-task-role.yaml             # Scoped task execution + app roles
│   └── ecs-instance-role.yaml         # EC2 instance profile (SSM + ECR)
│
├── 🤫 secrets/
│   └── secrets.yaml                   # Secrets Manager (DB creds, API keys)
│
├── 📦 registry/
│   └── ecr.yaml                       # ECR repos (frontend + backend)
│
├── 🪣 storage/
│   └── s3.yaml                        # Assets bucket + access logs bucket
│
├── 📊 monitoring/
│   ├── cloudwatch.yaml                # Log groups + metric alarms + dashboard
│   └── cloudtrail.yaml                # API audit trail
│
├── 🌍 dns/
│   └── route53.yaml                   # Route53 alias record → ALB
│
└── 📚 MasterClass/                    # 11-chapter deep-dive learning course
    ├── README.md
    └── 01-Introduction.md ... 11-Tricky-Interview-Questions.md
```

---

## 🚀 Key Features

| Feature | Details |
|---|---|
| 🏢 **25 Nested Stacks** | Single `root.yaml` orchestrates the entire infrastructure |
| 🎛️ **~150 Parameters** | Every resource is configurable with sensible defaults |
| 🌍 **Multi-AZ** | Deploy across 2 or 3 Availability Zones via `NumberOfAZs` |
| 🔒 **HTTPS/TLS Ready** | Optional ACM cert, HTTP→HTTPS redirect, TLS 1.3 security policy |
| 🐳 **Dual Launch Types** | Switch between `FARGATE` and `EC2` per service |
| 🐘 **Engine-Aware RDS** | MySQL/MariaDB vs PostgreSQL log exports via Conditions |
| 🛡️ **Zero `Resource: '*'`** | Every IAM policy is scoped to specific ARNs and `kms:ViaService` |
| 🔐 **Secrets Injection** | Secrets Manager → ECS container env vars (never in CF state) |
| 📊 **Full Observability** | CloudWatch dashboards, alarms, log groups + CloudTrail audit |
| 🛡️ **WAF Protection** | Rate limiting, IP reputation blocking, AWS managed rule groups |
| 🪣 **Lifecycle Policies** | S3 versioning, transitions to IA/Glacier, noncurrent expiry |
| ♻️ **DeletionPolicy: Retain** | VPC, IGW, EIPs, log groups, ECR repos, secrets protected |
| ✅ **cfn-lint Validated** | 0 errors, 0 actionable warnings across all 26 templates |

---

## ⚡ Quick Start

### Prerequisites

- ☁️ AWS CLI configured with appropriate credentials
- 🪣 An S3 bucket in the same region for template storage
- 🐳 (Optional) Docker images pushed to ECR

### 1️⃣ Upload Templates to S3

```bash
aws s3 sync . s3://YOUR-BUCKET/Three-Tier/ \
  --exclude ".git/*" \
  --exclude "MasterClass/*" \
  --exclude "*.md"
```

### 2️⃣ Deploy — Minimal (Dev/Test)

```bash
aws cloudformation create-stack \
  --stack-name my-3tier-dev \
  --template-url https://YOUR-BUCKET.s3.amazonaws.com/Three-Tier/root.yaml \
  --parameters \
    ParameterKey=TemplatesBucketName,ParameterValue=YOUR-BUCKET \
    ParameterKey=EnvironmentName,ParameterValue=dev \
  --capabilities CAPABILITY_NAMED_IAM
```

### 3️⃣ Deploy — Production (HTTPS + 3-AZ + Custom Domain)

```bash
aws cloudformation create-stack \
  --stack-name my-3tier-prod \
  --template-url https://YOUR-BUCKET.s3.amazonaws.com/Three-Tier/root.yaml \
  --parameters \
    ParameterKey=TemplatesBucketName,ParameterValue=YOUR-BUCKET \
    ParameterKey=EnvironmentName,ParameterValue=prod \
    ParameterKey=NumberOfAZs,ParameterValue=3 \
    ParameterKey=ACMCertificateArn,ParameterValue=arn:aws:acm:REGION:ACCOUNT:certificate/ID \
    ParameterKey=HostedZoneName,ParameterValue=example.com \
    ParameterKey=AppSubdomain,ParameterValue=app \
    ParameterKey=DBMultiAZ,ParameterValue=true \
  --capabilities CAPABILITY_NAMED_IAM
```

---

## 🔧 Parameter Highlights

<details>
<summary>🌐 <b>Networking</b> — Click to expand</summary>

| Parameter | Default | Tag |
|---|---|---|
| `NumberOfAZs` | `3` | 🔴 IMPORTANT |
| `VpcCIDR` | `10.0.0.0/16` | 🔴 CRITICAL |
| `PublicSubnetCIDR1/2/3` | `10.0.1-3.0/24` | 🟡 OPTIONAL |
| `PrivateSubnetCIDR1/2/3` | `10.0.11-13.0/24` | 🟡 OPTIONAL |
| `DataSubnetCIDR1/2/3` | `10.0.21-23.0/24` | 🟡 OPTIONAL |

</details>

<details>
<summary>🖥️ <b>Compute (ECS)</b> — Click to expand</summary>

| Parameter | Default | Tag |
|---|---|---|
| `FrontendLaunchType` | `FARGATE` | 🔴 IMPORTANT |
| `BackendLaunchType` | `FARGATE` | 🔴 IMPORTANT |
| `FrontendImage` | `nginx:latest` | 🔴 CRITICAL |
| `BackendImage` | `nginx:latest` | 🔴 CRITICAL |
| `FrontendCpu/Memory` | `256/512` | 🟡 OPTIONAL |
| `BackendCpu/Memory` | `256/512` | 🟡 OPTIONAL |
| `FrontendDesiredCount` | `2` | 🟡 OPTIONAL |
| `BackendDesiredCount` | `2` | 🟡 OPTIONAL |

</details>

<details>
<summary>🗄️ <b>Database (RDS)</b> — Click to expand</summary>

| Parameter | Default | Tag |
|---|---|---|
| `DBEngine` | `mysql` | 🔴 IMPORTANT |
| `DBInstanceClass` | `db.t3.micro` | 🟡 OPTIONAL |
| `DBAllocatedStorage` | `20` | 🟡 OPTIONAL |
| `DBMultiAZ` | `false` | 🔴 IMPORTANT |
| `DBBackupRetentionPeriod` | `7` | 🟡 OPTIONAL |
| `DBMasterUsername` | `admin` | 🔴 CRITICAL |

</details>

<details>
<summary>🔒 <b>Security & HTTPS</b> — Click to expand</summary>

| Parameter | Default | Tag |
|---|---|---|
| `ACMCertificateArn` | _(empty)_ | 🔴 IMPORTANT |
| `SSLPolicy` | `ELBSecurityPolicy-TLS13-1-2-2021-06` | 🟡 OPTIONAL |
| `WAFRateLimit` | `2000` | 🟡 OPTIONAL |
| `HostedZoneName` | _(empty)_ | 🟡 OPTIONAL |

</details>

---

## 🛡️ Security Posture

```
✅ No Security Group allows 0.0.0.0/0 to backend or data tiers
✅ All IAM policies scoped — zero Resource: '*' anywhere
✅ kms:ViaService conditions on KMS key policies
✅ Database credentials stored in Secrets Manager (never in CF state)
✅ S3 buckets: BucketKeyEnabled, PublicAccessBlock, encrypted
✅ CloudTrail enabled for API audit logging
✅ WAF rate-limiting and AWS managed rule groups
✅ DeletionPolicy: Retain on all critical resources
✅ TLS 1.3 enforced on ALB HTTPS listeners
```

---

## 📚 MasterClass — Deep-Dive Learning Course

This repository includes an **11-chapter guided learning path** in the `MasterClass/` folder — from CloudFormation basics to advanced interview questions.

| # | Chapter | What You'll Learn |
|---|---|---|
| 1 | ☁️ Introduction to IaC | Why CloudFormation, template anatomy |
| 2 | 📝 Core Template Elements | Parameters, Resources, Outputs, Conditions |
| 3 | 🌐 Networking Foundations | VPC, subnets, routing, multi-AZ design |
| 4 | 🔐 Security & IAM | SG chaining, least privilege, KMS scoping |
| 5 | ⚖️ Load Balancing | ALB, target groups, health checks, HTTPS |
| 6 | 🖥️ Compute Layer | ECS, Fargate vs EC2, task definitions |
| 7 | 🗄️ Databases & Storage | RDS, S3, encryption, backup strategies |
| 8 | 🤫 Secrets Management | Secrets Manager, secure injection patterns |
| 9 | 🧩 Nested Stacks | Blast radius reduction, dependency graphs |
| 10 | 📊 Advanced Functions | Intrinsic functions, monitoring, observability |
| 11 | 🧠 Interview Questions | 10 tricky questions with expert answers |

---

## 📋 Template Validation

All 26 templates pass `cfn-lint` with **0 errors and 0 actionable warnings**.

```bash
# Validate all templates
cfn-lint root.yaml networking/*.yaml loadbalancer/*.yaml compute/*.yaml \
  database/*.yaml security/*.yaml iam/*.yaml secrets/*.yaml registry/*.yaml \
  storage/*.yaml monitoring/*.yaml dns/*.yaml
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Validate with `cfn-lint` before committing
4. Open a Pull Request

---

## 📜 License

This project is open source and available for educational and production use.

---

<p align="center">
  <b>Built with ☁️ by engineers, for engineers.</b><br/>
  <i>Stop clicking. Start automating.</i>
</p>
