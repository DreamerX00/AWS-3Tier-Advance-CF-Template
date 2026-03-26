#!/usr/bin/env python3
"""
AWS 3-Tier CloudFormation Deployment Automation
================================================
Pure Boto3 replacement for browser-based Console automation.

Usage:
    python3 automate_deployment.py --config deploy-config.dev.yaml
    python3 automate_deployment.py --config deploy-config.dev.yaml --dry-run
    python3 automate_deployment.py --config deploy-config.dev.yaml --delete
    python3 automate_deployment.py --config deploy-config.dev.yaml --status
    python3 automate_deployment.py --config deploy-config.dev.yaml --events 20

Prerequisites:
    pip install boto3 pyyaml
    aws configure  (or: aws sso login --profile <profile>)
"""

import argparse
import os
import sys
import time
import subprocess
import yaml
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timezone

# ─── ANSI Colors ───────────────────────────────────────────────
CYAN    = "\033[96m"
GREEN   = "\033[92m"
YELLOW  = "\033[93m"
RED     = "\033[91m"
MAGENTA = "\033[95m"
DIM     = "\033[2m"
BOLD    = "\033[1m"
RESET   = "\033[0m"

STATUS_COLORS = {
    "CREATE_COMPLETE":          GREEN,
    "UPDATE_COMPLETE":          GREEN,
    "DELETE_COMPLETE":          GREEN,
    "CREATE_IN_PROGRESS":       CYAN,
    "UPDATE_IN_PROGRESS":       CYAN,
    "DELETE_IN_PROGRESS":       CYAN,
    "CREATE_FAILED":            RED,
    "UPDATE_FAILED":            RED,
    "DELETE_FAILED":            RED,
    "ROLLBACK_IN_PROGRESS":     YELLOW,
    "ROLLBACK_COMPLETE":        RED,
    "ROLLBACK_FAILED":          RED,
    "UPDATE_ROLLBACK_IN_PROGRESS":  YELLOW,
    "UPDATE_ROLLBACK_COMPLETE":     RED,
    "UPDATE_ROLLBACK_FAILED":       RED,
}

TERMINAL_STATES = {
    "CREATE_COMPLETE", "CREATE_FAILED",
    "UPDATE_COMPLETE", "UPDATE_FAILED",
    "DELETE_COMPLETE", "DELETE_FAILED",
    "ROLLBACK_COMPLETE", "ROLLBACK_FAILED",
    "UPDATE_ROLLBACK_COMPLETE", "UPDATE_ROLLBACK_FAILED",
    "IMPORT_COMPLETE", "IMPORT_ROLLBACK_COMPLETE",
}

SUCCESS_STATES = {
    "CREATE_COMPLETE", "UPDATE_COMPLETE", "DELETE_COMPLETE",
    "IMPORT_COMPLETE",
}


# ─── Helpers ───────────────────────────────────────────────────
def log(msg, color=RESET):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"{DIM}{ts}{RESET} {color}{msg}{RESET}")


def load_config(path):
    if not os.path.isfile(path):
        print(f"{RED}Config file not found: {path}{RESET}")
        sys.exit(1)
    with open(path, "r") as f:
        cfg = yaml.safe_load(f)
    # Validate required keys
    for key in ("stack_name", "region", "s3_bucket", "s3_prefix", "parameters"):
        if key not in cfg:
            print(f"{RED}Missing required config key: '{key}'{RESET}")
            sys.exit(1)
    required_params = ("EnvironmentName", "TemplatesBucketName")
    for p in required_params:
        if p not in cfg["parameters"]:
            print(f"{RED}Missing required parameter: '{p}'{RESET}")
            sys.exit(1)
    return cfg


def get_session(cfg):
    profile = cfg.get("profile")
    region = cfg["region"]
    if profile:
        return boto3.Session(profile_name=profile, region_name=region)
    return boto3.Session(region_name=region)


