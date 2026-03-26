import os
import re
import yaml
import json
import uuid
import subprocess
import boto3
from flask import Flask, render_template, request, jsonify, stream_with_context, Response

import aws_resource_fetcher as fetcher
from aws_resource_fetcher import FetchResult, fetch_values

app = Flask(__name__)

# Constants from deployment_gui.py
TAB_LAYOUT = [
    {
        "name": "Credentials",
        "icon": "key",
        "description": "AWS authentication -- leave blank to use system defaults.",
        "sections": [
            {
                "title": "Authentication",
                "icon": "lock",
                "fields": ["__aws_profile", "__aws_access_key", "__aws_secret_key", "__aws_region"]
            }
        ]
    },
    {
        "name": "Stack Config",
        "icon": "settings",
        "description": "Stack identity, S3 template source, and IAM execution role.",
        "sections": [
            {
                "title": "Stack Identity",
                "icon": "badge",
                "fields": ["__stack_name", "EnvironmentName"]
            },
            {
                "title": "S3 Templates",
                "icon": "cloud_upload",
                "fields": ["__s3_bucket", "__s3_prefix", "__sync_templates", "TemplatesBucketName", "TemplatesPrefix"]
            },
            {
                "title": "IAM Execution",
                "icon": "admin_panel_settings",
                "fields": ["__role_arn"]
            }
        ]
    },
    {
        "name": "Networking",
        "icon": "hub",
        "description": "VPC, subnets, DNS, and flow logs.",
        "sections": [
            {
                "title": "VPC",
                "icon": "account_tree",
                "fields": ["NumberOfAZs", "VpcCIDR", "EnableDnsSupport", "EnableDnsHostnames", "VpcFlowLogRetentionDays", "VpcFlowLogTrafficType"]
            },
            {
                "title": "Public Subnets",
                "icon": "public",
                "fields": ["PublicSubnet1CIDR", "PublicSubnet2CIDR", "PublicSubnet3CIDR"]
            },
            {
                "title": "Private App Subnets",
                "icon": "vpn_lock",
                "fields": ["PrivateAppSubnet1CIDR", "PrivateAppSubnet2CIDR", "PrivateAppSubnet3CIDR"]
            },
            {
                "title": "Private Data Subnets",
                "icon": "dns",
                "fields": ["PrivateDataSubnet1CIDR", "PrivateDataSubnet2CIDR", "PrivateDataSubnet3CIDR"]
            },
            {
                "title": "Ports & Access",
                "icon": "login",
                "fields": ["HttpPort", "HttpsPort", "FrontendAppPort", "BackendAppPort", "DatabasePort", "AllowedIngressCIDR"]
            }
        ]
    },
    {
        "name": "Compute",
        "icon": "memory",
        "description": "ECS cluster, EC2 instances, auto scaling, Fargate tasks, and services.",
        "sections": [
            {
                "title": "Cluster & Auto Scaling",
                "icon": "memory",
                "fields": ["ContainerInsightsEnabled", "InstanceType", "EBSVolumeSize", "EBSVolumeType", "EBSEncrypted", "IMDSHttpTokens", "DetailedMonitoringEnabled", "IMDSHttpPutResponseHopLimit", "ASGMinSize", "ASGMaxSize", "ASGDesiredCapacity", "CapacityProviderTargetCapacity", "HealthCheckType", "HealthCheckGracePeriod", "ManagedTerminationProtection"]
            },
            {
                "title": "Frontend App",
                "icon": "laptop_mac",
                "fields": ["FrontendLaunchType", "FrontendImageTag", "FrontendCPU", "FrontendMemory", "FrontendContainerPort", "FrontendNetworkMode", "FrontendLogStreamPrefix"]
            },
            {
                "title": "Frontend Service Scaling",
                "icon": "trending_up",
                "fields": ["FrontendDesiredCount", "FrontendScaleMinCapacity", "FrontendScaleMaxCapacity", "FrontendScaleCpuTarget", "FrontendMaximumPercent", "FrontendMinimumHealthyPercent", "FrontendHealthCheckGracePeriod", "FrontendScaleInCooldown", "FrontendScaleOutCooldown", "FrontendListenerRulePriority", "FrontendPathPattern", "FrontendEnableExecuteCommand"]
            },
            {
                "title": "Backend App",
                "icon": "api",
                "fields": ["BackendLaunchType", "BackendImageTag", "BackendCPU", "BackendMemory", "BackendContainerPort", "BackendNetworkMode", "BackendLogStreamPrefix"]
            },
            {
                "title": "Backend Service Scaling",
                "icon": "trending_up",
                "fields": ["BackendDesiredCount", "BackendScaleMinCapacity", "BackendScaleMaxCapacity", "BackendScaleCpuTarget", "BackendMaximumPercent", "BackendMinimumHealthyPercent", "BackendHealthCheckGracePeriod", "BackendScaleInCooldown", "BackendScaleOutCooldown", "BackendListenerRulePriority", "BackendPathPattern", "BackendEnableExecuteCommand"]
            }
        ]
    },
    {
        "name": "Database",
        "icon": "folder",
        "description": "RDS settings, backup retention, engine versions, and performance insights.",
        "sections": [
            {
                "title": "Engine",
                "icon": "storage",
                "fields": ["DatabaseName", "DBEngine", "DBEngineVersion", "DBInstanceClass"]
            },
            {
                "title": "Storage",
                "icon": "sd_storage",
                "fields": ["DBAllocatedStorage", "MaxAllocatedStorage", "MultiAZ", "StorageType", "StorageEncrypted"]
            },
            {
                "title": "Access",
                "icon": "password",
                "fields": ["DBAdminUsername", "DBPort"]
            },
            {
                "title": "Maintenance & Backups",
                "icon": "build_circle",
                "fields": ["DBBackupRetentionPeriod", "DBDeletionProtection", "CopyTagsToSnapshot", "PreferredMaintenanceWindow", "PreferredBackupWindow", "AutoMinorVersionUpgrade"]
            },
            {
                "title": "Monitoring",
                "icon": "insights",
                "fields": ["EnablePerformanceInsights", "PerformanceInsightsRetentionPeriod", "MonitoringInterval"]
            }
        ]
    },
    {
        "name": "Load Balancer",
        "icon": "balance",
        "description": "ALB listener rules, health checks, timeouts, and certificates.",
        "sections": [
            {
                "title": "Public ALB",
                "icon": "public",
                "fields": ["ALBIdleTimeout", "ALBDeletionProtection", "ALBHTTP2Enabled", "ALBDropInvalidHeaders", "ALBAccessLogsEnabled", "ALBListenerPort"]
            },
            {
                "title": "Certificates & SSL",
                "icon": "lock",
                "fields": ["ACMCertificateArn", "SSLPolicy"]
            },
            {
                "title": "Health Checks",
                "icon": "favorite",
                "fields": ["FrontendHealthCheckPath", "BackendHealthCheckPath", "DeregistrationDelay", "HealthCheckIntervalSeconds", "HealthCheckTimeoutSeconds", "HealthyThresholdCount", "UnhealthyThresholdCount", "MatcherHttpCode"]
            },
            {
                "title": "Stickiness",
                "icon": "push_pin",
                "fields": ["StickinessEnabled", "StickinessDurationSeconds"]
            },
            {
                "title": "Internal ALB",
                "icon": "vpn_lock",
                "fields": ["InternalALBIdleTimeout", "InternalALBDeletionProtection", "InternalALBHTTP2Enabled", "InternalALBDropInvalidHeaders", "InternalALBListenerPort"]
            }
        ]
    },
    {
        "name": "Security",
        "icon": "security",
        "description": "WAF rules, Secrets Manager, and ECR scanning.",
        "sections": [
            {
                "title": "WAF",
                "icon": "shield",
                "fields": ["WAFScope", "RateLimitThreshold", "EnableCommonRuleSet", "EnableSQLiRuleSet", "EnableKnownBadInputsRuleSet", "EnableSampledRequests"]
            },
            {
                "title": "Secrets Generation",
                "icon": "password",
                "fields": ["PasswordLength", "PasswordExcludeChars", "RequireEachCharType"]
            },
            {
                "title": "Registry (ECR)",
                "icon": "inventory_2",
                "fields": ["ImageTagMutability", "MaxImageCount", "ScanOnPush", "ECREncryptionType"]
            },
            {
                "title": "S3 Security",
                "icon": "cloud_done",
                "fields": ["AssetsBucketEncryptionAlgorithm", "AssetsNoncurrentVersionExpiryDays", "AssetsTransitionDays", "AssetsTransitionStorageClass", "AccessLogsBucketEncryptionAlgorithm", "EnableAssetsVersioning"]
            }
        ]
    },
    {
        "name": "Monitoring & DNS",
        "icon": "analytics",
        "description": "CloudWatch logs, CloudTrail, and Route53 records.",
        "sections": [
            {
                "title": "CloudWatch Logs",
                "icon": "list_alt",
                "fields": ["LogRetentionDays", "FrontendLogGroupSuffix", "BackendLogGroupSuffix"]
            },
            {
                "title": "CloudTrail",
                "icon": "track_changes",
                "fields": ["IsMultiRegionTrail", "EnableLogFileValidation", "IncludeGlobalServiceEvents", "TrailBucketEncryptionAlgorithm", "IsLogging"]
            },
            {
                "title": "Route53",
                "icon": "language",
                "fields": ["HostedZoneName", "AppSubdomain"]
            }
        ]
    }
]

