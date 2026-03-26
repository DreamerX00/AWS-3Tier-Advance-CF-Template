#!/usr/bin/env python3
"""
AWS 3-Tier CloudFormation — Deployment GUI (NiceGUI)
=====================================================
Modern web-based UI with sidebar navigation, dark mode, collapsible sections,
AWS auto-population, pre-flight validation, toast notifications, and search.

Usage:
    python3 deployment_gui.py
    python3 deployment_gui.py --config deploy-config.dev.yaml
    python3 deployment_gui.py --port 8080
"""

import os
import sys
import re
import asyncio
import threading
import time
import argparse
import subprocess
import ipaddress
from datetime import datetime, timezone
from typing import Dict, List, Optional

import yaml
import boto3
from botocore.exceptions import ClientError

from nicegui import ui, app, run

import aws_resource_fetcher as fetcher
from aws_resource_fetcher import FetchResult, fetch_values

# ═══════════════════════════════════════════════════════════════
# Parse root.yaml parameter metadata
# ═══════════════════════════════════════════════════════════════
def parse_root_parameters(root_yaml_path):
    if not os.path.isfile(root_yaml_path):
        return {}
    with open(root_yaml_path, "r") as f:
        lines = f.readlines()

    params = {}
    in_params = False
    current_param = None
    current_section = ""

    for line in lines:
        stripped = line.rstrip()
        if stripped.strip() == "Parameters:":
            in_params = True
            continue
        if in_params and stripped and not stripped.startswith(" ") and not stripped.startswith("#"):
            break
        if not in_params:
            continue

        cm = re.match(r"^\s*#\s+([A-Z][A-Z &/()-]+)\s*$", stripped)
        if cm:
            current_section = cm.group(1).strip()
            continue

        m = re.match(r"^  ([A-Z][A-Za-z0-9]+):$", stripped)
        if m:
            current_param = m.group(1)
            params[current_param] = {"section": current_section}
            continue

        if current_param and current_param in params:
            m2 = re.match(r"^    (Type|Default|Description|AllowedPattern|NoEcho):\s*(.*)", stripped)
            if m2:
                key, val = m2.group(1), m2.group(2).strip().strip("'\"")
                params[current_param][key] = val
                continue
            if re.match(r"^    AllowedValues:", stripped):
                inline = stripped.split(":", 1)[1].strip()
                if inline.startswith("["):
                    items = [x.strip().strip("'\"") for x in inline[1:-1].split(",")]
                    params[current_param]["AllowedValues"] = items
                else:
                    params[current_param]["AllowedValues"] = []
                continue
            m3 = re.match(r"^      - (.+)", stripped)
            if m3 and "AllowedValues" in params.get(current_param, {}):
                params[current_param]["AllowedValues"].append(m3.group(1).strip().strip("'\""))

    return params


# ═══════════════════════════════════════════════════════════════
# TAB / SECTION LAYOUT
# ═══════════════════════════════════════════════════════════════
TAB_LAYOUT = [
    {
        "name": "Credentials", "icon": "key",
        "description": "AWS authentication -- leave blank to use system defaults.",
        "sections": [
            {"title": "Authentication", "icon": "lock", "fields": [
                "__aws_profile", "__aws_access_key", "__aws_secret_key", "__aws_region"]},
        ],
    },
    {
        "name": "Stack Config", "icon": "settings",
        "description": "Stack identity, S3 template source, and IAM execution role.",
        "sections": [
            {"title": "Stack Identity", "icon": "badge", "fields": ["__stack_name", "EnvironmentName"]},
            {"title": "S3 Templates", "icon": "cloud_upload", "fields": [
                "__s3_bucket", "__s3_prefix", "__sync_templates", "TemplatesBucketName", "TemplatesPrefix"]},
            {"title": "IAM", "icon": "admin_panel_settings", "fields": ["__role_arn"]},
        ],
    },
    {
        "name": "Networking", "icon": "lan",
        "description": "VPC, subnets, availability zones, CIDR ranges, and security group ports.",
        "sections": [
            {"title": "VPC", "icon": "hub", "fields": [
                "NumberOfAZs", "VpcCIDR", "EnableDnsSupport", "EnableDnsHostnames",
                "VpcFlowLogRetentionDays", "VpcFlowLogTrafficType"]},
            {"title": "Public Subnets", "icon": "public", "fields": [
                "PublicSubnet1CIDR", "PublicSubnet2CIDR", "PublicSubnet3CIDR"]},
            {"title": "Private App Subnets", "icon": "security", "fields": [
                "PrivateAppSubnet1CIDR", "PrivateAppSubnet2CIDR", "PrivateAppSubnet3CIDR"]},
            {"title": "Private Data Subnets", "icon": "storage", "fields": [
                "PrivateDataSubnet1CIDR", "PrivateDataSubnet2CIDR", "PrivateDataSubnet3CIDR"]},
            {"title": "Ports & Ingress", "icon": "router", "fields": [
                "HttpPort", "HttpsPort", "FrontendAppPort", "BackendAppPort",
                "DatabasePort", "AllowedIngressCIDR"]},
        ],
    },
    {
        "name": "Compute", "icon": "memory",
        "description": "ECS cluster, EC2 instances, auto scaling, Fargate tasks, and services.",
        "sections": [
            {"title": "Cluster & Instances", "icon": "dns", "fields": [
                "ContainerInsightsEnabled", "InstanceType", "EBSVolumeSize", "EBSVolumeType",
                "EBSEncrypted", "IMDSHttpTokens", "DetailedMonitoringEnabled",
                "IMDSHttpPutResponseHopLimit"]},
            {"title": "Auto Scaling Group", "icon": "auto_graph", "fields": [
                "ASGMinSize", "ASGMaxSize", "ASGDesiredCapacity",
                "CapacityProviderTargetCapacity", "HealthCheckType", "HealthCheckGracePeriod",
                "ManagedTerminationProtection"]},
            {"title": "Frontend Service", "icon": "web", "fields": [
                "FrontendLaunchType", "FrontendImageTag", "FrontendCPU", "FrontendMemory",
                "FrontendContainerPort", "FrontendNetworkMode", "FrontendLogStreamPrefix",
                "FrontendDesiredCount", "FrontendScaleMinCapacity", "FrontendScaleMaxCapacity",
                "FrontendScaleCpuTarget", "FrontendMaximumPercent", "FrontendMinimumHealthyPercent",
                "FrontendHealthCheckGracePeriod", "FrontendScaleInCooldown", "FrontendScaleOutCooldown",
                "FrontendListenerRulePriority", "FrontendPathPattern", "FrontendEnableExecuteCommand"]},
            {"title": "Backend Service", "icon": "api", "fields": [
                "BackendLaunchType", "BackendImageTag", "BackendCPU", "BackendMemory",
                "BackendContainerPort", "BackendNetworkMode", "BackendLogStreamPrefix",
                "BackendDesiredCount", "BackendScaleMinCapacity", "BackendScaleMaxCapacity",
                "BackendScaleCpuTarget", "BackendMaximumPercent", "BackendMinimumHealthyPercent",
                "BackendHealthCheckGracePeriod", "BackendScaleInCooldown", "BackendScaleOutCooldown",
                "BackendListenerRulePriority", "BackendPathPattern", "BackendEnableExecuteCommand"]},
        ],
    },
    {
        "name": "Database", "icon": "database",
        "description": "RDS engine, instance class, storage, Multi-AZ, backups, and encryption.",
        "sections": [
            {"title": "Engine", "icon": "engineering", "fields": [
                "DatabaseName", "DBEngine", "DBEngineVersion", "DBInstanceClass"]},
            {"title": "Storage & HA", "icon": "sd_storage", "fields": [
                "DBAllocatedStorage", "MaxAllocatedStorage", "MultiAZ", "StorageType", "StorageEncrypted"]},
            {"title": "Credentials & Access", "icon": "vpn_key", "fields": ["DBAdminUsername", "DBPort"]},
            {"title": "Backups & Maintenance", "icon": "backup", "fields": [
                "DBBackupRetentionPeriod", "DBDeletionProtection", "CopyTagsToSnapshot",
                "PreferredMaintenanceWindow", "PreferredBackupWindow", "AutoMinorVersionUpgrade"]},
            {"title": "Monitoring", "icon": "monitoring", "fields": [
                "EnablePerformanceInsights", "PerformanceInsightsRetentionPeriod", "MonitoringInterval"]},
        ],
    },
    {
        "name": "Load Balancer", "icon": "balance",
        "description": "Public and internal ALBs, target groups, health checks, and TLS.",
        "sections": [
            {"title": "Public ALB", "icon": "public", "fields": [
                "ALBIdleTimeout", "ALBDeletionProtection", "ALBHTTP2Enabled",
                "ALBDropInvalidHeaders", "ALBAccessLogsEnabled", "ALBListenerPort"]},
            {"title": "TLS / SSL", "icon": "https", "fields": ["ACMCertificateArn", "SSLPolicy"]},
            {"title": "Target Group Health", "icon": "health_and_safety", "fields": [
                "FrontendHealthCheckPath", "BackendHealthCheckPath", "DeregistrationDelay",
                "HealthCheckIntervalSeconds", "HealthCheckTimeoutSeconds",
                "HealthyThresholdCount", "UnhealthyThresholdCount", "MatcherHttpCode"]},
            {"title": "Stickiness", "icon": "push_pin", "fields": [
                "StickinessEnabled", "StickinessDurationSeconds"]},
            {"title": "Internal ALB", "icon": "lock", "fields": [
                "InternalALBIdleTimeout", "InternalALBDeletionProtection",
                "InternalALBHTTP2Enabled", "InternalALBDropInvalidHeaders",
                "InternalALBListenerPort"]},
        ],
    },
    {
        "name": "Security", "icon": "shield",
        "description": "WAF rules, Secrets Manager, ECR registry, and S3 storage policies.",
        "sections": [
            {"title": "WAF", "icon": "security", "fields": [
                "WAFScope", "RateLimitThreshold", "EnableCommonRuleSet",
                "EnableSQLiRuleSet", "EnableKnownBadInputsRuleSet", "EnableSampledRequests"]},
            {"title": "Secrets Manager", "icon": "vpn_key", "fields": [
                "PasswordLength", "PasswordExcludeChars", "RequireEachCharType"]},
            {"title": "ECR Registry", "icon": "inventory_2", "fields": [
                "ImageTagMutability", "MaxImageCount", "ScanOnPush", "ECREncryptionType"]},
            {"title": "S3 Storage", "icon": "cloud", "fields": [
                "AssetsBucketEncryptionAlgorithm", "AssetsNoncurrentVersionExpiryDays",
                "AssetsTransitionDays", "AssetsTransitionStorageClass",
                "AccessLogsBucketEncryptionAlgorithm", "EnableAssetsVersioning"]},
        ],
    },
    {
        "name": "Monitoring & DNS", "icon": "monitoring",
        "description": "CloudWatch logs, CloudTrail, log retention, and Route 53 DNS.",
        "sections": [
            {"title": "CloudWatch", "icon": "monitoring", "fields": [
                "LogRetentionDays", "FrontendLogGroupSuffix", "BackendLogGroupSuffix"]},
            {"title": "CloudTrail", "icon": "trail", "fields": [
                "IsMultiRegionTrail", "EnableLogFileValidation",
                "IncludeGlobalServiceEvents", "TrailBucketEncryptionAlgorithm", "IsLogging"]},
            {"title": "Route 53 DNS", "icon": "dns", "fields": ["HostedZoneName", "AppSubdomain"]},
        ],
    },
    {
        "name": "Pre-flight", "icon": "checklist",
        "description": "",
        "sections": [],
    },
    {
        "name": "Deploy", "icon": "rocket_launch",
        "description": "",
        "sections": [],
    },
]

