# OneKeel Swarm 🤖

> Multi-agent AI system for intelligent customer engagement and lead management

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

## 🚀 Quick Start

Get your AI agent system running in 5 minutes:

```bash
# 1. Install dependencies
npm run install:all

# 2. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 3. Start development servers
npm run dev:full
```

Open [http://localhost:5173](http://localhost:5173) to view the dashboard.

## 📋 What's Included

- ✅ **Multi-Agent System**: Chat, Email, SMS, and Overlord agents
- ✅ **Real-time Dashboard**: Live metrics and monitoring
- ✅ **Lead Management**: Import, track, and qualify leads
- ✅ **Campaign Management**: Automated workflows and scheduling
- ✅ **Chat Widget**: Embeddable customer interface
- ✅ **Email Templates**: Rich template editor and automation
- ✅ **Security Hardening**: Authentication, rate limiting, input validation

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express Server │    │   PostgreSQL    │
│   (Port 5173)   │◄──►│   (Port 5001)   │◄──►│    Database     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│     Redis       │◄─────────────┘
                        │   (Caching)     │
                        └─────────────────┘
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)

### Available Scripts

```bash
# Development
npm run dev:full          # Start both client and server
npm run dev:server        # Start server only
npm run dev:client        # Start client only

# Building
npm run build             # Build for production
npm run build:client      # Build client only
npm run build:server      # Build server only

# Testing
npm run test              # Run unit tests
npm run test:e2e          # Run end-to-end tests
npm run test:with-db      # Run tests with database

# Code Quality
npm run lint              # Check code style
npm run lint:fix          # Fix code style issues
npm run format            # Format code with Prettier
npm run type-check        # Check TypeScript types

# Database
npm run db:migrate        # Run database migrations
npm run db:push           # Push schema changes
npm run db:generate       # Generate migrations

# Utilities
npm run health-check      # Check system health
npm run verify-security   # Run security audit
npm run create-admin      # Create admin user
```

## 📖 Documentation

- [📚 Quick Start Guide](./docs/QUICK_START.md)
- [🏗️ Technical Architecture](./docs/TECHNICAL_ARCHITECTURE.md)
- [🚀 Deployment Guide](./docs/DEPLOYMENT.md)
- [📧 Email Setup](./docs/EMAIL_SETUP.md)
- [🔒 Security Guide](./docs/security/)

## 🔧 Configuration

Key environment variables:

```env
# Core
NODE_ENV=development
PORT=5001
DATABASE_URL=postgresql://user:pass@localhost:5432/swarm_db

# AI Services
OPENAI_API_KEY=sk-your-key
OPENROUTER_API_KEY=sk-or-your-key

# Communication
MAILGUN_API_KEY=key-your-mailgun-key
MAILGUN_DOMAIN=your-domain.com
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token

# Security
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `npm run validate`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/your-repo/onekeel-swarm/issues)
- 💬 [Discussions](https://github.com/your-repo/onekeel-swarm/discussions)

---

Built with ❤️ by the OneKeel team
