#!/bin/bash
# Script to reset PostgreSQL postgres user password

echo "=========================================="
echo "  PostgreSQL Password Reset Script"
echo "=========================================="
echo ""

# Find pg_hba.conf location
PG_HBA=$(find /etc/postgresql -name "pg_hba.conf" 2>/dev/null | head -1)

if [ -z "$PG_HBA" ]; then
    echo "ERROR: Could not find pg_hba.conf"
    exit 1
fi

echo "Found pg_hba.conf at: $PG_HBA"
echo ""

# Backup the original file
echo "Creating backup..."
cp $PG_HBA ${PG_HBA}.backup

# Temporarily set trust authentication for postgres user
echo "Setting temporary trust authentication..."
sed -i 's/local\s*all\s*postgres\s*peer/local   all             postgres                                trust/' $PG_HBA
sed -i 's/local\s*all\s*postgres\s*md5/local   all             postgres                                trust/' $PG_HBA
sed -i 's/local\s*all\s*postgres\s*scram-sha-256/local   all             postgres                                trust/' $PG_HBA

# Restart PostgreSQL
echo "Restarting PostgreSQL..."
systemctl restart postgresql

# Reset the password
echo "Resetting postgres password..."
cd /tmp
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Restore md5 authentication
echo "Restoring secure authentication..."
sed -i 's/local\s*all\s*postgres\s*trust/local   all             postgres                                md5/' $PG_HBA

# Restart PostgreSQL again
echo "Restarting PostgreSQL..."
systemctl restart postgresql

echo ""
echo "=========================================="
echo "  Password Reset Complete!"
echo "=========================================="
echo ""
echo "PostgreSQL postgres user password is now: postgres"
echo ""
echo "You can now run the deployment script again."
echo ""
