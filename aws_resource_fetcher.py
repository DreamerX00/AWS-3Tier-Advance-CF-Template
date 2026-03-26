#!/usr/bin/env python3
"""
AWS Resource Fetcher — Cached boto3 lookups + Pre-flight validation.
=====================================================================
Each fetcher returns List[str] suitable for dropdown population.
All calls are cached with a 5-minute TTL and degrade gracefully (return [])
when credentials are missing or API calls fail.

Pre-flight validation catches issues like non-existent KMS keys, invalid IAM
roles, expired ACM certificates, etc. BEFORE CloudFormation deployment.
"""

import os
import time
import configparser
import urllib.request
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass, field

import boto3
from botocore.exceptions import ClientError, NoCredentialsError, BotoCoreError


# ─────────────────────────────────────────────────────────────
# Structured Fetch Result
# ─────────────────────────────────────────────────────────────
@dataclass
class FetchResult:
    """Structured result from an AWS fetcher call."""
    values: List[str] = field(default_factory=list)
    status: str = "ok"  # ok | permission_error | no_credentials | error
    error_message: str = ""
    required_permission: str = ""


_PERMISSION_HINTS: Dict[str, str] = {
    "s3_buckets": "s3:ListAllMyBuckets",
    "s3_prefixes": "s3:ListBucket",
    "iam_roles": "iam:ListRoles",
    "azs": "ec2:DescribeAvailabilityZones",
    "vpcs": "ec2:DescribeVpcs",
    "instance_types": "ec2:DescribeInstanceTypeOfferings",
    "ecr_repos": "ecr:DescribeRepositories",
    "ecr_images": "ecr:DescribeImages",
    "db_engine_versions": "rds:DescribeDBEngineVersions",
    "db_instance_classes": "rds:DescribeOrderableDBInstanceOptions",
    "acm": "acm:ListCertificates",
    "hosted_zones": "route53:ListHostedZones",
    "kms": "kms:ListAliases",
    "stacks": "cloudformation:ListStacks",
    "ssl_policies": "elasticloadbalancing:DescribeSSLPolicies",
    "profiles": "",
    "my_ip": "",
}


def fetch_values(result) -> List[str]:
    """Extract plain List[str] from a FetchResult (backward compat helper)."""
    if isinstance(result, FetchResult):
        return result.values
    if isinstance(result, list):
        return result
    return []


# ─────────────────────────────────────────────────────────────
# TTL Cache
# ─────────────────────────────────────────────────────────────
_cache: Dict[str, Tuple[float, Any]] = {}
_CACHE_TTL = 300  # 5 minutes


def _cached(key: str):
    """Decorator: cache return value for _CACHE_TTL seconds, keyed by `key` + args.
    Returns FetchResult with structured error info on failure."""
    def decorator(fn):
        def wrapper(*args, **kwargs):
            full_key = f"{key}:{args}:{kwargs}"
            now = time.time()
            if full_key in _cache and now - _cache[full_key][0] < _CACHE_TTL:
                return _cache[full_key][1]
            try:
                result = fn(*args, **kwargs)
            except NoCredentialsError:
                fr = FetchResult(
                    status="no_credentials",
                    error_message="No AWS credentials found",
                )
                return _cache.get(full_key, (0, fr))[1]
            except ClientError as e:
                code = e.response.get("Error", {}).get("Code", "")
                if code in ("AccessDenied", "AccessDeniedException",
                            "UnauthorizedAccess", "AuthFailure"):
                    perm = _PERMISSION_HINTS.get(key, "")
                    fr = FetchResult(
                        status="permission_error",
                        error_message=str(e),
                        required_permission=perm,
                    )
                else:
                    fr = FetchResult(
                        status="error",
                        error_message=str(e),
                    )
                return _cache.get(full_key, (0, fr))[1]
            except (BotoCoreError, Exception) as e:
                fr = FetchResult(
                    status="error",
                    error_message=str(e),
                )
                return _cache.get(full_key, (0, fr))[1]
            wrapped = FetchResult(values=result, status="ok")
            _cache[full_key] = (now, wrapped)
            return wrapped
        wrapper._cache_prefix = key
        return wrapper
    return decorator


