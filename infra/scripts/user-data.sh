#!/bin/bash
set -e

# Update and install dependencies
dnf update -y
dnf install -y docker

# Enable and start Docker
systemctl enable docker
systemctl start docker

# Add ec2-user to docker group
usermod -aG docker ec2-user

# Ensure amazon-ssm-agent is enabled and active
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Log verification status
echo "=== Bootstrap Verification ===" > /var/log/formflow-bootstrap.log
date >> /var/log/formflow-bootstrap.log
docker --version >> /var/log/formflow-bootstrap.log
echo "Docker status: $(systemctl is-active docker)" >> /var/log/formflow-bootstrap.log
echo "SSM Agent status: $(systemctl is-active amazon-ssm-agent)" >> /var/log/formflow-bootstrap.log
echo "=== Bootstrap Complete ===" >> /var/log/formflow-bootstrap.log