CUSTOM_FIELDS = {
    "__aws_profile": {"label": "AWS Profile", "Description": "AWS CLI profile name. Leave empty to use default credentials or environment variables.", "Default": ""},
    "__aws_access_key": {"label": "Access Key ID", "Description": "AWS Access Key ID. Leave empty to auto-detect.", "Default": ""},
    "__aws_secret_key": {"label": "Secret Access Key", "Description": "AWS Secret Access Key. Leave empty to auto-detect.", "Default": "", "NoEcho": "true"},
    "__aws_region": {"label": "Region", "Description": "AWS region to deploy into.", "Default": "us-east-1", "AllowedValues": ["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1"]},
    "__stack_name": {"label": "Stack Name", "Description": "CloudFormation stack name (alphanumeric and hyphens).", "Default": "three-tier-dev"},
    "__s3_bucket": {"label": "S3 Template Bucket", "Description": "S3 bucket containing the CloudFormation template files.", "Default": ""},
    "__s3_prefix": {"label": "S3 Prefix", "Description": "S3 key prefix (folder path) inside the bucket.", "Default": ""},
    "__sync_templates": {"label": "Sync Templates to S3", "Description": "Upload local template files to S3 before deploying.", "Default": "true", "AllowedValues": ["true", "false"]},
    "__role_arn": {"label": "Role ARN", "Description": "[OPTIONAL] IAM Role ARN for CloudFormation to assume. Leave blank to use deployer's credentials.", "Default": ""}
}

