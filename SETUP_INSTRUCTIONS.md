# OneKeel Swarm - Setup Instructions

## Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your database and service credentials
```

### 3. Database Setup
```bash
# Create database
createdb onekeel_swarm

# Run migrations
npm run db:migrate

# Create admin user
npm run create-admin
```

### 4. Start Development
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend  
npm run dev:client
```

## System Health Check
```bash
npm run health-check
```

## Seed Test Data
```bash
npm run seed-data
```

## Production Deployment
```bash
npm run build
npm start
```

Visit `http://localhost:5173` for the dashboard!

## Key Features Consolidated

- **Email System**: Unified Mailgun service with templates and scheduling
- **Multi-Agent Architecture**: Email, SMS, Chat, and Overlord agents
- **Campaign Management**: Automated multi-channel campaigns
- **Lead Processing**: Intelligent lead routing and qualification
- **Real-time Chat**: WebSocket-powered chat widget
- **Monitoring**: Health checks and system metrics

## Architecture Simplified

- **Server**: Express.js with TypeScript, WebSockets, PostgreSQL
- **Client**: React with Vite, Tailwind CSS, Radix UI
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenRouter integration for multi-model support
- **Email**: Mailgun for transactional and campaign emails
- **SMS**: Twilio for SMS communications

This is a lean, production-ready implementation focusing on core functionality.