-- Auth tokens table for email verification and password reset
CREATE TABLE auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_type ON auth_tokens(type);
