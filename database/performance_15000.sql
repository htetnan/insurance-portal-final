-- Performance indexes for larger (15,000+ row) datasets.
-- Run once in phpMyAdmin after importing local_mysql.sql.
USE insurance_portal;

CREATE INDEX idx_users_role_created ON users(role, created_at);
CREATE INDEX idx_app_status_created ON policy_applications(status, created_at);
CREATE INDEX idx_claim_status_created ON claims(status, created_at);
CREATE INDEX idx_payment_status_created ON payments(status, created_at);
CREATE INDEX idx_app_customer_created ON policy_applications(customer_id, created_at);
CREATE INDEX idx_claim_customer_created ON claims(customer_id, created_at);
CREATE INDEX idx_payment_customer_created ON payments(customer_id, created_at);

-- Report aggregation indexes
CREATE INDEX idx_app_created_package_status ON policy_applications(created_at, package_id, status);
CREATE INDEX idx_app_agent_status_created ON policy_applications(agent_id, status, created_at);
CREATE INDEX idx_claim_created_application_status ON claims(created_at, application_id, status);
CREATE INDEX idx_claim_agent_status_created ON claims(agent_id, status, created_at);
CREATE INDEX idx_payment_created_type_status ON payments(created_at, payment_type, status);
CREATE INDEX idx_payment_application_status_created ON payments(application_id, status, created_at);

-- Feedback page indexes (server-side pagination/filtering)
CREATE INDEX idx_feedback_created ON feedbacks(created_at);
CREATE INDEX idx_feedback_read_created ON feedbacks(is_read, created_at);
CREATE INDEX idx_feedback_customer_created ON feedbacks(customer_id, created_at);
