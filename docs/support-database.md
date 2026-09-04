# Support Database Schema & Entity Relationships

## Entity Relational Structure
```sql
-- Core Support Tickets
CREATE TABLE support_tickets (
    id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(32) UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    category VARCHAR(64) NOT NULL,
    priority VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL,
    customer_type VARCHAR(32) NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    customer_name VARCHAR(128) NOT NULL,
    jurisdiction VARCHAR(8) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    language VARCHAR(8) NOT NULL,
    assigned_officer_id VARCHAR(64),
    tier_assigned VARCHAR(32) NOT NULL,
    related_transaction_id VARCHAR(64),
    incident_id VARCHAR(64),
    first_response_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolution_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    first_responded_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket Messages & Internal Notes
CREATE TABLE support_messages (
    id VARCHAR(64) PRIMARY KEY,
    ticket_id VARCHAR(64) REFERENCES support_tickets(id),
    sender_type VARCHAR(16) NOT NULL,
    sender_id VARCHAR(64) NOT NULL,
    sender_name VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,
    macro_used VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