CUSTOM_FIELDS = {
    "__aws_profile": {
        "Description": "AWS CLI profile name. Leave empty to use default credentials or environment variables.",
        "Default": "", "Type": "String", "label": "AWS Profile",
        "fetcher": "profiles",
    },
    "__aws_access_key": {
        "Description": "AWS Access Key ID. Leave empty to auto-detect.",
        "Default": "", "Type": "String", "label": "Access Key ID",
    },
    "__aws_secret_key": {
        "Description": "AWS Secret Access Key. Leave empty to auto-detect.",
        "Default": "", "Type": "String", "label": "Secret Access Key", "NoEcho": "true",
    },
    "__aws_region": {
        "Description": "AWS region to deploy into.",
        "Default": "us-east-1", "Type": "String", "label": "Region",
        "AllowedValues": [
            "us-east-1", "us-east-2", "us-west-1", "us-west-2",
            "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-north-1",
            "ap-south-1", "ap-southeast-1", "ap-southeast-2",
            "ap-northeast-1", "ap-northeast-2", "ap-northeast-3",
            "sa-east-1", "ca-central-1", "me-south-1", "af-south-1",
        ],
    },
    "__stack_name": {
        "Description": "CloudFormation stack name (alphanumeric and hyphens).",
        "Default": "three-tier-dev", "Type": "String", "label": "Stack Name",
    },
    "__s3_bucket": {
        "Description": "S3 bucket containing the CloudFormation template files.",
        "Default": "3-tier-advanced-template", "Type": "String", "label": "S3 Template Bucket",
        "fetcher": "s3_buckets",
    },
    "__s3_prefix": {
        "Description": "S3 key prefix (folder path) inside the bucket.",
        "Default": "3-tier-advanced-template", "Type": "String", "label": "S3 Prefix",
        "fetcher": "s3_prefixes",
    },
    "__role_arn": {
        "Description": "IAM Role ARN for CloudFormation execution. Leave empty to use caller identity.",
        "Default": "", "Type": "String", "label": "Execution Role ARN",
        "fetcher": "iam_roles",
    },
    "__sync_templates": {
        "Description": "Upload local template files to S3 before deploying.",
        "Default": "true", "AllowedValues": ["true", "false"],
        "Type": "String", "label": "Sync Templates to S3",
    },
}

# Fields that can be auto-populated from AWS
FIELD_FETCHERS = {
    # Credentials
    "__aws_profile":       lambda _r, _w: fetcher.fetch_aws_profiles(),
    # Stack Config — S3
    "__s3_bucket":         lambda _r, _w: fetcher.fetch_s3_buckets(),
    "__s3_prefix":         lambda _r, w: fetcher.fetch_s3_prefixes(w.get("__s3_bucket", "")),
    "TemplatesBucketName": lambda _r, _w: fetcher.fetch_s3_buckets(),
    "TemplatesPrefix":     lambda _r, w: fetcher.fetch_s3_prefixes(w.get("TemplatesBucketName", "") or w.get("__s3_bucket", "")),
    # Stack Config — IAM
    "__role_arn":           lambda _r, _w: fetcher.fetch_iam_roles(),
    # Networking
    "AllowedIngressCIDR":  lambda _r, _w: fetcher.fetch_my_ip(),
    # Compute
    "InstanceType":        lambda r, _w: fetcher.fetch_instance_types(r),
    # Database
    "DBEngineVersion":     lambda _r, w: fetcher.fetch_db_engine_versions(w.get("DBEngine", "")),
    "DBInstanceClass":     lambda r, w: fetcher.fetch_db_instance_classes(w.get("DBEngine", ""), r),
    # Load Balancer — TLS
    "ACMCertificateArn":   lambda r, _w: fetcher.fetch_acm_certificates(r),
    "SSLPolicy":           lambda _r, _w: fetcher.fetch_ssl_policies(),
    # DNS
    "HostedZoneName":      lambda _r, _w: fetcher.fetch_hosted_zones(),
}

# Parent → children cascade relationships
DEPENDENT_FETCHERS = {
    "DBEngine": ["DBEngineVersion", "DBInstanceClass"],
    "__s3_bucket": ["__s3_prefix"],
    "TemplatesBucketName": ["TemplatesPrefix"],
}

# Fields where users may type custom values not in the dropdown
FETCHER_ALLOWS_CUSTOM = {
    "__s3_prefix", "__s3_bucket", "__role_arn",
    "InstanceType", "AllowedIngressCIDR",
    "TemplatesBucketName", "TemplatesPrefix",
    "DBEngineVersion", "DBInstanceClass",
    "ACMCertificateArn", "HostedZoneName",
}