def get_template_url(cfg):
    bucket = cfg["s3_bucket"]
    prefix = cfg["s3_prefix"]
    region = cfg["region"]
    return f"https://{bucket}.s3.{region}.amazonaws.com/{prefix}/root.yaml"


# ─── S3 Template Sync ─────────────────────────────────────────
def sync_templates(cfg):
    """Sync local template files to S3 using AWS CLI."""
    bucket = cfg["s3_bucket"]
    prefix = cfg["s3_prefix"]
    profile = cfg.get("profile")
    region = cfg["region"]

    # Determine script directory (where templates live)
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Folders to sync
    folders = [
        "networking", "compute", "database", "loadbalancer",
        "security", "iam", "secrets", "registry", "storage",
        "monitoring", "dns",
    ]

    log("Syncing templates to S3...", CYAN)

    # Sync root.yaml
    root_yaml = os.path.join(script_dir, "root.yaml")
    if not os.path.isfile(root_yaml):
        log(f"root.yaml not found at {root_yaml}", RED)
        sys.exit(1)

    cmd_base = ["aws", "s3", "cp", "--region", region]
    if profile:
        cmd_base += ["--profile", profile]

    # Upload root.yaml
    cmd = cmd_base + [root_yaml, f"s3://{bucket}/{prefix}/root.yaml"]
    log(f"  Uploading root.yaml → s3://{bucket}/{prefix}/root.yaml", DIM)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log(f"  Failed: {result.stderr.strip()}", RED)
        sys.exit(1)

    # Sync each subfolder
    sync_base = ["aws", "s3", "sync", "--region", region, "--delete"]
    if profile:
        sync_base += ["--profile", profile]

    for folder in folders:
        local_path = os.path.join(script_dir, folder)
        if not os.path.isdir(local_path):
            log(f"  Skipping {folder}/ (not found locally)", DIM)
            continue
        s3_path = f"s3://{bucket}/{prefix}/{folder}/"
        cmd = sync_base + [local_path, s3_path]
        log(f"  Syncing {folder}/ → {s3_path}", DIM)
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            log(f"  Failed: {result.stderr.strip()}", RED)
            sys.exit(1)

    log("Template sync complete ✓", GREEN)


# ─── Validate Templates ───────────────────────────────────────
def validate_template(session, cfg):
    """Validate the root template via CloudFormation API."""
    cf = session.client("cloudformation")
    url = get_template_url(cfg)
    log(f"Validating template: {url}", CYAN)
    try:
        cf.validate_template(TemplateURL=url)
        log("Template validation passed ✓", GREEN)
    except ClientError as e:
        log(f"Template validation FAILED: {e.response['Error']['Message']}", RED)
        sys.exit(1)


# ─── Stack Operations ─────────────────────────────────────────
def build_params(cfg):
    """Convert config parameters dict to CloudFormation Parameter list."""
    params = []
    for key, val in cfg["parameters"].items():
        params.append({"ParameterKey": key, "ParameterValue": str(val)})
    return params


def build_tags(cfg):
    """Convert config tags dict to CloudFormation Tag list."""
    tags = []
    for key, val in cfg.get("tags", {}).items():
        tags.append({"Key": str(key), "Value": str(val)})
    return tags


def stack_exists(cf, stack_name):
    """Check if a stack exists and is not in DELETE_COMPLETE state."""
    try:
        resp = cf.describe_stacks(StackName=stack_name)
        status = resp["Stacks"][0]["StackStatus"]
        if status == "DELETE_COMPLETE":
            return False, None
        return True, status
    except ClientError as e:
        if "does not exist" in str(e):
            return False, None
        raise