def clear_cache(prefix: Optional[str] = None):
    """Clear all cache entries, or only those matching a prefix."""
    if prefix is None:
        _cache.clear()
    else:
        for k in list(_cache):
            if k.startswith(prefix):
                del _cache[k]


def clear_region_cache():
    """Clear all region-dependent caches."""
    for prefix in ("azs", "vpcs", "instance_types", "acm", "kms",
                    "stacks", "db_instance_classes", "ssl_policies",
                    "db_engine_versions", "ecr_repos", "ecr_images"):
        clear_cache(prefix)


# ─────────────────────────────────────────────────────────────
# Session helper
# ─────────────────────────────────────────────────────────────
_session: Optional[boto3.Session] = None


def set_session(session: boto3.Session):
    global _session
    _session = session


def _get_session() -> boto3.Session:
    return _session or boto3.Session()


def _client(service: str, region: Optional[str] = None):
    s = _get_session()
    kwargs = {}
    if region:
        kwargs["region_name"] = region
    return s.client(service, **kwargs)


# ─────────────────────────────────────────────────────────────
# Fetchers
# ─────────────────────────────────────────────────────────────

@_cached("profiles")
def fetch_aws_profiles() -> List[str]:
    """Parse ~/.aws/config and ~/.aws/credentials for profile names."""
    profiles = set()
    for path in [os.path.expanduser("~/.aws/credentials"),
                 os.path.expanduser("~/.aws/config")]:
        if not os.path.isfile(path):
            continue
        cp = configparser.ConfigParser()
        cp.read(path)
        for section in cp.sections():
            name = section.replace("profile ", "")
            if name != "DEFAULT":
                profiles.add(name)
    profiles.add("default")
    return sorted(profiles)


@_cached("s3_buckets")
def fetch_s3_buckets() -> List[str]:
    resp = _client("s3").list_buckets()
    return [b["Name"] for b in resp.get("Buckets", [])]


@_cached("s3_prefixes")
def fetch_s3_prefixes(bucket: str) -> List[str]:
    if not bucket:
        return []
    resp = _client("s3").list_objects_v2(Bucket=bucket, Delimiter="/", MaxKeys=200)
    return [p["Prefix"].rstrip("/") for p in resp.get("CommonPrefixes", [])]


@_cached("iam_roles")
def fetch_iam_roles() -> List[str]:
    iam = _client("iam")
    roles = []
    paginator = iam.get_paginator("list_roles")
    for page in paginator.paginate(MaxItems=200):
        for r in page["Roles"]:
            roles.append(r["Arn"])
    return roles


@_cached("azs")
def fetch_availability_zones(region: str) -> List[str]:
    resp = _client("ec2", region).describe_availability_zones(
        Filters=[{"Name": "state", "Values": ["available"]}])
    return [az["ZoneName"] for az in resp["AvailabilityZones"]]


@_cached("vpcs")
def fetch_existing_vpcs(region: str) -> List[str]:
    resp = _client("ec2", region).describe_vpcs()
    results = []
    for vpc in resp["Vpcs"]:
        name = ""
        for tag in vpc.get("Tags", []):
            if tag["Key"] == "Name":
                name = tag["Value"]
                break
        cidr = vpc["CidrBlock"]
        vid = vpc["VpcId"]
        label = f"{cidr} ({vid})"
        if name:
            label = f"{cidr} ({name} / {vid})"
        results.append(label)
    return results


@_cached("instance_types")
def fetch_instance_types(region: str) -> List[str]:
    ec2 = _client("ec2", region)
    types = set()
    paginator = ec2.get_paginator("describe_instance_type_offerings")
    for page in paginator.paginate(LocationType="region",
                                    Filters=[{"Name": "location", "Values": [region]}]):
        for o in page["InstanceTypeOfferings"]:
            types.add(o["InstanceType"])
    common_prefixes = ["t3.", "t3a.", "t2.", "m5.", "m6i.", "c5.", "c6i.", "r5.", "r6i."]
    common = sorted([t for t in types if any(t.startswith(p) for p in common_prefixes)])
    rest = sorted(types - set(common))
    return common + rest