# ═══════════════════════════════════════════════════════════════
# GLOBAL STATE
# ═══════════════════════════════════════════════════════════════
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_PARAMS = parse_root_parameters(os.path.join(SCRIPT_DIR, "root.yaml"))


# ═══════════════════════════════════════════════════════════════
# GUI
# ═══════════════════════════════════════════════════════════════
def create_gui(preload_config: Optional[str] = None):
    widgets: Dict[str, any] = {}
    field_defaults: Dict[str, str] = {}
    field_cards: Dict[str, any] = {}  # for search filtering
    field_status_labels: Dict[str, any] = {}  # per-field status labels for fetcher feedback
    log_area = {"ref": None}
    last_outputs = {"data": []}
    preflight_container = {"ref": None}
    status_labels = {"region": None, "account": None, "stack": None, "deploy": None}
    progress_bar = {"ref": None}
    current_page = {"index": 0}
    page_containers = []
    nav_buttons = []
    _populating = {"active": False}  # re-entrancy guard for cascade

    # ──────────────────────────────────────────────────────────
    # HELPERS
    # ──────────────────────────────────────────────────────────
    def get_val(name: str) -> str:
        w = widgets.get(name)
        if w is None:
            return ""
        v = w.value
        if v is None:
            return ""
        return str(v)

    def set_val(name: str, value: str):
        w = widgets.get(name)
        if w is None:
            return
        w.value = value

    def collect_values() -> Dict[str, str]:
        return {name: get_val(name) for name in widgets}

    def get_session(vals: dict):
        profile = vals.get("__aws_profile", "")
        region = vals.get("__aws_region", "us-east-1") or "us-east-1"
        ak = vals.get("__aws_access_key", "")
        sk = vals.get("__aws_secret_key", "")
        if profile:
            return boto3.Session(profile_name=profile, region_name=region)
        if ak and sk:
            return boto3.Session(aws_access_key_id=ak, aws_secret_access_key=sk,
                                  region_name=region)
        return boto3.Session(region_name=region)

    def build_config():
        vals = collect_values()
        region = vals.get("__aws_region", "us-east-1") or "us-east-1"
        cfg = {
            "stack_name": vals.get("__stack_name", "three-tier-dev") or "three-tier-dev",
            "region": region,
            "s3_bucket": vals.get("__s3_bucket", "") or vals.get("TemplatesBucketName", ""),
            "s3_prefix": vals.get("__s3_prefix", "") or vals.get("TemplatesPrefix", ""),
            "sync_templates": vals.get("__sync_templates", "true") == "true",
            "capabilities": ["CAPABILITY_NAMED_IAM"],
            "tags": {
                "Project": "3-Tier-Architecture",
                "Environment": vals.get("EnvironmentName", "dev"),
                "ManagedBy": "deployment_gui.py",
            },
            "parameters": {},
        }
        if vals.get("__role_arn"):
            cfg["role_arn"] = vals["__role_arn"]
        if vals.get("__aws_profile"):
            cfg["profile"] = vals["__aws_profile"]
        for name in widgets:
            if name.startswith("__"):
                continue
            v = get_val(name)
            if v:
                cfg["parameters"][name] = str(v)
        return cfg, vals

    def template_url(cfg):
        return f"https://{cfg['s3_bucket']}.s3.{cfg['region']}.amazonaws.com/{cfg['s3_prefix']}/root.yaml"

    def stack_exists(cf, name):
        try:
            r = cf.describe_stacks(StackName=name)
            s = r["Stacks"][0]["StackStatus"]
            return (False, None) if s == "DELETE_COMPLETE" else (True, s)
        except ClientError as e:
            if "does not exist" in str(e):
                return False, None
            raise

    # ──────────────────────────────────────────────────────────
    # LOG
    # ──────────────────────────────────────────────────────────
    def log(text: str, color: str = "#d4d4d4"):
        ts = datetime.now().strftime("%H:%M:%S")
        if log_area["ref"]:
            log_area["ref"].push(f'<span style="color:{color}">  {ts}  {text}</span>')

    def log_raw(text: str, color: str = "#d4d4d4"):
        if log_area["ref"]:
            log_area["ref"].push(f'<span style="color:{color}">{text}</span>')

    def log_clear():
        if log_area["ref"]:
            log_area["ref"].clear()

    # ──────────────────────────────────────────────────────────
    # NAVIGATION
    # ──────────────────────────────────────────────────────────
    def switch_page(index: int):
        current_page["index"] = index
        for i, container in enumerate(page_containers):
            if i == index:
                container.style(replace="display: block; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; overflow-x: hidden")
            else:
                container.style(replace="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0")
        for i, btn in enumerate(nav_buttons):
            if i == index:
                btn.classes(replace="nav-btn w-full text-left px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 font-medium text-sm transition-all border border-blue-500/30")
            else:
                btn.classes(replace="nav-btn w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-400 text-sm transition-all border border-transparent")

    # ──────────────────────────────────────────────────────────
    # AWS OPERATIONS
    # ──────────────────────────────────────────────────────────
    async def check_credentials():
        try:
            vals = collect_values()
            session = get_session(vals)
            identity = await run.io_bound(
                lambda: session.client("sts").get_caller_identity())
            arn = identity["Arn"]
            account = identity["Account"]
            status_labels["account"].text = account
            status_labels["account"].classes(replace="text-green-400 text-[11px] font-mono")
            ui.notify(f"Authenticated: {arn}", type="positive", position="top-right")
        except Exception:
            status_labels["account"].text = "Not authenticated"
            status_labels["account"].classes(replace="text-red-400 text-[11px] font-mono")

    def _update_fetcher_widget(field_name: str, result: FetchResult):
        """Update a fetcher-backed widget and its status label from a FetchResult."""
        w = widgets.get(field_name)
        lbl = field_status_labels.get(field_name)

        if result.status == "ok" and result.values:
            if w and hasattr(w, 'options'):
                existing = w.value
                opts = list(result.values)
                if existing and existing not in opts:
                    opts.insert(0, existing)
                w.options = opts
                w.update()
                if existing:
                    w.value = existing
            if lbl:
                lbl.text = f"{len(result.values)} options loaded"
                lbl.classes(replace="text-green-500 text-[10px] mt-0.5")
        elif result.status == "ok" and not result.values:
            if lbl:
                lbl.text = "No resources found"
                lbl.classes(replace="text-gray-500 text-[10px] mt-0.5")
        elif result.status == "permission_error":
            perm = result.required_permission
            msg = f"Permission required: {perm}" if perm else "Access denied"
            if lbl:
                lbl.text = msg
                lbl.classes(replace="text-red-400 text-[10px] mt-0.5")
            ui.notify(msg, type="warning", position="top-right", timeout=5000)
        elif result.status == "no_credentials":
            if lbl:
                lbl.text = "No AWS credentials"
                lbl.classes(replace="text-yellow-500 text-[10px] mt-0.5")
        elif result.status == "error":
            short = (result.error_message[:80] + "...") if len(result.error_message) > 80 else result.error_message
            if lbl:
                lbl.text = short
                lbl.classes(replace="text-red-400 text-[10px] mt-0.5")

    async def auto_populate():
        if _populating["active"]:
            return
        _populating["active"] = True
        try:
            vals = collect_values()
            session = get_session(vals)
            fetcher.set_session(session)
            region = vals.get("__aws_region", "us-east-1") or "us-east-1"

            for field_name, fetch_fn in FIELD_FETCHERS.items():
                try:
                    result = await run.io_bound(
                        lambda fn=fetch_fn, r=region, v=vals: fn(r, v))
                    if isinstance(result, FetchResult):
                        _update_fetcher_widget(field_name, result)
                    elif isinstance(result, list):
                        _update_fetcher_widget(field_name,
                            FetchResult(values=result, status="ok"))
                except Exception:
                    pass
        except Exception:
            pass
        finally:
            _populating["active"] = False

    async def refresh_all():
        fetcher.clear_cache()
        for lbl in field_status_labels.values():
            lbl.text = ""
        ui.notify("Refreshing AWS resources...", type="info", position="top-right")
        await auto_populate()
        ui.notify("AWS resources refreshed", type="positive", position="top-right")

    async def _cascade_refresh(parent_field: str):
        """Re-fetch children when a parent field changes."""
        children = DEPENDENT_FETCHERS.get(parent_field, [])
        if not children:
            return
        vals = collect_values()
        region = vals.get("__aws_region", "us-east-1") or "us-east-1"
        session = get_session(vals)
        fetcher.set_session(session)
        for child in children:
            fetch_fn = FIELD_FETCHERS.get(child)
            if not fetch_fn:
                continue
            try:
                result = await run.io_bound(
                    lambda fn=fetch_fn, r=region, v=vals: fn(r, v))
                if isinstance(result, FetchResult):
                    _update_fetcher_widget(child, result)
                elif isinstance(result, list):
                    _update_fetcher_widget(child,
                        FetchResult(values=result, status="ok"))
            except Exception:
                pass

    # ──────────────────────────────────────────────────────────
    # PRE-FLIGHT VALIDATION
    # ──────────────────────────────────────────────────────────
    async def run_preflight():
        switch_page(len(TAB_LAYOUT) - 2)  # Pre-flight page
        container = preflight_container["ref"]
        if not container:
            return
        container.clear()

        with container:
            ui.label("Running pre-flight checks...").classes("text-lg text-gray-400 animate-pulse")

        cfg, vals = build_config()
        region = cfg["region"]
        session = get_session(vals)
        fetcher.set_session(session)

        checks = await run.io_bound(lambda: fetcher.preflight_validate(
            parameters=cfg["parameters"],
            region=region,
            role_arn=cfg.get("role_arn", ""),
            s3_bucket=cfg.get("s3_bucket", ""),
            s3_prefix=cfg.get("s3_prefix", ""),
        ))

        container.clear()
        with container:
            pass_count = sum(1 for c in checks if c.status == "pass")
            fail_count = sum(1 for c in checks if c.status == "fail")
            warn_count = sum(1 for c in checks if c.status == "warn")

            # Summary
            with ui.row().classes("gap-4 mb-6"):
                with ui.card().classes("bg-green-900/30 border border-green-700 px-4 py-2"):
                    ui.label(f"{pass_count} Passed").classes("text-green-400 font-bold")
                if fail_count:
                    with ui.card().classes("bg-red-900/30 border border-red-700 px-4 py-2"):
                        ui.label(f"{fail_count} Failed").classes("text-red-400 font-bold")
                if warn_count:
                    with ui.card().classes("bg-yellow-900/30 border border-yellow-700 px-4 py-2"):
                        ui.label(f"{warn_count} Warnings").classes("text-yellow-400 font-bold")

            if fail_count:
                ui.label(
                    "DEPLOYMENT BLOCKED -- Fix the failed checks before deploying."
                ).classes("text-red-400 font-bold text-lg mb-4")

            # Individual checks
            for check in checks:
                icon_map = {"pass": "check_circle", "fail": "cancel",
                            "warn": "warning", "skip": "skip_next", "pending": "pending"}
                color_map = {"pass": "text-green-400", "fail": "text-red-400",
                             "warn": "text-yellow-400", "skip": "text-gray-400",
                             "pending": "text-gray-400"}
                bg_map = {"pass": "bg-green-900/10 border-green-800",
                          "fail": "bg-red-900/20 border-red-700",
                          "warn": "bg-yellow-900/10 border-yellow-800",
                          "skip": "bg-gray-800 border-gray-700",
                          "pending": "bg-gray-800 border-gray-700"}

                with ui.card().classes(
                    f"w-full border {bg_map.get(check.status, '')} mb-2"
                ):
                    with ui.row().classes("items-center gap-3"):
                        ui.icon(icon_map.get(check.status, "help")).classes(
                            f"{color_map.get(check.status, '')} text-xl")
                        with ui.column().classes("gap-0"):
                            ui.label(check.name).classes(
                                f"font-bold {color_map.get(check.status, '')}")
                            if check.message:
                                ui.label(check.message).classes("text-gray-300 text-sm")
                            if check.fix_hint:
                                with ui.row().classes("items-center gap-2 mt-1"):
                                    ui.icon("lightbulb").classes("text-blue-400 text-sm")
                                    ui.label(check.fix_hint).classes(
                                        "text-blue-300 text-sm italic")

        if fail_count:
            ui.notify(
                f"Pre-flight FAILED: {fail_count} issue(s) found",
                type="negative", position="top-right", timeout=8000)
        else:
            ui.notify(
                f"Pre-flight PASSED: {pass_count} checks OK, {warn_count} warnings",
                type="positive", position="top-right")

    # ──────────────────────────────────────────────────────────
    # DEPLOY / DRY-RUN / STATUS / DELETE
    # ──────────────────────────────────────────────────────────
    def validate_required():
        vals = collect_values()
        errs = []
        if not vals.get("__stack_name"):
            errs.append("Stack Name is required")
        if not (vals.get("__s3_bucket") or vals.get("TemplatesBucketName")):
            errs.append("S3 Bucket is required")
        if not vals.get("EnvironmentName"):
            errs.append("EnvironmentName is required")
        if not vals.get("TemplatesBucketName"):
            errs.append("TemplatesBucketName is required")
        return errs

    def s3_sync(cfg, vals):
        bucket, prefix, region = cfg["s3_bucket"], cfg["s3_prefix"], cfg["region"]
        profile = vals.get("__aws_profile", "")
        base = SCRIPT_DIR
        cmd_base = ["aws", "s3", "cp", "--region", region]
        if profile:
            cmd_base += ["--profile", profile]
        r = subprocess.run(cmd_base + [os.path.join(base, "root.yaml"),
                           f"s3://{bucket}/{prefix}/root.yaml"],
                           capture_output=True, text=True)
        if r.returncode != 0:
            log(f"Upload failed: {r.stderr.strip()}", "#f87171")
            return
        log("  root.yaml uploaded", "#71717a")

        sync_base = ["aws", "s3", "sync", "--region", region, "--delete"]
        if profile:
            sync_base += ["--profile", profile]
        for folder in ["networking", "compute", "database", "loadbalancer", "security",
                        "iam", "secrets", "registry", "storage", "monitoring", "dns"]:
            local = os.path.join(base, folder)
            if not os.path.isdir(local):
                continue
            r = subprocess.run(sync_base + [local, f"s3://{bucket}/{prefix}/{folder}/"],
                               capture_output=True, text=True)
            if r.returncode != 0:
                log(f"  {folder}/ failed: {r.stderr.strip()}", "#f87171")
            else:
                log(f"  {folder}/ synced", "#71717a")
        log("Template sync complete", "#4ade80")

    async def do_deploy(dry_run: bool):
        errs = validate_required()
        if errs:
            for e in errs:
                ui.notify(e, type="negative", position="top-right")
            return

        switch_page(len(TAB_LAYOUT) - 1)
        log_clear()
        if progress_bar["ref"]:
            progress_bar["ref"].set_visibility(True)

        try:
            cfg, vals = build_config()
            session = get_session(vals)

            status_labels["deploy"].text = "Authenticating..."
            log("Verifying credentials...", "#67e8f9")
            arn = await run.io_bound(
                lambda: session.client("sts").get_caller_identity()["Arn"])
            log(f"Authenticated as {arn}", "#4ade80")

            if cfg.get("sync_templates"):
                status_labels["deploy"].text = "Syncing templates..."
                log("Syncing templates to S3...", "#67e8f9")
                await run.io_bound(lambda: s3_sync(cfg, vals))

            status_labels["deploy"].text = "Validating..."
            cf = session.client("cloudformation")
            url = template_url(cfg)
            log("Validating template...", "#67e8f9")
            try:
                await run.io_bound(lambda: cf.validate_template(TemplateURL=url))
                log("Template validation passed", "#4ade80")
            except ClientError as e:
                log(f"Validation failed: {e.response['Error']['Message']}", "#f87171")
                status_labels["deploy"].text = "VALIDATION FAILED"
                if progress_bar["ref"]:
                    progress_bar["ref"].set_visibility(False)
                return

            stack_name = cfg["stack_name"]
            kwargs = {
                "StackName": stack_name,
                "TemplateURL": url,
                "Parameters": [{"ParameterKey": k, "ParameterValue": str(v)}
                                for k, v in cfg["parameters"].items()],
                "Capabilities": cfg.get("capabilities", ["CAPABILITY_NAMED_IAM"]),
                "Tags": [{"Key": k, "Value": str(v)} for k, v in cfg.get("tags", {}).items()],
            }
            if cfg.get("role_arn"):
                kwargs["RoleARN"] = cfg["role_arn"]

            exists, cur_status = await run.io_bound(
                lambda: stack_exists(cf, stack_name))

            if dry_run:
                await run.io_bound(
                    lambda: _do_change_set_sync(cf, kwargs, stack_name, exists, log, log_raw, status_labels))
                if progress_bar["ref"]:
                    progress_bar["ref"].set_visibility(False)
                return

            # Cleanup broken
            if exists and cur_status in ("ROLLBACK_COMPLETE", "ROLLBACK_FAILED",
                                          "CREATE_FAILED", "DELETE_FAILED"):
                log(f"Stack in {cur_status} -- deleting before re-create...", "#fbbf24")
                status_labels["deploy"].text = "Cleaning up..."
                await run.io_bound(lambda: cf.delete_stack(StackName=stack_name))
                await run.io_bound(lambda: cf.get_waiter("stack_delete_complete").wait(
                    StackName=stack_name, WaiterConfig={"Delay": 10, "MaxAttempts": 120}))
                log("Old stack removed", "#4ade80")
                exists = False

            if exists:
                log(f"Updating stack '{stack_name}'...", "#67e8f9")
                status_labels["deploy"].text = "Updating..."
                try:
                    await run.io_bound(lambda: cf.update_stack(**kwargs))
                except ClientError as e:
                    if "No updates" in str(e):
                        log("No changes -- stack is up to date", "#4ade80")
                        status_labels["deploy"].text = "UP TO DATE"
                        if progress_bar["ref"]:
                            progress_bar["ref"].set_visibility(False)
                        return
                    raise
            else:
                log(f"Creating stack '{stack_name}'...", "#67e8f9")
                status_labels["deploy"].text = "Creating..."
                kwargs["OnFailure"] = "ROLLBACK"
                await run.io_bound(lambda: cf.create_stack(**kwargs))

            await run.io_bound(
                lambda: _stream_events_sync(cf, stack_name, log, log_raw, status_labels, last_outputs))

        except Exception as e:
            log(f"Error: {e}", "#f87171")
            status_labels["deploy"].text = "ERROR"
            ui.notify(str(e), type="negative", position="top-right", timeout=10000)
        finally:
            if progress_bar["ref"]:
                progress_bar["ref"].set_visibility(False)

    async def do_status():
        switch_page(len(TAB_LAYOUT) - 1)
        log_clear()
        try:
            cfg, vals = build_config()
            session = get_session(vals)
            cf = session.client("cloudformation")
            stack_name = cfg["stack_name"]

            exists, status = await run.io_bound(lambda: stack_exists(cf, stack_name))
            if not exists:
                log(f"Stack '{stack_name}' does not exist", "#fbbf24")
                status_labels["deploy"].text = "NOT FOUND"
                return

            ok = "COMPLETE" in status and "ROLLBACK" not in status
            log(f"Stack: {stack_name}", "#93c5fd")
            log(f"Status: {status}", "#4ade80" if ok else "#f87171")

            resp = await run.io_bound(lambda: cf.describe_stacks(StackName=stack_name))
            outputs = resp["Stacks"][0].get("Outputs", [])
            last_outputs["data"] = outputs
            if outputs:
                log_raw("", "#71717a")
                log_raw("  Outputs:", "#93c5fd")
                for o in outputs:
                    log_raw(f"    {o['OutputKey']:38s}  {o['OutputValue']}", "#4ade80")

            log_raw("", "#71717a")
            log_raw("  Recent Events:", "#93c5fd")
            events = await run.io_bound(
                lambda: cf.describe_stack_events(StackName=stack_name)["StackEvents"][:10])
            for ev in events:
                s = ev.get("ResourceStatus", "")
                lg = ev.get("LogicalResourceId", "")
                rs = ev.get("ResourceStatusReason", "")
                ts = ev["Timestamp"].strftime("%H:%M:%S")
                c = "#4ade80" if "COMPLETE" in s and "ROLLBACK" not in s else (
                    "#f87171" if "FAIL" in s else "#67e8f9")
                log_raw(f"    {ts}  {s:35s}  {lg}", c)
                if rs:
                    log_raw(f"             -> {rs}", "#71717a")

            status_labels["deploy"].text = status
        except Exception as e:
            log(f"Error: {e}", "#f87171")

    async def do_delete():
        errs = validate_required()
        if errs:
            for e in errs:
                ui.notify(e, type="negative", position="top-right")
            return

        switch_page(len(TAB_LAYOUT) - 1)
        log_clear()
        if progress_bar["ref"]:
            progress_bar["ref"].set_visibility(True)

        try:
            cfg, vals = build_config()
            session = get_session(vals)
            cf = session.client("cloudformation")
            stack_name = cfg["stack_name"]

            exists, status = await run.io_bound(lambda: stack_exists(cf, stack_name))
            if not exists:
                log(f"Stack '{stack_name}' does not exist", "#fbbf24")
                if progress_bar["ref"]:
                    progress_bar["ref"].set_visibility(False)
                return

            log(f"Deleting '{stack_name}' (status: {status})...", "#f87171")
            status_labels["deploy"].text = "Deleting..."
            try:
                await run.io_bound(lambda: cf.update_termination_protection(
                    EnableTerminationProtection=False, StackName=stack_name))
            except Exception:
                pass
            await run.io_bound(lambda: cf.delete_stack(StackName=stack_name))
            await run.io_bound(
                lambda: _stream_events_sync(cf, stack_name, log, log_raw, status_labels, last_outputs))
        except Exception as e:
            log(f"Error: {e}", "#f87171")
        finally:
            if progress_bar["ref"]:
                progress_bar["ref"].set_visibility(False)

    # ──────────────────────────────────────────────────────────
    # CONFIG LOAD / SAVE
    # ──────────────────────────────────────────────────────────
    async def load_config():
        result = await app.native.main_window.create_file_dialog(
            allow_multiple=False) if hasattr(app, 'native') else None
        # Fallback: use text input dialog
        # For web mode, we use upload
        pass

    def load_config_data(data: dict):
        field_map = {
            "region": "__aws_region", "stack_name": "__stack_name",
            "s3_bucket": "__s3_bucket", "s3_prefix": "__s3_prefix",
            "role_arn": "__role_arn", "profile": "__aws_profile",
        }
        for k, f in field_map.items():
            if k in data and f in widgets:
                set_val(f, str(data[k]))
        if "sync_templates" in data:
            set_val("__sync_templates", "true" if data["sync_templates"] else "false")
        for k, v in data.get("parameters", {}).items():
            if k in widgets:
                set_val(k, str(v))

    def save_config_data() -> dict:
        cfg, _ = build_config()
        return cfg

    # ──────────────────────────────────────────────────────────
    # SEARCH
    # ──────────────────────────────────────────────────────────
    def on_search(query: str):
        q = query.lower()
        for field_name, card in field_cards.items():
            if not q:
                card.set_visibility(True)
                continue
            meta = CUSTOM_FIELDS.get(field_name) or ROOT_PARAMS.get(field_name, {})
            desc = meta.get("Description", "").lower()
            lbl = meta.get("label", "").lower()
            if q in field_name.lower() or q in desc or q in lbl:
                card.set_visibility(True)
            else:
                card.set_visibility(False)

    # ──────────────────────────────────────────────────────────
    # BUILD UI
    # ──────────────────────────────────────────────────────────
    ui.colors(primary="#2563eb")

    # Dark theme
    ui.query("body").classes("bg-gray-950")
    ui.add_head_html("""
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
    <style>
        :root { color-scheme: dark; }
        body { font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif; }
        .nicegui-log { font-family: 'JetBrains Mono', 'Consolas', monospace !important; }
        .nicegui-log .q-virtual-scroll__content > div {
            font-size: 13px !important;
            line-height: 1.6 !important;
            padding: 0 8px !important;
        }
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #4b5563; }
        /* Form field polish */
        .q-field--filled .q-field__control { background: rgba(17, 24, 39, 0.7) !important; border-radius: 6px !important; }
        .q-field--filled .q-field__control:hover { background: rgba(31, 41, 55, 0.8) !important; }
        .q-field--filled .q-field__control:focus-within { background: rgba(31, 41, 55, 1) !important; }
        /* Expansion panel — force visible content and align icons */
        .q-expansion-item__container { border-radius: 10px !important; overflow: visible; }
        .q-expansion-item .q-item { min-height: 44px !important; padding-top: 10px !important; padding-bottom: 10px !important; }
        .q-expansion-item__content { overflow: visible !important; }
        .q-expansion-item__content > .q-card { overflow: visible !important; }
        .q-item__section--avatar { min-width: unset !important; padding-right: 12px !important; padding-top: 2px !important; }
        .q-item__section--avatar .q-icon { font-size: 20px !important; color: #9ca3af !important; }
        .q-expansion-item__toggle-icon { font-size: 20px !important; color: #6b7280 !important; padding-top: 2px !important; }
        
        /* Remove card shadow globally */
        .q-card { box-shadow: none !important; }
        /* Sidebar nav button */
        .nav-btn .q-btn__content { justify-content: flex-start !important; }
    </style>
    """)

    # ── HEADER ──
    with ui.header().classes("bg-gray-900/95 backdrop-blur border-b border-gray-800 px-6 py-0 h-14 items-center"):
        with ui.row().classes("items-center gap-2"):
            ui.icon("cloud").classes("text-blue-500 text-2xl")
            ui.label("CloudFormation").classes("text-white font-bold text-lg tracking-tight")
            ui.label("3-Tier Deployer").classes("text-gray-500 text-sm font-medium bg-gray-800 rounded-full px-3 py-0.5")

        ui.space()

        with ui.row().classes("items-center gap-1"):
            ui.upload(
                label="", auto_upload=True, max_files=1,
                on_upload=lambda e: _handle_upload(e, load_config_data),
            ).props('flat dense accept=".yaml,.yml" icon="upload_file"').classes(
                "bg-transparent text-gray-400").style("max-width: 42px")

            ui.button(icon="save",
                      on_click=lambda: _handle_save(save_config_data)
                      ).props("flat dense round size=sm").classes("text-gray-400")
            ui.separator().props("vertical").classes("mx-1 h-5")
            ui.button(icon="refresh",
                      on_click=refresh_all
                      ).props("flat dense round size=sm").classes("text-teal-400").tooltip("Refresh AWS data")

    # ── BODY: sidebar + content ──
    with ui.row().classes("w-full h-[calc(100vh-5.5rem)] gap-0"):
        # SIDEBAR
        with ui.column().classes(
            "w-52 min-w-[13rem] bg-gray-900 border-r border-gray-800 pt-3 pb-4 px-2.5 gap-0.5 overflow-y-auto"
        ):
            ui.label("NAVIGATION").classes("text-gray-600 text-[10px] font-bold tracking-widest px-3 mb-1")

            for i, tab in enumerate(TAB_LAYOUT):
                # Add separator before Pre-flight/Deploy
                if tab["name"] in ("Pre-flight",):
                    ui.separator().classes("my-2 bg-gray-800")
                    ui.label("ACTIONS").classes("text-gray-600 text-[10px] font-bold tracking-widest px-3 mb-1")

                btn = ui.button(
                    tab["name"], icon=tab.get("icon", ""),
                    on_click=lambda _, idx=i: switch_page(idx),
                ).props("flat align=left no-caps").classes(
                    "nav-btn w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-400 text-sm transition-all"
                )
                nav_buttons.append(btn)

            ui.space()
            ui.separator().classes("my-2 bg-gray-800")
            ui.label("v1.0").classes("text-gray-700 text-[10px] font-mono text-center w-full")

        # CONTENT AREA
        with ui.column().classes("flex-1 h-full").style("overflow: hidden; position: relative"):
            # Search bar
            with ui.row().classes(
                "w-full bg-gray-950/80 border-b border-gray-800/60 px-6 py-2 items-center gap-2"
            ).style("flex-shrink: 0; z-index: 10"):
                ui.icon("search").classes("text-gray-600 text-[20px] mt-0.5")
                search_input = ui.input(placeholder="Search parameters... (Ctrl+K)").classes(
                    "flex-1"
                ).props('dense borderless dark input-class="text-sm"').on(
                    "update:model-value", lambda e: on_search(e.args))
                ui.keyboard(on_key=lambda e: (search_input.run_method('focus') if e.key == 'k' and e.action.keydown and (e.modifiers.ctrl or e.modifiers.meta) else None))

            # Pages container — use position:relative so absolute children fill it
            with ui.element('div').classes("w-full").style(
                "flex: 1 1 0; position: relative; min-height: 0"
            ):
                for tab_idx, tab in enumerate(TAB_LAYOUT):
                    if tab["name"] == "Deploy":
                        container = _build_deploy_page(
                            log_area, progress_bar, status_labels, last_outputs,
                            do_deploy, do_status, do_delete, run_preflight)
                    elif tab["name"] == "Pre-flight":
                        container = ui.column().classes("w-full p-8")
                        with container:
                            with ui.column().classes("max-w-4xl mx-auto gap-4"):
                                with ui.row().classes("items-center gap-3"):
                                    ui.icon("checklist").classes("text-blue-400 text-3xl")
                                    with ui.column().classes("gap-0"):
                                        ui.label("Pre-flight Validation").classes(
                                            "text-xl font-bold text-white")
                                        ui.label(
                                            "Checks AWS resources before deployment to catch issues early."
                                        ).classes("text-gray-500 text-sm")
                                ui.button("Run Pre-flight Checks", icon="play_arrow",
                                          on_click=run_preflight
                                          ).props("color=blue no-caps").classes("mt-2")
                                inner = ui.column().classes("w-full gap-2")
                                preflight_container["ref"] = inner
                    else:
                        container = _build_param_page(
                            tab, widgets, field_defaults, field_cards,
                            field_status_labels, ROOT_PARAMS)
                    page_containers.append(container)
                    if tab_idx == 0:
                        container.style("display: block; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow-y: auto; overflow-x: hidden")
                    else:
                        container.style("display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0")

    # ── STATUS BAR ──
    with ui.footer().classes(
        "bg-gray-900/95 backdrop-blur border-t border-gray-800 px-5 py-0 h-7 items-center"
    ):
        with ui.row().classes("items-center gap-0"):
            ui.icon("public").classes("text-gray-600 text-xs mr-1")
            status_labels["region"] = ui.label("us-east-1").classes(
                "text-gray-500 text-[11px] font-mono")
        ui.label("|").classes("text-gray-700 text-[11px] mx-2")
        with ui.row().classes("items-center gap-0"):
            ui.icon("account_circle").classes("text-gray-600 text-xs mr-1")
            status_labels["account"] = ui.label("--").classes(
                "text-gray-500 text-[11px] font-mono")
        ui.label("|").classes("text-gray-700 text-[11px] mx-2")
        with ui.row().classes("items-center gap-0"):
            ui.icon("layers").classes("text-gray-600 text-xs mr-1")
            status_labels["stack"] = ui.label("--").classes(
                "text-gray-500 text-[11px] font-mono")
        ui.space()
        status_labels["deploy"] = ui.label("").classes(
            "text-blue-400 text-[11px] font-mono font-semibold")

    # Highlight first nav button
    if nav_buttons:
        nav_buttons[0].classes(
            replace="nav-btn w-full text-left px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 font-medium text-sm transition-all border border-blue-500/30")

    # Auto-init
    if preload_config and os.path.isfile(preload_config):
        try:
            with open(preload_config) as f:
                data = yaml.safe_load(f)
            load_config_data(data)
            ui.notify(f"Loaded: {os.path.basename(preload_config)}",
                      type="positive", position="top-right")
        except Exception as e:
            ui.notify(f"Config error: {e}", type="negative")

    # Register cascade handlers for dependent fetchers
    for parent_field in DEPENDENT_FETCHERS:
        w = widgets.get(parent_field)
        if w:
            w.on_value_change(lambda _e, pf=parent_field: _cascade_refresh(pf))

    # Region change → clear region caches and re-populate everything
    region_w = widgets.get("__aws_region")
    if region_w:
        async def _on_region_change(_e):
            fetcher.clear_region_cache()
            for lbl in field_status_labels.values():
                lbl.text = ""
            await auto_populate()
        region_w.on_value_change(_on_region_change)

    ui.timer(1.0, check_credentials, once=True)
    ui.timer(2.0, auto_populate, once=True)


