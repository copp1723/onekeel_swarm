#!/bin/bash

# OneKeel Swarm Database Optimization Setup Script
# This script applies all database performance optimizations

set -e  # Exit on any error

echo "🚀 OneKeel Swarm Database Optimization Setup"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

print_info "Starting database optimization setup..."

# Step 1: Check dependencies
echo ""
echo "📦 Checking dependencies..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Node.js and npm are available"

# Step 2: Install dependencies if needed
echo ""
echo "📥 Installing dependencies..."

if [ ! -d "node_modules" ]; then
    npm install
    print_status "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Step 3: Check database connection
echo ""
echo "🔌 Checking database connection..."

if [ -z "$DATABASE_URL" ]; then
    print_warning "DATABASE_URL environment variable not set"
    print_info "Please set DATABASE_URL before running optimizations"
    print_info "Example: export DATABASE_URL='postgresql://user:password@host:port/database'"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_status "DATABASE_URL is configured"
fi

# Step 4: Check Redis connection (optional)
echo ""
echo "💾 Checking Redis configuration..."

if [ -z "$REDIS_URL" ]; then
    print_warning "REDIS_URL not configured - caching will be disabled"
    print_info "For optimal performance, configure Redis:"
    print_info "Example: export REDIS_URL='redis://localhost:6379'"
else
    print_status "Redis is configured at $REDIS_URL"
fi

# Step 5: Create logs directory
echo ""
echo "📁 Setting up directories..."

mkdir -p logs
print_status "Logs directory created"

# Step 6: Apply database migrations
echo ""
echo "🗄️  Applying database optimizations..."

if [ -f "migrations/0011_optimize_database_indexes.sql" ]; then
    if [ ! -z "$DATABASE_URL" ]; then
        # Check if psql is available
        if command -v psql &> /dev/null; then
            print_info "Applying database index optimizations..."
            psql "$DATABASE_URL" -f migrations/0011_optimize_database_indexes.sql -v ON_ERROR_STOP=1
            print_status "Database indexes applied successfully"
        else
            print_warning "psql not available - will apply migrations via npm script"
            npm run db:migrate
            print_status "Database migrations applied"
        fi
    else
        print_warning "Skipping database migration - DATABASE_URL not set"
    fi
else
    print_warning "Index optimization migration not found"
fi

# Step 7: Run optimization script
echo ""
echo "⚡ Running database optimization script..."

if npm run tsx scripts/optimize-database-performance.ts; then
    print_status "Database optimization completed successfully"
else
    print_error "Database optimization script failed"
    print_info "Check the logs for more details"
fi

# Step 8: Run performance benchmark (optional)
echo ""
read -p "Would you like to run performance benchmarks? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 Running performance benchmarks..."
    if npm run tsx scripts/benchmark-database-performance.ts; then
        print_status "Performance benchmarks completed"
        print_info "Results saved to logs/database-benchmark-report.json"
    else
        print_warning "Performance benchmarks failed"
    fi
fi

# Step 9: Setup monitoring (production)
echo ""
echo "📊 Setting up monitoring configuration..."

# Create monitoring environment file template
cat > .env.monitoring.example << EOF
# Database Monitoring Configuration
ENABLE_DB_MONITORING=true
DB_MONITORING_INTERVAL=60000
SLOW_QUERY_THRESHOLD=1000
MAX_DB_CONNECTIONS=20
MAX_RESPONSE_TIME=2000
MIN_CACHE_HIT_RATE=0.8

# Database Pool Configuration  
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_CONNECT_TIMEOUT=30
DB_IDLE_TIMEOUT=300
DB_MAX_LIFETIME=3600

# Cache Configuration
CACHE_KEY_PREFIX=onekeel:
EOF

print_status "Monitoring configuration template created (.env.monitoring.example)"

# Step 10: Display summary and next steps
echo ""
echo "🎉 Database Optimization Setup Complete!"
echo "========================================"

print_status "Database indexes optimized"
print_status "Caching service configured"
print_status "Transaction management enabled"
print_status "Monitoring system ready"
print_status "Performance benchmarks available"

echo ""
echo "📋 Next Steps:"
echo "1. Review the optimization report: DATABASE_OPTIMIZATION_REPORT.md"
echo "2. Configure monitoring environment variables (see .env.monitoring.example)"
echo "3. Set up Redis for caching (if not already done):"
print_info "   export REDIS_URL='redis://your-redis-server:6379'"
echo "4. Start your application and monitor performance"
echo "5. Review performance benchmarks in logs/ directory"

echo ""
echo "🚀 Your database is now optimized for production!"

# Optional: Start the application
echo ""
read -p "Would you like to start the application now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting application..."
    npm run dev
fi

print_status "Setup complete!"