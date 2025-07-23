# Deployment Guide

## Overview

This guide covers deploying the OneKeel Swarm multi-agent system to production environments.

## Environment Configuration

### Required Environment Variables

```bash
# Core Application
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/swarm_db

# Authentication & Security
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret
SESSION_SECRET=your-session-secret-here

# AI Services
OPENAI_API_KEY=sk-your-openai-key

# Email Service (Mailgun)
MAILGUN_API_KEY=key-your-mailgun-key
MAILGUN_DOMAIN=your-domain.com
MAILGUN_FROM_EMAIL=noreply@your-domain.com

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Redis (Optional - for caching and queues)
REDIS_URL=redis://localhost:6379
ENABLE_REDIS=true

# API Authentication
VALID_API_KEYS=key1,key2,key3
```

### Environment Setup

1. **Production Environment**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Environment Validation**
   ```bash
   npm run validate:env
   ```

## Deployment Options

### Option 1: Render (Recommended)

1. **Connect Repository**
   - Connect your GitHub repository to Render
   - Choose "Web Service" deployment type

2. **Configure Build Settings**
   ```yaml
   Build Command: npm run build
   Start Command: npm start
   ```

3. **Environment Variables**
   - Add all required environment variables in Render dashboard
   - Use PostgreSQL and Redis add-ons for databases

4. **Memory Optimization (Free Tier)**
   ```bash
   # For free tier, disable memory-intensive features
   ENABLE_REDIS=false
   ENABLE_QUEUE=false
   ENABLE_METRICS=false
   ```

### Option 2: Docker Deployment

1. **Build Docker Image**
   ```bash
   docker build -t onekeel-swarm .
   ```

2. **Run with Docker Compose**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "5000:5000"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=postgresql://user:pass@db:5432/swarm
       depends_on:
         - db
         - redis
     
     db:
       image: postgres:15
       environment:
         POSTGRES_DB: swarm
         POSTGRES_USER: user
         POSTGRES_PASSWORD: pass
       volumes:
         - postgres_data:/var/lib/postgresql/data
     
     redis:
       image: redis:7-alpine
       volumes:
         - redis_data:/data

   volumes:
     postgres_data:
     redis_data:
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   ```

### Option 3: Traditional VPS

1. **Server Setup**
   ```bash
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PostgreSQL
   sudo apt-get install postgresql postgresql-contrib

   # Install Redis
   sudo apt-get install redis-server
   ```

2. **Application Deployment**
   ```bash
   # Clone repository
   git clone https://github.com/your-repo/onekeel-swarm.git
   cd onekeel-swarm

   # Install dependencies
   npm ci --production

   # Build application
   npm run build

   # Set up environment
   cp .env.example .env
   # Edit .env with production values

   # Run database migrations
   npm run db:migrate

   # Start with PM2
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## Database Setup

### PostgreSQL Configuration

1. **Create Database**
   ```sql
   CREATE DATABASE swarm_production;
   CREATE USER swarm_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE swarm_production TO swarm_user;
   ```

2. **Run Migrations**
   ```bash
   DATABASE_URL=postgresql://swarm_user:secure_password@localhost:5432/swarm_production npm run db:migrate
   ```

3. **Performance Tuning**
   ```sql
   -- Optimize PostgreSQL settings
   ALTER SYSTEM SET shared_buffers = '256MB';
   ALTER SYSTEM SET effective_cache_size = '1GB';
   ALTER SYSTEM SET maintenance_work_mem = '64MB';
   SELECT pg_reload_conf();
   ```

## SSL/HTTPS Setup

### Option 1: Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header Origin "";
    }
}
```

### Option 2: Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Health Checks & Monitoring

### Application Health Endpoint

The application provides health check endpoints:

```bash
# Basic health check
curl https://your-domain.com/api/system/health

# Detailed system status
curl https://your-domain.com/api/system/metrics
```

### Process Monitoring (PM2)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'onekeel-swarm',
    script: 'dist/server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 5
  }]
};
```

### External Monitoring

Set up monitoring with services like:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry
- **Performance monitoring**: New Relic, DataDog

## Performance Optimization

### Application Level

1. **Enable Compression**
   ```javascript
   // Already configured in the app
   app.use(compression());
   ```

2. **Connection Pooling**
   ```javascript
   // Database connection pool
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000
   });
   ```

3. **Caching Strategy**
   ```javascript
   // Redis caching for API responses
   const cache = redis.createClient(process.env.REDIS_URL);
   ```

### Database Optimization

```sql
-- Create indexes for frequent queries
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_conversations_lead ON conversations(lead_id);
CREATE INDEX idx_activities_timestamp ON activities(created_at);
```

## Security Hardening

### Application Security

1. **Environment Variables**
   ```bash
   # Use strong secrets
   JWT_SECRET=$(openssl rand -base64 32)
   SESSION_SECRET=$(openssl rand -base64 32)
   ```

2. **Rate Limiting**
   ```javascript
   // Already configured with express-rate-limit
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   ```

3. **CORS Configuration**
   ```javascript
   app.use(cors({
     origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
     credentials: true
   }));
   ```

### Server Security

```bash
# Firewall configuration
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# Disable root login
sudo vi /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
sudo systemctl restart ssh

# Keep system updated
sudo apt update && sudo apt upgrade -y
```

## Backup Strategy

### Database Backups

```bash
#!/bin/bash
# backup-db.sh
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="swarm_production"

mkdir -p $BACKUP_DIR

pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
```

### Application Files

```bash
#!/bin/bash
# backup-app.sh
BACKUP_DIR="/backups/app"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/onekeel-swarm"

mkdir -p $BACKUP_DIR

tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
  --exclude="node_modules" \
  --exclude="dist" \
  --exclude=".git" \
  $APP_DIR
```

## Deployment Checklist

### Pre-Deployment

- [ ] **Environment configured**: All required environment variables set
- [ ] **Database ready**: PostgreSQL instance created and accessible  
- [ ] **SSL certificates**: HTTPS properly configured
- [ ] **DNS configured**: Domain pointing to server
- [ ] **Backup system**: Database and file backups configured

### Deployment Process

- [ ] **Code deployment**: Latest code deployed to server
- [ ] **Dependencies installed**: `npm ci --production` completed
- [ ] **Application built**: `npm run build` successful
- [ ] **Database migrated**: `npm run db:migrate` completed
- [ ] **Services started**: Application and dependencies running

### Post-Deployment

- [ ] **Health checks**: All endpoints responding correctly
- [ ] **Agent status**: All agents active and processing
- [ ] **External services**: Email, SMS, AI services connected
- [ ] **Monitoring active**: Health checks and alerts configured
- [ ] **Performance baseline**: Initial metrics recorded

## Troubleshooting

### Common Issues

1. **Memory Issues (Free Tier)**
   ```bash
   # Reduce memory usage
   ENABLE_REDIS=false
   ENABLE_QUEUE=false
   NODE_OPTIONS="--max-old-space-size=256"
   ```

2. **Database Connection Errors**
   ```bash
   # Check connection string format
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   
   # Test connection
   psql $DATABASE_URL -c "SELECT 1;"
   ```

3. **WebSocket Issues**
   ```javascript
   // Check proxy configuration for WebSocket upgrade
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

### Logs and Debugging

```bash
# Application logs
pm2 logs onekeel-swarm

# System logs
sudo journalctl -u your-service-name -f

# Database logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

For additional support, refer to the [Technical Architecture](TECHNICAL_ARCHITECTURE.md) and [API Reference](API_REFERENCE.md) documentation.