# ═══════════════════════════════════════════════════════════════
# PAGE BUILDERS
# ═══════════════════════════════════════════════════════════════
def _build_param_page(tab_def, widgets, field_defaults, field_cards,
                      field_status_labels, root_params):
    page = ui.column().classes("w-full page-container")

    with page:
        # Page header
        with ui.row().classes("w-full items-center px-8 pt-5 pb-2 gap-3"):
            ui.icon(tab_def.get("icon", "settings")).classes("text-blue-400 text-[26px] mt-0.5")
            with ui.column().classes("gap-0"):
                ui.label(tab_def["name"]).classes("text-white font-bold text-lg")
                if tab_def.get("description"):
                    ui.label(tab_def["description"]).classes("text-gray-500 text-xs")

        # Render sections directly — the parent div handles scrolling
        with ui.column().classes("w-full max-w-5xl mx-auto px-6 py-3 gap-3"):
            for section in tab_def.get("sections", []):
                _build_section(section, widgets, field_defaults, field_cards,
                               field_status_labels, root_params)

    return page


def _build_section(section_def, widgets, field_defaults, field_cards,
                    field_status_labels, root_params):
    field_count = len(section_def["fields"])
    title_text = f"{section_def['title']}  ({field_count})"
    with ui.expansion(
        text=title_text,
        icon=section_def.get("icon", ""),
        value=True,
    ).classes("w-full bg-gray-900/40 rounded-xl border border-gray-800/70").props("dense header-class='text-gray-300 text-sm font-semibold'"):
        with ui.column().classes("w-full gap-0 py-1"):
            for field_name in section_def["fields"]:
                _build_field(field_name, widgets, field_defaults, field_cards,
                             field_status_labels, root_params)


