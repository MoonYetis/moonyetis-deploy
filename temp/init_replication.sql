-- Initialize replication user and configuration

-- Create replication user if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
        CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replication_password_here';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE moonyetis_slots TO replicator;

-- Create replication slot
SELECT pg_create_physical_replication_slot('replica_slot');

-- Log replication initialization
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0) ON CONFLICT DO NOTHING;