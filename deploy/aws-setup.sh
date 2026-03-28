#!/bin/bash
# ============================================================
# AWS EC2 Setup Script for WhatsApp CRM (Testing Environment)
#
# Prerequisites:
#   - AWS CLI installed and configured (aws configure --profile whatsappcrm)
#   - An SSH key pair created in your target region
#
# This script:
#   1. Creates a Security Group (ports 22, 80, 443, 8080)
#   2. Launches a t3.small EC2 instance with Amazon Linux 2023
#   3. Installs Docker + Docker Compose via user-data
#   4. Outputs SSH command and public IP
#
# Usage:
#   chmod +x deploy/aws-setup.sh
#   ./deploy/aws-setup.sh <key-pair-name> [region] [aws-profile]
# ============================================================

set -e

KEY_NAME="${1:?Usage: $0 <key-pair-name> [region] [aws-profile]}"
REGION="${2:-ap-south-1}"  # Default: Mumbai (cheapest for India)
AWS_PROFILE="${3:-whatsappcrm}"  # Default: whatsappcrm profile
INSTANCE_TYPE="t3.small"   # 2 vCPU, 2GB RAM — $15/mo
AMI_PARAM="/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"

export AWS_PROFILE
echo "=== WhatsApp CRM - AWS Testing Deployment ==="
echo "Region: $REGION"
echo "Instance: $INSTANCE_TYPE"
echo "Key: $KEY_NAME"
echo "Profile: $AWS_PROFILE"
echo ""

# Get latest Amazon Linux 2023 AMI
echo "Looking up latest Amazon Linux 2023 AMI..."
AMI_ID=$(aws ssm get-parameters \
    --names "$AMI_PARAM" \
    --region "$REGION" \
    --query 'Parameters[0].Value' \
    --output text)
echo "AMI: $AMI_ID"

# Create Security Group
echo "Creating security group..."
SG_ID=$(aws ec2 create-security-group \
    --group-name whatsappcrm-test-sg \
    --description "WhatsApp CRM testing environment" \
    --region "$REGION" \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
    --group-names whatsappcrm-test-sg \
    --region "$REGION" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# Add inbound rules (idempotent — ignores if already exists)
for PORT in 22 80 443 8080; do
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port "$PORT" \
        --cidr 0.0.0.0/0 \
        --region "$REGION" 2>/dev/null || true
done
echo "Security Group: $SG_ID"

# User data script — runs on first boot
USER_DATA=$(cat <<'USERDATA'
#!/bin/bash
yum update -y
yum install -y docker git
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# Install Docker Compose
COMPOSE_VERSION="v2.27.0"
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose

# Create app directory
mkdir -p /home/ec2-user/whatsappcrm
chown ec2-user:ec2-user /home/ec2-user/whatsappcrm

echo "Setup complete! Clone your repo and run docker compose up -d"
USERDATA
)

# Launch EC2 instance
echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]' \
    --user-data "$USER_DATA" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=whatsappcrm-test}]" \
    --region "$REGION" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Instance: $INSTANCE_ID"
echo "Waiting for instance to start..."

aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo ""
echo "============================================"
echo "  EC2 Instance Ready!"
echo "============================================"
echo "  Instance ID:  $INSTANCE_ID"
echo "  Public IP:    $PUBLIC_IP"
echo "  Instance:     $INSTANCE_TYPE (~\$15/mo)"
echo ""
echo "  SSH:  ssh -i ~/.ssh/${KEY_NAME}.pem ec2-user@${PUBLIC_IP}"
echo ""
echo "  Next steps (after SSH):"
echo "    1. Wait ~2 min for user-data to finish installing Docker"
echo "    2. git clone <your-repo-url> whatsappcrm"
echo "    3. cd whatsappcrm"
echo "    4. cp .env.example .env && nano .env"
echo "    5. docker compose up -d --build"
echo "    6. Open http://${PUBLIC_IP} in browser"
echo "============================================"