def _build_field(field_name, widgets, field_defaults, field_cards,
                  field_status_labels, root_params):
    if field_name.startswith("__"):
        meta = CUSTOM_FIELDS.get(field_name, {})
        label_text = meta.get("label", field_name.replace("__", ""))
    else:
        meta = root_params.get(field_name, {})
        label_text = field_name

    description = meta.get("Description", "")
    default = meta.get("Default", "")
    allowed = meta.get("AllowedValues", [])
    no_echo = meta.get("NoEcho", "").lower() == "true"
    has_fetcher = field_name in FIELD_FETCHERS

    severity = "optional"
    if "[CRITICAL]" in description:
        severity = "critical"
    elif "[IMPORTANT]" in description:
        severity = "important"
    clean_desc = re.sub(r"\[(CRITICAL|IMPORTANT|OPTIONAL)\]\s*", "", description)

    field_defaults[field_name] = str(default) if default else ""

    # Row container for the entire field
    row = ui.row().classes(
        "w-full items-start gap-4 px-4 py-2 rounded-lg hover:bg-gray-800/40 transition-all"
    ).style("min-height: 42px")
    field_cards[field_name] = row

    with row:
        # LEFT: label + description column (fixed width)
        with ui.column().classes("gap-0 pt-1.5").style("width: 270px; min-width: 270px"):
            with ui.row().classes("items-start gap-1.5"):
                label_cls = "font-semibold text-[13px] leading-tight mt-0.5 "
                if severity == "critical":
                    label_cls += "text-red-400"
                elif severity == "important":
                    label_cls += "text-orange-400"
                else:
                    label_cls += "text-gray-300"
                ui.label(label_text).classes(label_cls).style("word-break: break-word")

                if severity == "critical":
                    ui.icon("emergency").classes("text-red-500 text-[13px] mt-0.5")
                elif severity == "important":
                    ui.icon("priority_high").classes("text-orange-500 text-[13px] mt-0.5")

            if clean_desc:
                ui.label(clean_desc).classes(
                    "text-gray-500 text-[11px] leading-tight mt-0.5"
                ).style("max-width: 250px")

        # RIGHT: input widget (fills remaining space)
        with ui.column().classes("flex-1 gap-0 max-w-2xl"):
            if allowed and len(allowed) <= 30 and not has_fetcher:
                opts = list(allowed)
                init_val = str(default) if default else (opts[0] if opts else None)
                if init_val and init_val not in opts:
                    opts.insert(0, init_val)
                w = ui.select(
                    options=opts, value=init_val,
                    with_input=True,
                ).classes("w-full").props("dense dark filled")
            elif has_fetcher:
                # Fetcher-backed fields use ui.select dropdowns
                init_val = str(default) if default else None
                opts = list(allowed) if allowed else []
                if init_val and init_val not in opts:
                    opts.insert(0, init_val)
                select_props = "dense dark filled"
                select_kwargs = dict(
                    options=opts, value=init_val,
                    with_input=True, clearable=True,
                )
                if field_name in FETCHER_ALLOWS_CUSTOM:
                    select_kwargs["new_value_mode"] = "add"
                w = ui.select(**select_kwargs).classes("w-full").props(select_props)
                # Status label for fetcher feedback
                status_lbl = ui.label("").classes("text-gray-600 text-[10px] mt-0.5")
                field_status_labels[field_name] = status_lbl
            elif no_echo:
                w = ui.input(
                    value=str(default) if default else "",
                    password=True, password_toggle_button=True,
                ).classes("w-full").props("dense dark filled")
            else:
                w = ui.input(
                    value=str(default) if default else "",
                ).classes("w-full").props("dense dark filled")

            widgets[field_name] = w