def parse_root_parameters(root_yaml_path):
    if not os.path.isfile(root_yaml_path):
        return {}
    with open(root_yaml_path, 'r') as f:
        lines = f.readlines()

    params = {}
    in_params = False
    current_param = None
    current_section = ''

    for line in lines:
        stripped = line.rstrip()
        if stripped.strip() == 'Parameters:':
            in_params = True
            continue
        if in_params and stripped and not stripped.startswith(' ') and not stripped.startswith('#'):
            break
        if not in_params:
            continue

        cm = re.match(r'^\s*#\s+([A-Z][A-Z &/()-]+)\s*$', stripped)
        if cm:
            current_section = cm.group(1).strip()
            continue

        m = re.match(r'^  ([A-Z][A-Za-z0-9]+):$', stripped)
        if m:
            current_param = m.group(1)
            params[current_param] = {'section': current_section}
            continue

        if current_param and current_param in params:
            m2 = re.match(r'^    (Type|Default|Description|AllowedPattern|NoEcho):\s*(.*)', stripped)
            if m2:
                key, val = m2.group(1), m2.group(2).strip().strip("'\"")
                params[current_param][key] = val
                continue
            if re.match(r'^    AllowedValues:', stripped):
                inline = stripped.split(':', 1)[1].strip()
                if inline.startswith('['):
                    items = [x.strip().strip("'\"") for x in inline[1:-1].split(',')]
                    params[current_param]['AllowedValues'] = items
                else:
                    params[current_param]['AllowedValues'] = []
                continue
            m3 = re.match(r'^      - (.+)', stripped)
            if m3 and 'AllowedValues' in params.get(current_param, {}):
                params[current_param]['AllowedValues'].append(m3.group(1).strip().strip("'\""))

    return params

