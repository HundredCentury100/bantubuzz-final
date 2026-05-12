-- Migration: Create request_logs table for comprehensive logging
-- Date: 2026-04-15
-- Description: Stores all API requests, responses, errors, and system events

CREATE TABLE IF NOT EXISTS request_logs (
    id SERIAL PRIMARY KEY,

    -- Request Information
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    method VARCHAR(10),
    endpoint VARCHAR(500),
    full_url TEXT,

    -- Client Information
    ip_address VARCHAR(50),
    user_agent TEXT,
    referrer TEXT,

    -- User Information
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_type VARCHAR(20),

    -- Request/Response Details
    request_body TEXT,
    request_headers TEXT,
    response_status INTEGER,
    response_time_ms INTEGER,

    -- Error Information
    is_error BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(100),
    error_message TEXT,
    error_traceback TEXT,

    -- Service Information
    service_name VARCHAR(50) DEFAULT 'backend',
    worker_pid INTEGER,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast querying
CREATE INDEX idx_request_logs_timestamp ON request_logs(timestamp DESC);
CREATE INDEX idx_request_logs_endpoint ON request_logs(endpoint);
CREATE INDEX idx_request_logs_user_id ON request_logs(user_id);
CREATE INDEX idx_request_logs_ip_address ON request_logs(ip_address);
CREATE INDEX idx_request_logs_is_error ON request_logs(is_error);
CREATE INDEX idx_request_logs_response_status ON request_logs(response_status);
CREATE INDEX idx_request_logs_service_name ON request_logs(service_name);

-- Create index for searching
CREATE INDEX idx_request_logs_error_message ON request_logs USING gin(to_tsvector('english', error_message)) WHERE error_message IS NOT NULL;

COMMENT ON TABLE request_logs IS 'Comprehensive logging of all API requests, responses, and errors';