def _build_deploy_page(log_area, progress_bar, status_labels, last_outputs,
                        do_deploy, do_status, do_delete, run_preflight):
    page = ui.column().classes("w-full h-full")

    with page:
        # Button bar
        with ui.row().classes(
            "w-full bg-gray-900/60 border-b border-gray-800/60 px-6 py-2.5 items-center gap-2"
        ):
            ui.button("Pre-flight", icon="checklist",
                      on_click=run_preflight
                      ).props("color=amber no-caps dense").classes("text-sm px-3")
            ui.separator().props("vertical").classes("h-5 mx-1")
            ui.button("Deploy", icon="rocket_launch",
                      on_click=lambda: do_deploy(False)
                      ).props("color=blue no-caps unelevated").classes("text-sm font-bold px-4")
            ui.button("Dry Run", icon="science",
                      on_click=lambda: do_deploy(True)
                      ).props("color=teal no-caps outline dense").classes("text-sm px-3")
            ui.separator().props("vertical").classes("h-5 mx-1")
            ui.button("Status", icon="info",
                      on_click=do_status
                      ).props("flat no-caps dense").classes("text-gray-400 text-sm")
            ui.button("Delete", icon="delete_forever",
                      on_click=lambda: _confirm_delete(do_delete)
                      ).props("flat no-caps dense").classes("text-red-400 text-sm")

            ui.space()
            dl = ui.label("").classes("text-blue-400 text-sm font-mono font-semibold")
            status_labels["deploy"] = dl

        # Progress bar
        pb = ui.linear_progress(show_value=False).classes("w-full").props("indeterminate color=blue")
        pb.set_visibility(False)
        progress_bar["ref"] = pb

        # Log console
        with ui.column().classes("flex-1 w-full px-5 py-3"):
            with ui.row().classes("items-center gap-2 mb-2"):
                ui.icon("terminal").classes("text-gray-600 text-sm")
                ui.label("Event Log").classes("text-gray-400 font-semibold text-xs tracking-wide uppercase")
                ui.space()
                ui.button(icon="content_copy",
                          on_click=lambda: _copy_outputs(last_outputs)
                          ).props("flat dense round size=sm").classes("text-gray-500").tooltip("Copy outputs")
                ui.button(icon="download",
                          on_click=lambda: _export_log(log_area)
                          ).props("flat dense round size=sm").classes("text-gray-500").tooltip("Export log")

            log_widget = ui.log(max_lines=2000).classes(
                "w-full flex-1 bg-gray-950 rounded-lg border border-gray-800/60 font-mono text-sm"
            ).style("min-height: 400px; max-height: calc(100vh - 16rem)")
            log_area["ref"] = log_widget

    return page