@app.route('/')
def index():
    return render_template('index.html')

# Which fields can be auto-populated from AWS
FIELD_FETCHER_KEYS = {
    "__aws_profile":       {"type": "static"},
    "__s3_bucket":         {"type": "static"},
    "__s3_prefix":         {"type": "dependent", "depends_on": "__s3_bucket"},
    "TemplatesBucketName": {"type": "static"},
    "TemplatesPrefix":     {"type": "dependent", "depends_on": "TemplatesBucketName"},
    "__role_arn":           {"type": "static"},
    "AllowedIngressCIDR":  {"type": "static"},
    "InstanceType":        {"type": "region"},
    "DBEngineVersion":     {"type": "dependent", "depends_on": "DBEngine"},
    "DBInstanceClass":     {"type": "dependent", "depends_on": "DBEngine"},
    "ACMCertificateArn":   {"type": "region"},
    "SSLPolicy":           {"type": "static"},
    "HostedZoneName":      {"type": "static"},
}

# Fields where users may type values not in the list
FETCHER_ALLOWS_CUSTOM = [
    "__s3_prefix", "__s3_bucket", "__role_arn",
    "InstanceType", "AllowedIngressCIDR",
    "TemplatesBucketName", "TemplatesPrefix",
    "DBEngineVersion", "DBInstanceClass",
    "ACMCertificateArn", "HostedZoneName",
]

# Parent → children cascade relationships
DEPENDENT_FETCHERS = {
    "DBEngine": ["DBEngineVersion", "DBInstanceClass"],
    "__s3_bucket": ["__s3_prefix"],
    "TemplatesBucketName": ["TemplatesPrefix"],
}


@app.route('/api/config')
def config():
    root_params = parse_root_parameters('root.yaml')
    return jsonify({
        "layout": TAB_LAYOUT,
        "custom_fields": CUSTOM_FIELDS,
        "root_params": root_params,
        "fetcher_fields": FIELD_FETCHER_KEYS,
        "allows_custom": FETCHER_ALLOWS_CUSTOM,
        "dependent_fetchers": DEPENDENT_FETCHERS,
    })

def _init_fetcher_session(region=None, profile=None):
    """Create a boto3 session and register it with the fetcher module."""
    kwargs = {}
    if region:
        kwargs["region_name"] = region
    if profile:
        kwargs["profile_name"] = profile
    session = boto3.Session(**kwargs)
    fetcher.set_session(session)
    return session