@_cached("ecr_repos")
def fetch_ecr_repositories(region: Optional[str] = None) -> List[str]:
    ecr = _client("ecr", region)
    repos = []
    paginator = ecr.get_paginator("describe_repositories")
    for page in paginator.paginate():
        for r in page["repositories"]:
            repos.append(r["repositoryName"])
    return sorted(repos)


@_cached("ecr_images")
def fetch_ecr_images(repo: str, region: Optional[str] = None) -> List[str]:
    if not repo:
        return []
    ecr = _client("ecr", region)
    tags = []
    paginator = ecr.get_paginator("describe_images")
    for page in paginator.paginate(repositoryName=repo, maxResults=100):
        for img in page["imageDetails"]:
            for tag in img.get("imageTags", []):
                tags.append(tag)
    return sorted(tags, reverse=True)


@_cached("db_engine_versions")
def fetch_db_engine_versions(engine: str) -> List[str]:
    if not engine:
        return []
    rds = _client("rds")
    versions = []
    paginator = rds.get_paginator("describe_db_engine_versions")
    for page in paginator.paginate(Engine=engine):
        for v in page["DBEngineVersions"]:
            versions.append(v["EngineVersion"])
    return versions


@_cached("db_instance_classes")
def fetch_db_instance_classes(engine: str, region: str) -> List[str]:
    if not engine:
        return []
    rds = _client("rds", region)
    classes = set()
    paginator = rds.get_paginator("describe_orderable_db_instance_options")
    for page in paginator.paginate(Engine=engine, MaxRecords=100):
        for o in page["OrderableDBInstanceOptions"]:
            classes.add(o["DBInstanceClass"])
    common = ["db.t3.micro", "db.t3.small", "db.t3.medium",
              "db.r5.large", "db.r6g.large", "db.m5.large"]
    result = [c for c in common if c in classes]
    result += sorted(classes - set(result))
    return result


@_cached("acm")
def fetch_acm_certificates(region: str) -> List[str]:
    acm = _client("acm", region)
    certs = []
    paginator = acm.get_paginator("list_certificates")
    for page in paginator.paginate(CertificateStatuses=["ISSUED"]):
        for c in page["CertificateSummaryList"]:
            domain = c.get("DomainName", "")
            arn = c["CertificateArn"]
            certs.append(f"{arn} ({domain})" if domain else arn)
    return certs


@_cached("hosted_zones")
def fetch_hosted_zones() -> List[str]:
    r53 = _client("route53")
    zones = []
    paginator = r53.get_paginator("list_hosted_zones")
    for page in paginator.paginate():
        for z in page["HostedZones"]:
            zones.append(z["Name"].rstrip("."))
    return zones


@_cached("kms")
def fetch_kms_keys(region: str) -> List[str]:
    kms = _client("kms", region)
    keys = []
    paginator = kms.get_paginator("list_aliases")
    for page in paginator.paginate():
        for a in page["Aliases"]:
            if not a["AliasName"].startswith("alias/aws/"):
                keys.append(f"{a['AliasName']} ({a.get('TargetKeyId', 'N/A')})")
    return keys


@_cached("stacks")
def fetch_existing_stacks(region: str) -> List[str]:
    cf = _client("cloudformation", region)
    stacks = []
    paginator = cf.get_paginator("list_stacks")
    for page in paginator.paginate(StackStatusFilter=[
            "CREATE_COMPLETE", "UPDATE_COMPLETE", "UPDATE_ROLLBACK_COMPLETE",
            "ROLLBACK_COMPLETE", "CREATE_FAILED"]):
        for s in page["StackSummaries"]:
            stacks.append(f"{s['StackName']} ({s['StackStatus']})")
    return stacks