def create_or_update_stack(session, cfg, dry_run=False):
    """Create or update the CloudFormation stack."""
    cf = session.client("cloudformation")
    stack_name = cfg["stack_name"]
    template_url = get_template_url(cfg)
    params = build_params(cfg)
    tags = build_tags(cfg)
    capabilities = cfg.get("capabilities", ["CAPABILITY_NAMED_IAM"])

    exists, current_status = stack_exists(cf, stack_name)

    # Build common kwargs
    kwargs = {
        "StackName": stack_name,
        "TemplateURL": template_url,
        "Parameters": params,
        "Capabilities": capabilities,
        "Tags": tags,
    }
    if cfg.get("role_arn"):
        kwargs["RoleARN"] = cfg["role_arn"]

    if dry_run:
        # Create a change set for review
        change_set_name = f"dry-run-{int(time.time())}"
        log(f"Creating change set '{change_set_name}' (dry run)...", CYAN)
        cs_type = "UPDATE" if exists else "CREATE"
        cf.create_change_set(
            **kwargs,
            ChangeSetName=change_set_name,
            ChangeSetType=cs_type,
            Description="Dry run change set from automate_deployment.py",
        )
        # Wait for change set to be created
        log("Waiting for change set to be computed...", DIM)
        waiter = cf.get_waiter("change_set_create_complete")
        try:
            waiter.wait(
                ChangeSetName=change_set_name,
                StackName=stack_name,
                WaiterConfig={"Delay": 5, "MaxAttempts": 60},
            )
        except Exception:
            # Change set may have status FAILED if no changes
            pass

        resp = cf.describe_change_set(
            ChangeSetName=change_set_name, StackName=stack_name
        )
        status = resp["Status"]
        if status == "FAILED":
            reason = resp.get("StatusReason", "")
            if "didn't contain changes" in reason or "No updates" in reason:
                log("No changes detected — stack is up to date.", GREEN)
            else:
                log(f"Change set failed: {reason}", RED)
            cf.delete_change_set(
                ChangeSetName=change_set_name, StackName=stack_name
            )
            return

        # Print changes
        changes = resp.get("Changes", [])
        log(f"\n{'='*70}", BOLD)
        log(f"  CHANGE SET: {len(changes)} resource(s) affected", BOLD)
        log(f"{'='*70}", BOLD)
        for c in changes:
            rc = c["ResourceChange"]
            action = rc["Action"]
            logical = rc["LogicalResourceId"]
            rtype = rc["ResourceType"]
            replacement = rc.get("Replacement", "N/A")
            color = GREEN if action == "Add" else (YELLOW if action == "Modify" else RED)
            repl_str = f" (REPLACEMENT: {replacement})" if replacement not in ("N/A", "False") else ""
            log(f"  {action:8s}  {logical:40s}  {rtype}{repl_str}", color)
        log(f"{'='*70}\n", BOLD)

        # Cleanup: delete the change set
        cf.delete_change_set(
            ChangeSetName=change_set_name, StackName=stack_name
        )
        log("Change set deleted. No resources were modified (dry run).", DIM)
        return

    # Actual deploy
    if exists:
        if current_status in ("ROLLBACK_COMPLETE", "ROLLBACK_FAILED",
                              "CREATE_FAILED", "DELETE_FAILED"):
            log(f"Stack is in '{current_status}' — deleting before re-creating...", YELLOW)
            cf.delete_stack(StackName=stack_name)
            log("Waiting for delete to complete...", DIM)
            cf.get_waiter("stack_delete_complete").wait(
                StackName=stack_name,
                WaiterConfig={"Delay": 10, "MaxAttempts": 120},
            )
            log("Old stack deleted. Creating fresh...", GREEN)
            exists = False

    if exists:
        action = "Updating"
        try:
            cf.update_stack(**kwargs)
        except ClientError as e:
            if "No updates are to be performed" in str(e):
                log("No updates needed — stack is already up to date.", GREEN)
                return
            raise
    else:
        action = "Creating"
        kwargs["OnFailure"] = "ROLLBACK"
        cf.create_stack(**kwargs)

    log(f"{action} stack '{stack_name}'...", CYAN)
    stream_events(cf, stack_name)