@app.route('/api/aws/fetch', methods=['POST'])
def aws_fetch():
    """Fetch AWS resources for a specific field.
    Body: { "field": "<field_name>", "region": "us-east-1", "context": { ... } }
    Returns: { "status": "ok"|"permission_error"|..., "values": [...], "error_message": "...", "required_permission": "..." }
    """
    data = request.json or {}
    field = data.get("field", "")
    region = data.get("region", "us-east-1") or "us-east-1"
    ctx = data.get("context", {})  # current form values for dependent fetchers
    profile = data.get("profile", "")

    _init_fetcher_session(region=region, profile=profile or None)

    # Map field → fetcher function call
    FETCHER_MAP = {
        "__aws_profile":       lambda: fetcher.fetch_aws_profiles(),
        "__s3_bucket":         lambda: fetcher.fetch_s3_buckets(),
        "__s3_prefix":         lambda: fetcher.fetch_s3_prefixes(ctx.get("__s3_bucket", "")),
        "TemplatesBucketName": lambda: fetcher.fetch_s3_buckets(),
        "TemplatesPrefix":     lambda: fetcher.fetch_s3_prefixes(ctx.get("TemplatesBucketName", "") or ctx.get("__s3_bucket", "")),
        "__role_arn":           lambda: fetcher.fetch_iam_roles(),
        "AllowedIngressCIDR":  lambda: fetcher.fetch_my_ip(),
        "InstanceType":        lambda: fetcher.fetch_instance_types(region),
        "DBEngineVersion":     lambda: fetcher.fetch_db_engine_versions(ctx.get("DBEngine", "")),
        "DBInstanceClass":     lambda: fetcher.fetch_db_instance_classes(ctx.get("DBEngine", ""), region),
        "ACMCertificateArn":   lambda: fetcher.fetch_acm_certificates(region),
        "SSLPolicy":           lambda: fetcher.fetch_ssl_policies(),
        "HostedZoneName":      lambda: fetcher.fetch_hosted_zones(),
    }

    fn = FETCHER_MAP.get(field)
    if not fn:
        return jsonify({"status": "error", "values": [], "error_message": f"No fetcher for field: {field}"})

    try:
        result = fn()
    except Exception as e:
        return jsonify({"status": "error", "values": [], "error_message": str(e)})

    if isinstance(result, FetchResult):
        return jsonify({
            "status": result.status,
            "values": result.values,
            "error_message": result.error_message,
            "required_permission": result.required_permission,
        })
    elif isinstance(result, list):
        return jsonify({"status": "ok", "values": result, "error_message": "", "required_permission": ""})
    else:
        return jsonify({"status": "ok", "values": [], "error_message": "", "required_permission": ""})


@app.route('/api/aws/fetch-all', methods=['POST'])
def aws_fetch_all():
    """Fetch all fetchable fields at once.
    Body: { "region": "us-east-1", "context": { ... }, "profile": "" }
    Returns: { "<field_name>": { "status": ..., "values": [...], ... }, ... }
    """
    data = request.json or {}
    region = data.get("region", "us-east-1") or "us-east-1"
    ctx = data.get("context", {})
    profile = data.get("profile", "")

    _init_fetcher_session(region=region, profile=profile or None)

    results = {}
    FETCHER_MAP = {
        "__aws_profile":       lambda: fetcher.fetch_aws_profiles(),
        "__s3_bucket":         lambda: fetcher.fetch_s3_buckets(),
        "__s3_prefix":         lambda: fetcher.fetch_s3_prefixes(ctx.get("__s3_bucket", "")),
        "TemplatesBucketName": lambda: fetcher.fetch_s3_buckets(),
        "TemplatesPrefix":     lambda: fetcher.fetch_s3_prefixes(ctx.get("TemplatesBucketName", "") or ctx.get("__s3_bucket", "")),
        "__role_arn":           lambda: fetcher.fetch_iam_roles(),
        "AllowedIngressCIDR":  lambda: fetcher.fetch_my_ip(),
        "InstanceType":        lambda: fetcher.fetch_instance_types(region),
        "DBEngineVersion":     lambda: fetcher.fetch_db_engine_versions(ctx.get("DBEngine", "")),
        "DBInstanceClass":     lambda: fetcher.fetch_db_instance_classes(ctx.get("DBEngine", ""), region),
        "ACMCertificateArn":   lambda: fetcher.fetch_acm_certificates(region),
        "SSLPolicy":           lambda: fetcher.fetch_ssl_policies(),
        "HostedZoneName":      lambda: fetcher.fetch_hosted_zones(),
    }

    for field, fn in FETCHER_MAP.items():
        try:
            result = fn()
            if isinstance(result, FetchResult):
                results[field] = {
                    "status": result.status,
                    "values": result.values,
                    "error_message": result.error_message,
                    "required_permission": result.required_permission,
                }
            elif isinstance(result, list):
                results[field] = {"status": "ok", "values": result, "error_message": "", "required_permission": ""}
            else:
                results[field] = {"status": "ok", "values": [], "error_message": "", "required_permission": ""}
        except Exception as e:
            results[field] = {"status": "error", "values": [], "error_message": str(e), "required_permission": ""}

    return jsonify(results)


