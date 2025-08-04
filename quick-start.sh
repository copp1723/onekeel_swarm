#!/bin/bash

echo "🚀 OneKeel Swarm Alpha Quick Start"
echo "================================="

# Use development environment
echo "Setting up development environment..."
cp .env.development .env

# Check if PostgreSQL is running
echo "Checking PostgreSQL..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL is not running on localhost:5432"
    echo "   You can either:"
    echo "   1. Start PostgreSQL locally"
    echo "   2. Use a cloud database and update DATABASE_URL in .env"
    echo "   3. Continue without database (limited functionality)"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the project
echo "Building project..."
npm run build

# Start the development server
echo ""
echo "✅ Setup complete!"
echo ""
echo "Starting development server..."
echo "Frontend will be at: http://localhost:3000"
echo "Backend will be at: http://localhost:5001"
echo ""
echo "Note: Authentication is disabled (SKIP_AUTH=true)"
echo "All requests will use a dev admin user automatically"
echo ""

npm run dev