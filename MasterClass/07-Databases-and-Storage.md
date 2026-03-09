# Chapter 7: Databases and Storage

Stateful components—databases, object storage, and file systems—require vastly different operational handling than stateless compute layer containers. If a container dies, you spin up a new one in seconds. If a database is accidentally dropped via an IaC update, you suffer catastrophic data loss.

## RDS Placement and Subnet Groups
Databases must always reside in the deepest layer of your architecture: your Private Data Subnets.

To place an RDS instance, you must create an `AWS::RDS::DBSubnetGroup`. This group specifies across which Availability Zones the database can be deployed.

```yaml
MyDBSubnetGroup:
  Type: AWS::RDS::DBSubnetGroup
  Properties:
    DBSubnetGroupDescription: Private subnets for the RDS cluster
    SubnetIds:
      - !Ref PrivateDataSubnet1
      - !Ref PrivateDataSubnet2
      - !If [Has3AZs, !Ref PrivateDataSubnet3, !Ref 'AWS::NoValue']
```

> **Conditional 3rd subnet.** The DB subnet group now conditionally includes a third subnet when `Has3AZs` is true. This adapts the template to regions with three Availability Zones while remaining compatible with two-AZ regions. The `!If [Has3AZs, ..., !Ref 'AWS::NoValue']` pattern cleanly omits the entry when the condition is false.

For production reliability, always enable `MultiAZ: true`. AWS will synchronously replicate your data to a standby instance in the secondary AZ. If the primary crashes, DNS automatically fails over to the standby within ~60 seconds.

## Data Safety Policies (The Most Critical CloudFormation Setting)
By default, if you remove a resource from a CloudFormation template (or change an immutable property that forces a replacement), CloudFormation deletes it. For a database, this is usually disastrous.

You must explicitly define lifecycle policies on all stateful resources.

*   `DeletionPolicy: Snapshot`: If the stack is deleted, CloudFormation takes a final snapshot before destroying the instance.
*   `UpdateReplacePolicy: Snapshot`: If an update requires replacing the DB (e.g., changing the physical encryption key), it snapshots the old one first. You can also use `Retain` to orphan the resource instead of destroying it.

```yaml
MyProductionDatabase:
  Type: AWS::RDS::DBInstance
  DeletionPolicy: Snapshot
  UpdateReplacePolicy: Snapshot
  Properties:
    Engine: mysql
    MultiAZ: true
    PubliclyAccessible: false # NEVER SET THIS TO TRUE
    PreferredBackupWindow: '01:00-02:00'        # Avoids overlap with maintenance
    PreferredMaintenanceWindow: 'Sun:03:00-Sun:04:00'
    EnableCloudwatchLogsExports:
      !If
        - IsMySQLOrMariaDB
        - [error, general, slowquery]
        - [postgresql, upgrade]
    VPCSecurityGroups:
      - !Ref DatabaseSecurityGroup
```

> **Backup window changed to `01:00-02:00`.** The previous window (`02:00-03:00`) overlapped with the maintenance window at `Sun:03:00-Sun:04:00`. Shifting backup earlier to `01:00-02:00` ensures the two operations never compete for I/O or cause unexpected downtime.

> **`EnableCloudwatchLogsExports` is engine-conditional.** Using `!If [IsMySQLOrMariaDB, [error, general, slowquery], [postgresql, upgrade]]`, the template exports the correct log types based on the selected database engine. MySQL and MariaDB support `error`, `general`, and `slowquery` logs; PostgreSQL supports `postgresql` and `upgrade` logs.

> **`DatabasePort` parameter.** A new `DatabasePort` parameter has been added to `root.yaml` and is passed to both the RDS stack and the backend task definition. This centralizes port configuration and avoids drift between the database listener port and what the application connects to.

## S3 Security Posture
S3 buckets are routinely the source of major corporate data breaches due to simple misconfigurations. Treat object storage as a hard security boundary.

**The Golden Rules of S3:**
1.  **Block Public Access**: Explicitly block ACLs and public policies at the bucket level unless you are hosting a public website.
2.  **Server-Side Encryption**: Always encrypt data at rest (`BucketEncryption`).
3.  **Strict Bucket Policies**: If only the backend ECS task needs to write to the bucket, the Bucket Policy should explicitly deny all other principals.

```yaml
SecureAppBucket:
  Type: AWS::S3::Bucket
  Properties:
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      BlockPublicPolicy: true
      IgnorePublicAcls: true
      RestrictPublicBuckets: true
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: AES256 # Or aws:kms for stricter key rotation
```

---

## ALB Access Logs: S3 Bucket Policy with ELB Account ID Mapping

When S3 buckets are used for ALB access logs, the bucket policy must authorize the **regional ELB service account** to write objects. AWS uses a different account ID per region (28 regions currently). The template uses a `Mappings` section keyed by region, resolved via `!FindInMap [ElbAccountId, !Ref 'AWS::Region', AccountId]`. This is the same pattern described in Chapter 5, applied here because the access-log bucket is a storage concern.

---

## 🎯 God-Level Checklist for Chapter 7
- [ ] **Does your database live exclusively in private data subnets?** (Answer: Yes. It is placed via a DBSubnetGroup referencing subnets with no IGW or NAT route.)
- [ ] **Have you set `DeletionPolicy` before the first deployment?** (Answer: Yes. Adding it *after* deployment implies the database could be silently destroyed during the update that was supposed to apply the protection policy.)
- [ ] **Are your S3 buckets protected against accidental exposure at the protocol level?** (Answer: Yes, utilizing `PublicAccessBlockConfiguration` overrides any future sloppy ACL additions, stopping leaks at the source).
- [ ] **Does the DB subnet group adapt to 3-AZ regions?** (Answer: Yes. The third subnet is conditionally included via `!If [Has3AZs, ...]`.)
- [ ] **Are CloudWatch log exports correct for your chosen engine?** (Answer: Yes. The `IsMySQLOrMariaDB` condition selects the appropriate log types automatically.)