@app.route('/api/aws/credentials')
def aws_credentials():
    try:
        session = boto3.Session()
        creds = session.get_credentials()
        region = session.region_name or 'us-east-1'
        profile = os.environ.get('AWS_PROFILE', 'default')
        
        if creds:
            return jsonify({"status": "success", "profile": profile, "region": region})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
        
    return jsonify({"status": "error", "message": "No AWS credentials found in environment"})

# In-memory store for active process
deploy_processes = {}

@app.route('/api/deploy', methods=['POST'])
def deploy():
    data = request.json
    action = data.get('action', 'preflight') # preflight, deploy, delete
    fields = data.get('fields', {})
    
    # Construct the config dict expected by automate_deployment.py
    cfg = {
        "region": fields.get('__aws_region', 'us-east-1'),
        "stack_name": fields.get('__stack_name', ''),
        "s3_bucket": fields.get('__s3_bucket', ''),
        "s3_prefix": fields.get('__s3_prefix', ''),
        "sync_templates": fields.get('__sync_templates', 'true').lower() == 'true',
        "parameters": {},
        "tags": {
            "ManagedBy": "CloudFormation-Deployer-v2"
        }
    }
    
    if fields.get('__aws_profile'):
        cfg['profile'] = fields['__aws_profile']
    if fields.get('__role_arn'):
        cfg['role_arn'] = fields['__role_arn']
        
    for k, v in fields.items():
        if not k.startswith('__'):
            cfg["parameters"][k] = v
            
    # Generate random task id
    task_id = str(uuid.uuid4())
    log_file = f"/tmp/deploy_{task_id}.log"
    config_file = f"/tmp/deploy_config_{task_id}.yaml"
    
    # Save parameters to a temporary YAML file
    with open(config_file, 'w') as f:
        yaml.dump(cfg, f)
        
    cmd = ["python3", "automate_deployment.py"]
    if action == "preflight":
        cmd.extend(["--config", config_file, "--dry-run"])
    elif action == "deploy":
        cmd.extend(["--config", config_file])
    elif action == "delete":
        cmd.extend(["--config", config_file, "--delete"])
        
    # Open process and redirect output to log file
    with open(log_file, 'w') as log:
        p = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT, env=os.environ.copy())
        deploy_processes[task_id] = {"process": p, "log_file": log_file}
        
    return jsonify({"task_id": task_id})

@app.route('/api/logs/<task_id>')
def get_logs(task_id):
    if task_id not in deploy_processes:
        return jsonify({"error": "Task not found"}), 404
        
    log_file = deploy_processes[task_id]["log_file"]
    p = deploy_processes[task_id]["process"]
    
    if os.path.exists(log_file):
        with open(log_file, 'r') as f:
            content = f.read()
    else:
        content = ""
        
    is_running = p.poll() is None
    
    return jsonify({
        "logs": content,
        "is_running": is_running,
        "exit_code": p.poll()
    })

if __name__ == '__main__':
    app.run(debug=True, port=8090, host='0.0.0.0')
