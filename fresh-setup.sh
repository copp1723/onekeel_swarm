#!/bin/bash
# Fresh setup script for OneKeel Swarm

echo "🧹 Cleaning up old dependencies..."
rm -f package-lock.json yarn.lock
rm -f client/package-lock.json client/yarn.lock

echo "📦 Installing server dependencies..."
npm install --force

echo "📦 Installing client dependencies..."
cd client
npm install --force
cd ..

echo "🔧 Setting up environment..."
if [ ! -f .env ]; then
  echo "Creating .env file..."
  cat > .env << EOF
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/onekeel_swarm

# Session & Security
SESSION_SECRET=your-session-secret-here
JWT_SECRET=your-jwt-secret-here

# Email Service (Mailgun)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
MAILGUN_FROM_EMAIL=noreply@yourdomain.com

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# AI Model
OPENROUTER_API_KEY=your-openrouter-api-key
EOF
  echo "⚠️  Please update .env with your actual credentials"
fi

echo "✅ Setup complete! Next steps:"
echo "1. Update .env with your actual credentials"
echo "2. Set up your PostgreSQL database"
echo "3. Run: npm run db:migrate"
echo "4. Run: npm run dev"