def _confirm_delete(do_delete):
    with ui.dialog() as dialog, ui.card().classes("bg-gray-900 border border-red-800"):
        ui.label("Delete Stack?").classes("text-red-400 text-xl font-bold")
        ui.label(
            "This will permanently delete the stack and ALL its resources."
        ).classes("text-gray-300")
        with ui.row().classes("gap-3 mt-4"):
            ui.button("Cancel", on_click=dialog.close).props("flat")
            ui.button("Delete", icon="delete",
                      on_click=lambda: (dialog.close(), do_delete())
                      ).props("color=red")
    dialog.open()


def _copy_outputs(last_outputs):
    if not last_outputs["data"]:
        ui.notify("No outputs to copy", type="warning")
        return
    text = "\n".join(f"{o['OutputKey']}: {o['OutputValue']}" for o in last_outputs["data"])
    ui.run_javascript(f'navigator.clipboard.writeText({repr(text)})')
    ui.notify("Outputs copied to clipboard", type="positive")


def _export_log(log_area):
    ui.notify("Use Ctrl+A in the log to select all, then Ctrl+C to copy", type="info")


def _handle_upload(e, load_fn):
    try:
        content = e.content.read().decode("utf-8")
        data = yaml.safe_load(content)
        load_fn(data)
        ui.notify(f"Config loaded: {e.name}", type="positive", position="top-right")
    except Exception as ex:
        ui.notify(f"Error: {ex}", type="negative")


