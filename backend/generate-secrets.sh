#!/bin/bash

echo "🔐 Generating secure secrets for MoonYetis Store"
echo "==============================================="
echo ""

# Generate webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "WEBHOOK_SECRET=$WEBHOOK_SECRET"
echo ""

# Generate admin key
ADMIN_KEY=$(openssl rand -hex 32)
echo "ADMIN_KEY=$ADMIN_KEY"
echo ""

echo "📋 Instructions:"
echo "1. Copy these values to your .env file"
echo "2. Keep them secure and never commit them to git"
echo "3. Store a backup in a password manager"
echo ""

# Optionally create a secure .env file
read -p "Do you want to update .env file automatically? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    # Backup existing .env
    if [ -f .env ]; then
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        echo "✅ Backed up existing .env file"
    fi
    
    # Update secrets in .env
    if [ -f .env ]; then
        # Update WEBHOOK_SECRET
        sed -i.tmp "s/^WEBHOOK_SECRET=.*/WEBHOOK_SECRET=$WEBHOOK_SECRET/" .env
        # Update ADMIN_KEY
        sed -i.tmp "s/^ADMIN_KEY=.*/ADMIN_KEY=$ADMIN_KEY/" .env
        rm -f .env.tmp
        echo "✅ Updated .env file with new secrets"
    else
        echo "❌ .env file not found. Please create it from .env.example first"
    fi
fi

echo ""
echo "🔒 Security reminder:"
echo "- Never share these secrets"
echo "- Use different secrets for each environment"
echo "- Rotate secrets periodically"