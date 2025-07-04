#!/bin/bash

set -e

BACKUP_DIR="/var/www/moonyetis-backup-$(date +%Y%m%d-%H%M%S)"
APP_DIR="/var/www/moonyetis"
TEMP_DIR="/tmp"
ARCHIVE_FILE="moonyetis-update.tar.gz"

echo "Starting MoonYetis deployment..."

if [ ! -f "$TEMP_DIR/$ARCHIVE_FILE" ]; then
    echo "Error: $ARCHIVE_FILE not found in $TEMP_DIR"
    exit 1
fi

echo "Extracting update archive..."
cd "$TEMP_DIR" && tar -xzf "$ARCHIVE_FILE"

echo "Creating backup..."
sudo cp -r "$APP_DIR" "$BACKUP_DIR"

echo "Stopping application..."
if ! pm2 stop moonyetis-production; then
    echo "Warning: Failed to stop moonyetis-production"
fi

echo "Deploying new version..."
if [ ! -d "$TEMP_DIR/moonyetis-backend" ]; then
    echo "Error: moonyetis-backend directory not found in extracted archive"
    echo "Restoring from backup..."
    sudo rm -rf "$APP_DIR"
    sudo mv "$BACKUP_DIR" "$APP_DIR"
    pm2 start moonyetis-production
    exit 1
fi

sudo cp -r "$TEMP_DIR/moonyetis-backend/"* "$APP_DIR/"

echo "Setting permissions..."
sudo chown -R www-data:www-data "$APP_DIR"
sudo chmod -R 755 "$APP_DIR"

echo "Starting application..."
if ! pm2 start moonyetis-production; then
    echo "Error: Failed to start moonyetis-production"
    echo "Restoring from backup..."
    sudo rm -rf "$APP_DIR"
    sudo mv "$BACKUP_DIR" "$APP_DIR"
    pm2 start moonyetis-production
    exit 1
fi

echo "Checking status..."
pm2 status

echo "Cleaning up temporary files..."
rm -rf "$TEMP_DIR/moonyetis-backend"

echo "Deployment completed successfully!"
echo "Backup created at: $BACKUP_DIR"