def _handle_save(build_fn):
    cfg = build_fn()
    content = yaml.dump(cfg, default_flow_style=False, sort_keys=False)
    ui.download(content.encode(), filename="deploy-config.yaml")


# ═══════════════════════════════════════════════════════════════
# SYNC HELPERS (run in io_bound threads)
# ═══════════════════════════════════════════════════════════════
def _do_change_set_sync(cf, kwargs, stack_name, exists, log, log_raw, status_labels):
    cs = f"gui-preview-{int(time.time())}"
    cs_type = "UPDATE" if exists else "CREATE"
    log(f"Creating change set ({cs_type})...", "#67e8f9")

    cf.create_change_set(**kwargs, ChangeSetName=cs, ChangeSetType=cs_type,
                          Description="Preview from deployment GUI")
    for _ in range(120):
        time.sleep(3)
        try:
            r = cf.describe_change_set(ChangeSetName=cs, StackName=stack_name)
            if r["Status"] in ("CREATE_COMPLETE", "FAILED"):
                break
        except Exception:
            break

    r = cf.describe_change_set(ChangeSetName=cs, StackName=stack_name)
    if r["Status"] == "FAILED":
        reason = r.get("StatusReason", "")
        if "didn't contain changes" in reason or "No updates" in reason:
            log("No changes -- stack is already up to date", "#4ade80")
        else:
            log(f"Change set failed: {reason}", "#f87171")
    else:
        changes = r.get("Changes", [])
        log_raw("", "#71717a")
        log_raw(f"  {'─' * 66}", "#93c5fd")
        log_raw(f"  CHANGE SET PREVIEW -- {len(changes)} resource(s)", "#93c5fd")
        log_raw(f"  {'─' * 66}", "#93c5fd")
        for c in changes:
            rc = c["ResourceChange"]
            action = rc["Action"]
            logical = rc["LogicalResourceId"]
            rtype = rc["ResourceType"]
            repl = rc.get("Replacement", "N/A")
            color = "#4ade80" if action == "Add" else ("#fbbf24" if action == "Modify" else "#f87171")
            flag = "  ⚠ REPLACEMENT" if repl not in ("N/A", "False") else ""
            log_raw(f"    {action:8s}  {logical:38s}  {rtype}{flag}", color)
        log_raw(f"  {'─' * 66}", "#93c5fd")
        log("No resources modified (dry run only)", "#71717a")

    try:
        cf.delete_change_set(ChangeSetName=cs, StackName=stack_name)
    except Exception:
        pass


def _stream_events_sync(cf, stack_name, log, log_raw, status_labels, last_outputs):
    TERMINAL = {"CREATE_COMPLETE", "CREATE_FAILED", "UPDATE_COMPLETE", "UPDATE_FAILED",
                 "DELETE_COMPLETE", "DELETE_FAILED", "ROLLBACK_COMPLETE", "ROLLBACK_FAILED",
                 "UPDATE_ROLLBACK_COMPLETE", "UPDATE_ROLLBACK_FAILED"}
    SUCCESS = {"CREATE_COMPLETE", "UPDATE_COMPLETE", "DELETE_COMPLETE"}

    seen = set()
    start = datetime.now(timezone.utc)

    try:
        for page in cf.get_paginator("describe_stack_events").paginate(StackName=stack_name):
            for e in page["StackEvents"]:
                seen.add(e["EventId"])
    except Exception:
        pass

    log_raw("", "#71717a")
    log_raw(f"  {'─' * 66}", "#71717a")
    log_raw(f"  Event stream: {stack_name}", "#93c5fd")
    log_raw(f"  {'─' * 66}", "#71717a")

    while True:
        time.sleep(5)
        try:
            resp = cf.describe_stacks(StackName=stack_name)
            ss = resp["Stacks"][0]["StackStatus"]
        except ClientError as e:
            if "does not exist" in str(e):
                log("Stack deleted", "#fbbf24")
                return
            raise

        elapsed = int((datetime.now(timezone.utc) - start).total_seconds())

        new = []
        try:
            for page in cf.get_paginator("describe_stack_events").paginate(StackName=stack_name):
                for ev in page["StackEvents"]:
                    if ev["EventId"] not in seen:
                        seen.add(ev["EventId"])
                        new.append(ev)
        except Exception:
            pass

        for ev in reversed(new):
            s = ev.get("ResourceStatus", "")
            lg = ev.get("LogicalResourceId", "")
            rt = ev.get("ResourceType", "")
            rs = ev.get("ResourceStatusReason", "")
            ts = ev["Timestamp"].strftime("%H:%M:%S")

            if "COMPLETE" in s and "ROLLBACK" not in s:
                color = "#4ade80"
            elif "FAILED" in s or "ROLLBACK" in s:
                color = "#f87171"
            elif "PROGRESS" in s:
                color = "#67e8f9"
            else:
                color = "#fbbf24"

            log_raw(f"    {ts}  {s:36s}  {lg:38s}  {rt}", color)
            if rs and ("FAILED" in s or "ROLLBACK" in s):
                log_raw(f"             -> {rs}", "#f87171")

        if ss in TERMINAL:
            elapsed = int((datetime.now(timezone.utc) - start).total_seconds())
            log_raw("", "#71717a")
            log_raw(f"  {'═' * 66}", "#93c5fd")
            if ss in SUCCESS:
                log_raw(f"  ✓  {ss}", "#4ade80")
                outputs = resp["Stacks"][0].get("Outputs", [])
                last_outputs["data"] = outputs
                if outputs:
                    log_raw("", "#71717a")
                    log_raw("  Outputs:", "#93c5fd")
                    for o in outputs:
                        log_raw(f"    {o['OutputKey']:38s}  {o['OutputValue']}", "#4ade80")
            else:
                log_raw(f"  ✗  {ss}", "#f87171")
            log_raw(f"  Duration: {elapsed // 60}m {elapsed % 60}s", "#71717a")
            log_raw(f"  {'═' * 66}", "#93c5fd")
            return


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="AWS 3-Tier Deployment GUI")
    parser.add_argument("--config", "-c", help="Pre-load a config YAML")
    parser.add_argument("--port", "-p", type=int, default=8090, help="Port (default 8090)")
    parser.add_argument("--host", default="127.0.0.1", help="Host (default 127.0.0.1)")
    args = parser.parse_args()

    @ui.page("/")
    def index():
        create_gui(preload_config=args.config)

    ui.run(
        title="AWS CloudFormation -- 3-Tier Deployer",
        port=args.port,
        host=args.host,
        dark=True,
        reload=False,
        show=True,
    )


if __name__ == "__main__":
    main()
