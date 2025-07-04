#!/bin/bash

# PostgreSQL Authentication Fix Script for MoonYetis Backend
# Run this script on VPS 168.231.124.18 as root or with sudo

set -e

echo "=== MoonYetis PostgreSQL Authentication Fix ==="
echo "Starting PostgreSQL configuration..."

# 1. Check PostgreSQL status
echo "1. Checking PostgreSQL status..."
systemctl status postgresql --no-pager || true

# 2. Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    echo "Starting PostgreSQL service..."
    systemctl start postgresql
fi

# 3. Switch to postgres user and check existing users
echo "2. Checking existing database users..."
sudo -u postgres psql -c "\du"

# 4. Check if database exists
echo "3. Checking if moonyetis_slots database exists..."
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w moonyetis_slots | wc -l)

if [ $DB_EXISTS -eq 0 ]; then
    echo "Creating moonyetis_slots database..."
    sudo -u postgres createdb moonyetis_slots
else
    echo "Database moonyetis_slots already exists"
fi

# 5. Check if user exists, create if not
echo "4. Setting up moonyetis_user..."
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='moonyetis_user'")

if [ "$USER_EXISTS" != "1" ]; then
    echo "Creating user moonyetis_user..."
    sudo -u postgres psql -c "CREATE USER moonyetis_user WITH PASSWORD 'MoonYetis2024!';"
else
    echo "User moonyetis_user exists, updating password..."
    sudo -u postgres psql -c "ALTER USER moonyetis_user WITH PASSWORD 'MoonYetis2024!';"
fi

# 6. Grant permissions
echo "5. Granting permissions to moonyetis_user..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE moonyetis_slots TO moonyetis_user;"
sudo -u postgres psql -d moonyetis_slots -c "GRANT ALL ON SCHEMA public TO moonyetis_user;"
sudo -u postgres psql -d moonyetis_slots -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO moonyetis_user;"
sudo -u postgres psql -d moonyetis_slots -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO moonyetis_user;"
sudo -u postgres psql -d moonyetis_slots -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO moonyetis_user;"
sudo -u postgres psql -d moonyetis_slots -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO moonyetis_user;"

# 7. Configure pg_hba.conf
echo "6. Configuring pg_hba.conf..."
PG_VERSION=$(sudo -u postgres psql -c "SHOW server_version;" | grep -oP '\d+\.\d+' | head -1)
PG_HBA_CONF="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

# Backup original pg_hba.conf
cp $PG_HBA_CONF $PG_HBA_CONF.backup.$(date +%Y%m%d_%H%M%S)

# Check if our configuration already exists
if ! grep -q "moonyetis_user" $PG_HBA_CONF; then
    echo "Adding authentication rules for moonyetis_user..."
    
    # Add local connection for moonyetis_user
    sed -i '/^# Database administrative login by Unix domain socket/i # MoonYetis application connections' $PG_HBA_CONF
    sed -i '/^# MoonYetis application connections/a local   moonyetis_slots    moonyetis_user                     md5' $PG_HBA_CONF
    sed -i '/^local   moonyetis_slots    moonyetis_user                     md5/a host    moonyetis_slots    moonyetis_user    127.0.0.1/32     md5' $PG_HBA_CONF
    sed -i '/^host    moonyetis_slots    moonyetis_user    127.0.0.1\/32     md5/a host    moonyetis_slots    moonyetis_user    ::1/128          md5' $PG_HBA_CONF
else
    echo "Authentication rules for moonyetis_user already exist"
fi

echo "7. Current pg_hba.conf relevant entries:"
grep -E "(moonyetis|local.*all.*all|host.*all.*all)" $PG_HBA_CONF

# 8. Configure postgresql.conf for connections
echo "8. Configuring PostgreSQL for connections..."
PG_CONF="/etc/postgresql/$PG_VERSION/main/postgresql.conf"

# Ensure PostgreSQL listens on localhost
if ! grep -q "^listen_addresses = 'localhost'" $PG_CONF; then
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" $PG_CONF
    echo "Configured listen_addresses = 'localhost'"
fi

# 9. Restart PostgreSQL
echo "9. Restarting PostgreSQL service..."
systemctl restart postgresql

# Wait for PostgreSQL to start
sleep 3

# 10. Test connection
echo "10. Testing database connection..."
export PGPASSWORD='MoonYetis2024!'
psql -h localhost -U moonyetis_user -d moonyetis_slots -c "SELECT current_database(), current_user, version();" || {
    echo "ERROR: Connection test failed!"
    echo "Checking PostgreSQL logs..."
    tail -20 /var/log/postgresql/postgresql-$PG_VERSION-main.log
    exit 1
}

echo "✅ PostgreSQL authentication configured successfully!"
echo "Connection details:"
echo "  Host: localhost"
echo "  Database: moonyetis_slots"
echo "  User: moonyetis_user"
echo "  Password: MoonYetis2024!"

# 11. Test from application directory
echo "11. Testing from application directory..."
cd /var/www/html/moonyetis-backend/ || {
    echo "Backend directory not found at /var/www/html/moonyetis-backend/"
    echo "Please check the correct path"
    exit 1
}

if [ -f "package.json" ]; then
    echo "Found Node.js application"
    
    # Check if database configuration exists
    if [ -f "config/database.js" ] || [ -f "config/database.json" ] || [ -f ".env" ]; then
        echo "Database configuration files found"
        ls -la config/ .env 2>/dev/null || true
    else
        echo "No database configuration found - you may need to create one"
    fi
fi

echo "=== Setup Complete ==="
echo "You can now connect to PostgreSQL using:"
echo "psql -h localhost -U moonyetis_user -d moonyetis_slots"