@_cached("my_ip")
def fetch_my_ip() -> List[str]:
    try:
        req = urllib.request.urlopen("https://checkip.amazonaws.com", timeout=5)
        ip = req.read().decode().strip()
        return [f"{ip}/32"]
    except Exception:
        return []


@_cached("ssl_policies")
def fetch_ssl_policies() -> List[str]:
    elbv2 = _client("elbv2")
    policies = []
    resp = elbv2.describe_ssl_policies()
    for p in resp.get("SslPolicies", []):
        policies.append(p["Name"])
    return sorted(policies)


# ═══════════════════════════════════════════════════════════════
# PRE-FLIGHT VALIDATION ENGINE
# ═══════════════════════════════════════════════════════════════

@dataclass
class PreflightCheck:
    name: str
    status: str = "pending"   # pending, pass, fail, warn, skip
    message: str = ""
    fix_hint: str = ""


def preflight_validate(parameters: Dict[str, str], region: str,
                       role_arn: str = "", s3_bucket: str = "",
                       s3_prefix: str = "") -> List[PreflightCheck]:
    """
    Run all pre-flight checks against the current AWS account.
    Returns a list of PreflightCheck results.
    """
    checks: List[PreflightCheck] = []

    # 1. STS identity
    checks.append(_check_sts_identity())

    # 2. S3 bucket access
    if s3_bucket:
        checks.append(_check_s3_bucket(s3_bucket, s3_prefix))

    # 3. IAM execution role
    if role_arn:
        checks.append(_check_iam_role(role_arn))

    # 4. KMS keys — check for ECR, S3, RDS encryption settings
    checks.extend(_check_kms_keys(parameters, region))

    # 5. ACM certificate
    acm_arn = parameters.get("ACMCertificateArn", "")
    if acm_arn:
        checks.append(_check_acm_certificate(acm_arn, region))

    # 6. Instance type availability
    instance_type = parameters.get("InstanceType", "")
    if instance_type:
        checks.append(_check_instance_type(instance_type, region))

    # 7. DB instance class availability
    db_class = parameters.get("DBInstanceClass", "")
    db_engine = parameters.get("DBEngine", "")
    if db_class and db_engine:
        checks.append(_check_db_instance_class(db_class, db_engine, region))

    # 8. Availability zones
    num_azs = parameters.get("NumberOfAZs", "2")
    checks.append(_check_availability_zones(int(num_azs), region))

    # 9. ECR encryption type
    ecr_enc = parameters.get("ECREncryptionType", "AES256")
    if ecr_enc == "KMS":
        checks.append(_check_ecr_kms_default_key(region))

    # 10. Hosted zone
    hosted_zone = parameters.get("HostedZoneName", "")
    if hosted_zone:
        checks.append(_check_hosted_zone(hosted_zone))

    return checks


def _check_sts_identity() -> PreflightCheck:
    c = PreflightCheck(name="AWS Identity (STS)")
    try:
        sts = _client("sts")
        identity = sts.get_caller_identity()
        c.status = "pass"
        c.message = f"Authenticated as {identity['Arn']} (Account: {identity['Account']})"
    except Exception as e:
        c.status = "fail"
        c.message = f"Cannot authenticate: {e}"
        c.fix_hint = "Check AWS credentials — set AWS_PROFILE, access keys, or run 'aws configure'."
    return c


def _check_s3_bucket(bucket: str, prefix: str) -> PreflightCheck:
    c = PreflightCheck(name=f"S3 Bucket: {bucket}")
    try:
        s3 = _client("s3")
        s3.head_bucket(Bucket=bucket)
        # Check if root.yaml exists
        if prefix:
            try:
                s3.head_object(Bucket=bucket, Key=f"{prefix}/root.yaml")
                c.status = "pass"
                c.message = f"Bucket accessible, root.yaml found at {prefix}/root.yaml"
            except ClientError:
                c.status = "warn"
                c.message = f"Bucket accessible but {prefix}/root.yaml not found — will be uploaded if sync is enabled"
        else:
            c.status = "pass"
            c.message = "Bucket accessible"
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code == "404":
            c.status = "fail"
            c.message = f"Bucket '{bucket}' does not exist"
            c.fix_hint = f"Create the bucket: aws s3 mb s3://{bucket}"
        elif code == "403":
            c.status = "fail"
            c.message = f"Access denied to bucket '{bucket}'"
            c.fix_hint = "Check bucket policy and IAM permissions for s3:ListBucket, s3:GetObject, s3:PutObject."
        else:
            c.status = "fail"
            c.message = str(e)
    except Exception as e:
        c.status = "fail"
        c.message = str(e)
    return c


