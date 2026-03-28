#!/bin/bash
# ============================================================
# SSL Certificate Setup Script for WhatsApp CRM
#
# Prerequisites:
#   - Domain (crm.techtricky.com) pointing to this server's IP
#   - Docker and Docker Compose installed
#   - Port 80 and 443 open in Security Group
#
# Usage:
#   chmod +x deploy/init-ssl.sh
#   ./deploy/init-ssl.sh [email]
# ============================================================

set -e

DOMAIN="crm.techtricky.com"
EMAIL="${1:?Usage: $0 <your-email-for-letsencrypt>}"

echo "=== SSL Setup for $DOMAIN ==="

# Step 1: Create a temporary nginx config (HTTP only) for certificate generation
echo "Creating temporary HTTP-only nginx config..."
cat > /tmp/nginx-temp.conf <<'EOF'
server {
    listen 80;
    server_name crm.techtricky.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'SSL setup in progress...';
        add_header Content-Type text/plain;
    }
}
EOF

# Step 2: Stop frontend if running, start with temp config
echo "Starting Nginx with temporary config for certificate generation..."
docker compose stop frontend 2>/dev/null || true

docker run -d --name nginx-temp \
    -p 80:80 \
    -v certbot-www:/var/www/certbot \
    -v /tmp/nginx-temp.conf:/etc/nginx/conf.d/default.conf:ro \
    nginx:alpine

# Step 3: Request certificate from Let's Encrypt
echo "Requesting SSL certificate from Let's Encrypt..."
docker run --rm \
    -v certbot-conf:/etc/letsencrypt \
    -v certbot-www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# Step 4: Clean up temporary nginx
echo "Cleaning up temporary nginx..."
docker stop nginx-temp && docker rm nginx-temp

# Step 5: Start the full stack with SSL
echo "Starting full stack with SSL..."
docker compose up -d --build

echo ""
echo "============================================"
echo "  SSL Setup Complete!"
echo "============================================"
echo "  Domain:  https://$DOMAIN"
echo "  Cert:    Auto-renews via certbot container"
echo ""
echo "  Test: curl -I https://$DOMAIN"
echo "============================================"
