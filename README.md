# OneKeel Swarm

AI-powered multi-agent system for intelligent automation and orchestration.

## Overview

OneKeel Swarm is a scalable multi-agent AI platform designed for complex task automation, featuring specialized agents that work together to handle various business processes including lead management, communication, and data processing.

## Features

- **Multi-Agent Architecture**: Specialized AI agents for different tasks
- **Real-time Communication**: WebSocket-based live updates and monitoring
- **Lead Management**: Comprehensive lead tracking and qualification
- **Multi-Channel Support**: Email and SMS campaign capabilities
- **Modern Tech Stack**: Built with React, TypeScript, Node.js, and PostgreSQL

## Quick Start

1. **Clone and Install**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Development**:
   ```bash
   # Terminal 1 - Backend
   npm run dev:server
   
   # Terminal 2 - Frontend
   npm run dev:client
   ```

4. **Access Application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## Project Structure

```
├── client/          # React frontend application
├── server/          # Node.js backend with AI agents
├── shared/          # Shared types and utilities
├── scripts/         # Utility and setup scripts
└── docs/            # Documentation
```

## Development

- Run tests: `npm test`
- Type checking: `npm run check`
- Linting: `npm run lint`
- Full validation: `npm run validate`

## License

MIT