def _check_iam_role(role_arn: str) -> PreflightCheck:
    c = PreflightCheck(name=f"IAM Role: {role_arn.split('/')[-1]}")
    try:
        iam = _client("iam")
        role_name = role_arn.split("/")[-1]
        resp = iam.get_role(RoleName=role_name)
        # Check it can be assumed by CloudFormation
        trust = str(resp["Role"].get("AssumeRolePolicyDocument", {}))
        if "cloudformation.amazonaws.com" in trust:
            c.status = "pass"
            c.message = f"Role exists and trusts cloudformation.amazonaws.com"
        else:
            c.status = "warn"
            c.message = "Role exists but trust policy may not allow CloudFormation to assume it"
            c.fix_hint = "Add cloudformation.amazonaws.com as a trusted principal in the role's trust policy."
    except ClientError as e:
        if "NoSuchEntity" in str(e):
            c.status = "fail"
            c.message = f"IAM role does not exist: {role_arn}"
            c.fix_hint = "Create the role or remove role_arn from config to use caller identity instead."
        else:
            c.status = "fail"
            c.message = str(e)
    except Exception as e:
        c.status = "fail"
        c.message = str(e)
    return c


def _check_kms_keys(parameters: Dict[str, str], region: str) -> List[PreflightCheck]:
    """Check all encryption-related parameters that reference KMS."""
    checks = []

    # Services that use KMS when set to 'aws:kms' or 'KMS'
    kms_fields = {
        "AssetsBucketEncryptionAlgorithm": ("S3 Assets Encryption", "aws:kms"),
        "AccessLogsBucketEncryptionAlgorithm": ("S3 Access Logs Encryption", "aws:kms"),
        "TrailBucketEncryptionAlgorithm": ("CloudTrail Encryption", "aws:kms"),
        "ECREncryptionType": ("ECR Encryption", "KMS"),
    }

    for param, (label, kms_value) in kms_fields.items():
        val = parameters.get(param, "")
        if val == kms_value:
            c = PreflightCheck(name=f"KMS: {label}")
            try:
                kms = _client("kms", region)
                # Check that the default service key exists and is enabled
                service_map = {
                    "AssetsBucketEncryptionAlgorithm": "alias/aws/s3",
                    "AccessLogsBucketEncryptionAlgorithm": "alias/aws/s3",
                    "TrailBucketEncryptionAlgorithm": "alias/aws/s3",
                    "ECREncryptionType": "alias/aws/ecr",
                }
                alias = service_map.get(param, "alias/aws/s3")
                try:
                    resp = kms.describe_key(KeyId=alias)
                    key_state = resp["KeyMetadata"]["KeyState"]
                    key_id = resp["KeyMetadata"]["KeyId"]
                    if key_state == "Enabled":
                        c.status = "pass"
                        c.message = f"Default KMS key ({alias}) is active — Key ID: {key_id}"
                    else:
                        c.status = "fail"
                        c.message = f"Default KMS key ({alias}) exists but state is '{key_state}'"
                        c.fix_hint = (
                            f"The KMS key is in '{key_state}' state. "
                            f"Either re-enable it, or switch {param} to 'AES256' to avoid KMS."
                        )
                except ClientError as e:
                    error_code = e.response["Error"]["Code"]
                    if error_code == "NotFoundException":
                        c.status = "fail"
                        c.message = (
                            f"Default KMS key ({alias}) does not exist in {region}. "
                            f"This WILL cause stack creation to fail."
                        )
                        c.fix_hint = (
                            f"FIX: Change '{param}' from '{kms_value}' to 'AES256', "
                            f"OR create the KMS key first. The default aws-managed key "
                            f"is auto-created on first use of the service, but if it was "
                            f"deleted/scheduled for deletion, you must wait or use AES256."
                        )
                    elif error_code == "AccessDeniedException":
                        c.status = "warn"
                        c.message = f"Cannot verify KMS key ({alias}) — access denied"
                        c.fix_hint = "Add kms:DescribeKey permission to check key state before deploy."
                    else:
                        c.status = "fail"
                        c.message = f"KMS error for {alias}: {e}"
            except Exception as e:
                c.status = "warn"
                c.message = f"Could not verify KMS key: {e}"
            checks.append(c)

    # Check if StorageEncrypted=true for RDS (uses default aws/rds key)
    if parameters.get("StorageEncrypted", "true").lower() == "true":
        c = PreflightCheck(name="KMS: RDS Storage Encryption")
        try:
            kms = _client("kms", region)
            resp = kms.describe_key(KeyId="alias/aws/rds")
            state = resp["KeyMetadata"]["KeyState"]
            if state == "Enabled":
                c.status = "pass"
                c.message = f"Default RDS KMS key (alias/aws/rds) is active"
            else:
                c.status = "fail"
                c.message = f"Default RDS KMS key state: '{state}'"
                c.fix_hint = "Set StorageEncrypted=false or fix the KMS key."
        except ClientError as e:
            if "NotFoundException" in str(e):
                c.status = "warn"
                c.message = "Default RDS KMS key not yet created (will be auto-created on first use)"
            else:
                c.status = "warn"
                c.message = f"Cannot verify RDS KMS key: {e}"
        except Exception as e:
            c.status = "warn"
            c.message = str(e)
        checks.append(c)

    return checks


