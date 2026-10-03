#!/usr/bin/env python3
"""
FormFlow SSM Environment Injection Utility
Retrieves runtime configuration and secrets from AWS Systems Manager Parameter Store
and generates a secure production .env file with chmod 600.
"""

import argparse
import json
import os
import stat
import subprocess
import sys

REQUIRED_KEYS = [
    "NODE_ENV",
    "PORT",
    "HOSTNAME",
    "DATABASE_URL",
    "APP_DATABASE_URL",
    "SERVICE_DATABASE_URL",
    "STORAGE_DRIVER",
    "SUBMISSIONS_BUCKET_NAME",
    "AWS_REGION",
    "SUBMISSIONS_QUEUE_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
]

def fetch_parameters_for_path(path: str, region: str) -> dict:
    params = {}
    next_token = None
    while True:
        cmd = [
            "aws", "ssm", "get-parameters-by-path",
            "--path", path,
            "--with-decryption",
            "--recursive",
            "--region", region,
            "--output", "json"
        ]
        if next_token:
            cmd.extend(["--next-token", next_token])
        
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"Error fetching parameters from path '{path}': {res.stderr.strip()}", file=sys.stderr)
            break
        
        data = json.loads(res.stdout)
        for item in data.get("Parameters", []):
            name = item.get("Name", "")
            key = name.rstrip("/").split("/")[-1]
            val = item.get("Value", "")
            param_type = item.get("Type", "String")
            params[key] = (val, param_type, name)
            
        next_token = data.get("NextToken")
        if not next_token:
            break
            
    return params

def main():
    parser = argparse.ArgumentParser(description="Inject SSM Parameter Store configuration into .env file")
    parser.add_argument("--output", "-o", default="/opt/formflow/.env", help="Path to write the target .env file")
    parser.add_argument("--region", "-r", default="ap-south-1", help="AWS Region (default: ap-south-1)")
    parser.add_argument("--primary-path", default="/formflow/production/", help="Primary SSM parameter path")
    parser.add_argument("--fallback-path", default="/formflow/", help="Fallback SSM parameter path")
    args = parser.parse_args()

    print(f"Retrieving parameters from SSM Parameter Store (Region: {args.region})...")
    
    # Fetch parameters from primary path (/formflow/production/)
    all_params = fetch_parameters_for_path(args.primary_path, args.region)
    
    # If any keys are missing, also fetch from fallback path (/formflow/)
    missing = [k for k in REQUIRED_KEYS if k not in all_params]
    if missing:
        fallback_params = fetch_parameters_for_path(args.fallback_path, args.region)
        for k, v in fallback_params.items():
            if k not in all_params:
                all_params[k] = v

    if not all_params:
        print("ERROR: No parameters retrieved from SSM Parameter Store!", file=sys.stderr)
        sys.exit(1)

    print(f"Successfully retrieved {len(all_params)} parameters.")
    print("Parameters injected (names only, values redacted):")
    for key in sorted(all_params.keys()):
        val, ptype, original_path = all_params[key]
        print(f"  - {key} ({ptype}) from {original_path}")

    # Check required keys
    still_missing = [k for k in REQUIRED_KEYS if k not in all_params]
    if still_missing:
        print(f"WARNING: The following required keys were not found in SSM: {', '.join(still_missing)}", file=sys.stderr)

    # Format .env lines (sorting alphabetically for consistency)
    lines = [f"{k}={all_params[k][0]}" for k in sorted(all_params.keys())]
    content = "\n".join(lines) + "\n"

    # Write to target file with secure permissions
    out_dir = os.path.dirname(args.output)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    with open(args.output, "w", encoding="utf-8") as f:
        f.write(content)

    # Enforce chmod 600 (owner read/write only)
    os.chmod(args.output, stat.S_IRUSR | stat.S_IWUSR)
    print(f"Wrote configuration to {args.output} with mode 0600 (rw-------).")

if __name__ == "__main__":
    main()
