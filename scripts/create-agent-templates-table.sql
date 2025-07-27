-- Create agent_templates table
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'chat', 'voice')),
  category VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  
  -- Core Configuration
  system_prompt TEXT NOT NULL,
  context_note TEXT,
  temperature INTEGER DEFAULT 7,
  max_tokens INTEGER DEFAULT 500,
  
  -- Template-specific settings
  configurable_params JSONB DEFAULT '[]',
  default_params JSONB DEFAULT '{}',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS agent_templates_name_idx ON agent_templates(name);
CREATE INDEX IF NOT EXISTS agent_templates_type_idx ON agent_templates(type);
CREATE INDEX IF NOT EXISTS agent_templates_category_idx ON agent_templates(category);
CREATE INDEX IF NOT EXISTS agent_templates_is_default_idx ON agent_templates(is_default);

-- Insert default templates
INSERT INTO agent_templates (name, description, type, category, is_default, system_prompt) VALUES
('Email Sales Agent', 'Professional email agent for sales inquiries', 'email', 'sales', true, 'You are a professional sales agent handling email inquiries. Be helpful, informative, and focused on understanding customer needs.'),
('SMS Support Agent', 'Concise SMS agent for customer support', 'sms', 'support', true, 'You are a helpful SMS support agent. Keep responses brief and to the point while being friendly and helpful.'),
('Chat Assistant', 'Interactive chat agent for general inquiries', 'chat', 'general', true, 'You are a friendly chat assistant. Engage naturally with customers and help them find the information they need.'),
('Voice Representative', 'Professional voice agent for phone calls', 'voice', 'general', true, 'You are a professional voice representative. Speak clearly and naturally, and maintain a helpful tone throughout the conversation.')
ON CONFLICT DO NOTHING;

SELECT COUNT(*) as template_count FROM agent_templates;