def _check_acm_certificate(arn: str, region: str) -> PreflightCheck:
    c = PreflightCheck(name=f"ACM Certificate")
    # Extract just the ARN if it has a description suffix
    actual_arn = arn.split(" (")[0].strip() if " (" in arn else arn
    try:
        acm = _client("acm", region)
        resp = acm.describe_certificate(CertificateArn=actual_arn)
        cert = resp["Certificate"]
        status = cert["Status"]
        domain = cert.get("DomainName", "")
        if status == "ISSUED":
            c.status = "pass"
            c.message = f"Certificate valid for {domain} (Status: ISSUED)"
        elif status == "PENDING_VALIDATION":
            c.status = "warn"
            c.message = f"Certificate for {domain} is PENDING_VALIDATION"
            c.fix_hint = "Complete DNS or email validation before deploying the ALB HTTPS listener."
        elif status == "EXPIRED":
            c.status = "fail"
            c.message = f"Certificate for {domain} has EXPIRED"
            c.fix_hint = "Request a new certificate or enable auto-renewal."
        else:
            c.status = "warn"
            c.message = f"Certificate status: {status}"
    except ClientError as e:
        if "ResourceNotFoundException" in str(e):
            c.status = "fail"
            c.message = f"ACM certificate not found: {actual_arn}"
            c.fix_hint = "The certificate ARN doesn't exist. Request a new one or clear the field."
        else:
            c.status = "fail"
            c.message = str(e)
    except Exception as e:
        c.status = "fail"
        c.message = str(e)
    return c


def _check_instance_type(instance_type: str, region: str) -> PreflightCheck:
    c = PreflightCheck(name=f"EC2 Instance Type: {instance_type}")
    try:
        available = fetch_values(fetch_instance_types(region))
        if instance_type in available:
            c.status = "pass"
            c.message = f"{instance_type} is available in {region}"
        else:
            c.status = "fail"
            c.message = f"{instance_type} is NOT available in {region}"
            c.fix_hint = f"Choose a different instance type. Common options: t3.micro, t3.small, m5.large"
    except Exception as e:
        c.status = "warn"
        c.message = f"Could not verify: {e}"
    return c