def delete_stack(session, cfg):
    """Delete the CloudFormation stack."""
    cf = session.client("cloudformation")
    stack_name = cfg["stack_name"]

    exists, status = stack_exists(cf, stack_name)
    if not exists:
        log(f"Stack '{stack_name}' does not exist.", YELLOW)
        return

    log(f"Deleting stack '{stack_name}' (current status: {status})...", RED)

    # Disable termination protection / deletion protection if needed
    try:
        cf.update_termination_protection(
            EnableTerminationProtection=False, StackName=stack_name
        )
    except ClientError:
        pass

    cf.delete_stack(StackName=stack_name)
    stream_events(cf, stack_name)


# ─── Event Streaming ──────────────────────────────────────────
def stream_events(cf, stack_name):
    """Poll and display stack events in real-time until terminal state."""
    seen_events = set()
    start_time = datetime.now(timezone.utc)

    # Collect already-existing events to skip them
    try:
        paginator = cf.get_paginator("describe_stack_events")
        for page in paginator.paginate(StackName=stack_name):
            for event in page["StackEvents"]:
                seen_events.add(event["EventId"])
    except ClientError:
        pass

    log(f"\n{'─'*80}", DIM)
    log(f"  Streaming events for: {stack_name}", BOLD)
    log(f"{'─'*80}", DIM)

    while True:
        time.sleep(5)
        try:
            resp = cf.describe_stacks(StackName=stack_name)
            stack_status = resp["Stacks"][0]["StackStatus"]
        except ClientError as e:
            if "does not exist" in str(e):
                log("Stack has been deleted.", YELLOW)
                return
            raise

        # Fetch new events
        new_events = []
        try:
            paginator = cf.get_paginator("describe_stack_events")
            for page in paginator.paginate(StackName=stack_name):
                for event in page["StackEvents"]:
                    if event["EventId"] not in seen_events:
                        seen_events.add(event["EventId"])
                        new_events.append(event)
        except ClientError:
            pass

        # Print new events (oldest first)
        for event in reversed(new_events):
            evt_status = event.get("ResourceStatus", "")
            logical_id = event.get("LogicalResourceId", "")
            rtype = event.get("ResourceType", "")
            reason = event.get("ResourceStatusReason", "")
            color = STATUS_COLORS.get(evt_status, RESET)
            ts = event["Timestamp"].strftime("%H:%M:%S")

            line = f"  {ts}  {evt_status:38s}  {logical_id:40s}  {rtype}"
            print(f"{color}{line}{RESET}")
            if reason and ("FAILED" in evt_status or "ROLLBACK" in evt_status):
                print(f"{RED}    ↳ {reason}{RESET}")

        # Check terminal
        if stack_status in TERMINAL_STATES:
            log(f"\n{'='*80}", BOLD)
            color = GREEN if stack_status in SUCCESS_STATES else RED
            log(f"  FINAL STATUS: {stack_status}", color)

            if stack_status in SUCCESS_STATES and "DELETE" not in stack_status:
                # Print outputs
                outputs = resp["Stacks"][0].get("Outputs", [])
                if outputs:
                    log(f"{'─'*80}", DIM)
                    log("  STACK OUTPUTS:", BOLD)
                    for o in outputs:
                        log(f"    {o['OutputKey']:40s}  {o['OutputValue']}", GREEN)

            elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
            log(f"  Duration: {int(elapsed//60)}m {int(elapsed%60)}s", DIM)
            log(f"{'='*80}\n", BOLD)
            return


# ─── Status / Events commands ─────────────────────────────────
def show_status(session, cfg):
    cf = session.client("cloudformation")
    stack_name = cfg["stack_name"]
    exists, status = stack_exists(cf, stack_name)
    if not exists:
        log(f"Stack '{stack_name}' does not exist.", YELLOW)
        return
    color = STATUS_COLORS.get(status, RESET)
    log(f"Stack: {stack_name}  Status: {status}", color)

    resp = cf.describe_stacks(StackName=stack_name)
    outputs = resp["Stacks"][0].get("Outputs", [])
    if outputs:
        log("Outputs:", BOLD)
        for o in outputs:
            log(f"  {o['OutputKey']:40s}  {o['OutputValue']}", GREEN)


