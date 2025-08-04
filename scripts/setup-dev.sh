#!/bin/bash

# OneKeel Swarm - Development Setup Script
# This script sets up a complete development environment

set -e  # Exit on any error

echo "🚀 OneKeel Swarm Development Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    log_success "Node.js $(node -v) is installed"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_success "npm $(npm -v) is installed"
    
    # Check PostgreSQL (optional)
    if command -v psql &> /dev/null; then
        log_success "PostgreSQL is installed"
    else
        log_warning "PostgreSQL not found. You'll need to set up a database."
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies
    log_info "Installing server dependencies..."
    npm ci
    
    # Install client dependencies
    log_info "Installing client dependencies..."
    cd client
    npm ci
    cd ..
    
    log_success "All dependencies installed"
}

# Setup environment
setup_environment() {
    log_info "Setting up environment..."
    
    if [ ! -f .env ]; then
        log_info "Creating .env file from template..."
        cp .env.example .env
        log_warning "Please edit .env file with your actual configuration"
    else
        log_info ".env file already exists"
    fi
    
    # Create logs directory
    mkdir -p logs/security
    
    log_success "Environment setup complete"
}

# Setup git hooks
setup_git_hooks() {
    log_info "Setting up git hooks..."
    
    if [ -d .git ]; then
        npm run prepare
        log_success "Git hooks installed"
    else
        log_warning "Not a git repository. Skipping git hooks setup."
    fi
}

# Run initial checks
run_checks() {
    log_info "Running initial checks..."
    
    # Type check
    log_info "Checking TypeScript..."
    npm run type-check
    
    # Lint check
    log_info "Checking code style..."
    npm run lint
    
    # Format check
    log_info "Checking code formatting..."
    npm run format:check
    
    log_success "All checks passed"
}

# Main setup process
main() {
    check_prerequisites
    install_dependencies
    setup_environment
    setup_git_hooks
    
    log_success "Development environment setup complete!"
    echo ""
    echo "🎉 Next steps:"
    echo "1. Edit .env file with your configuration"
    echo "2. Set up your PostgreSQL database"
    echo "3. Run: npm run db:migrate"
    echo "4. Start development: npm run dev:full"
    echo ""
    echo "📚 Documentation: ./docs/QUICK_START.md"
    echo "🔧 Available scripts: npm run"
}

# Run main function
main "$@"