def _check_db_instance_class(db_class: str, engine: str, region: str) -> PreflightCheck:
    c = PreflightCheck(name=f"RDS Instance Class: {db_class}")
    try:
        available = fetch_values(fetch_db_instance_classes(engine, region))
        if db_class in available:
            c.status = "pass"
            c.message = f"{db_class} is available for {engine} in {region}"
        else:
            c.status = "fail"
            c.message = f"{db_class} is NOT available for {engine} in {region}"
            suggestions = available[:5] if available else []
            c.fix_hint = f"Available classes: {', '.join(suggestions)}" if suggestions else "Check engine/region combination."
    except Exception as e:
        c.status = "warn"
        c.message = f"Could not verify: {e}"
    return c


def _check_availability_zones(num_azs: int, region: str) -> PreflightCheck:
    c = PreflightCheck(name=f"Availability Zones ({num_azs} required)")
    try:
        azs = fetch_values(fetch_availability_zones(region))
        if len(azs) >= num_azs:
            c.status = "pass"
            c.message = f"{len(azs)} AZs available in {region}: {', '.join(azs[:num_azs])}"
        else:
            c.status = "fail"
            c.message = f"Only {len(azs)} AZs in {region}, but {num_azs} requested"
            c.fix_hint = f"Reduce NumberOfAZs to {len(azs)} or choose a region with more AZs."
    except Exception as e:
        c.status = "warn"
        c.message = f"Could not verify: {e}"
    return c


def _check_ecr_kms_default_key(region: str) -> PreflightCheck:
    """Specifically check the ECR default KMS key — the exact error from the user's report."""
    c = PreflightCheck(name="KMS: ECR Default Key (aws/ecr)")
    try:
        kms = _client("kms", region)
        try:
            resp = kms.describe_key(KeyId="alias/aws/ecr")
            state = resp["KeyMetadata"]["KeyState"]
            key_arn = resp["KeyMetadata"]["Arn"]
            if state == "Enabled":
                c.status = "pass"
                c.message = f"ECR KMS key exists and is enabled: {key_arn}"
            elif state == "PendingDeletion":
                c.status = "fail"
                c.message = (
                    f"ECR KMS key ({key_arn}) is scheduled for deletion! "
                    f"This WILL cause ECR repository creation to fail."
                )
                c.fix_hint = (
                    "CRITICAL: Either cancel key deletion with "
                    f"'aws kms cancel-key-deletion --key-id {resp['KeyMetadata']['KeyId']}', "
                    "or change ECREncryptionType to 'AES256'."
                )
            else:
                c.status = "fail"
                c.message = f"ECR KMS key state: {state}"
                c.fix_hint = "Change ECREncryptionType to 'AES256' to avoid this KMS dependency."
        except ClientError as e:
            if "NotFoundException" in str(e):
                c.status = "warn"
                c.message = (
                    "ECR default KMS key (alias/aws/ecr) doesn't exist yet. "
                    "AWS should auto-create it, but if a previous key was deleted, "
                    "this may fail."
                )
                c.fix_hint = (
                    "Safest option: change ECREncryptionType to 'AES256'. "
                    "Or create an ECR repo manually first to trigger key creation."
                )
            else:
                c.status = "warn"
                c.message = f"Cannot verify ECR KMS key: {e}"
    except Exception as e:
        c.status = "warn"
        c.message = f"KMS check failed: {e}"
    return c


def _check_hosted_zone(zone_name: str, ) -> PreflightCheck:
    c = PreflightCheck(name=f"Route53 Hosted Zone: {zone_name}")
    try:
        zones = fetch_values(fetch_hosted_zones())
        normalized = zone_name.rstrip(".")
        if normalized in zones:
            c.status = "pass"
            c.message = f"Hosted zone '{normalized}' found"
        else:
            c.status = "fail"
            c.message = f"Hosted zone '{normalized}' not found in account"
            c.fix_hint = f"Create the hosted zone or update HostedZoneName. Available: {', '.join(zones[:5])}"
    except Exception as e:
        c.status = "warn"
        c.message = f"Could not verify: {e}"
    return c