def show_events(session, cfg, count=20):
    cf = session.client("cloudformation")
    stack_name = cfg["stack_name"]
    try:
        resp = cf.describe_stack_events(StackName=stack_name)
    except ClientError as e:
        if "does not exist" in str(e):
            log(f"Stack '{stack_name}' does not exist.", YELLOW)
            return
        raise

    events = resp["StackEvents"][:count]
    log(f"Last {len(events)} events for '{stack_name}':", BOLD)
    for event in events:
        evt_status = event.get("ResourceStatus", "")
        logical_id = event.get("LogicalResourceId", "")
        reason = event.get("ResourceStatusReason", "")
        color = STATUS_COLORS.get(evt_status, RESET)
        ts = event["Timestamp"].strftime("%H:%M:%S")
        line = f"  {ts}  {evt_status:38s}  {logical_id}"
        print(f"{color}{line}{RESET}")
        if reason:
            print(f"{DIM}    ↳ {reason}{RESET}")


# ─── CLI ───────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="AWS 3-Tier CloudFormation Deployer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --config deploy-config.dev.yaml                  # Deploy (create or update)
  %(prog)s --config deploy-config.dev.yaml --dry-run        # Preview changes only
  %(prog)s --config deploy-config.dev.yaml --delete          # Delete the stack
  %(prog)s --config deploy-config.dev.yaml --status          # Check current status
  %(prog)s --config deploy-config.dev.yaml --events 30       # Show last 30 events
  %(prog)s --config deploy-config.dev.yaml --no-sync         # Deploy without S3 sync
        """,
    )
    parser.add_argument("--config", "-c", required=True, help="Path to deployment config YAML")
    parser.add_argument("--dry-run", action="store_true", help="Create change set only (no deploy)")
    parser.add_argument("--delete", action="store_true", help="Delete the stack")
    parser.add_argument("--status", action="store_true", help="Show stack status and outputs")
    parser.add_argument("--events", type=int, metavar="N", help="Show last N stack events")
    parser.add_argument("--no-sync", action="store_true", help="Skip S3 template sync")
    parser.add_argument("--no-validate", action="store_true", help="Skip template validation")

    args = parser.parse_args()
    cfg = load_config(args.config)
    session = get_session(cfg)

    # Print banner
    print(f"\n{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN}  AWS 3-Tier CloudFormation Deployer{RESET}")
    print(f"{CYAN}{'='*60}{RESET}")
    print(f"  Stack:   {BOLD}{cfg['stack_name']}{RESET}")
    print(f"  Region:  {cfg['region']}")
    print(f"  Env:     {cfg['parameters'].get('EnvironmentName', 'N/A')}")
    if cfg.get("profile"):
        print(f"  Profile: {cfg['profile']}")
    print(f"{CYAN}{'='*60}{RESET}\n")

    # Verify credentials
    try:
        sts = session.client("sts")
        identity = sts.get_caller_identity()
        log(f"Authenticated as: {identity['Arn']}", GREEN)
    except Exception as e:
        log(f"Authentication failed: {e}", RED)
        log("Run: aws configure  (or: aws sso login --profile <profile>)", YELLOW)
        sys.exit(1)

    # Route to subcommand
    if args.status:
        show_status(session, cfg)
        return

    if args.events:
        show_events(session, cfg, args.events)
        return

    if args.delete:
        delete_stack(session, cfg)
        return

    # Deploy flow: sync → validate → create/update
    if cfg.get("sync_templates", False) and not args.no_sync:
        sync_templates(cfg)

    if not args.no_validate:
        validate_template(session, cfg)

    create_or_update_stack(session, cfg, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
