#!/bin/bash
# Quick PostgreSQL setup for OneKeel Swarm

echo "🚀 OneKeel Swarm Database Setup"
echo "================================"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed"
    echo "   Please install PostgreSQL first:"
    echo "   - Mac: brew install postgresql"
    echo "   - Ubuntu: sudo apt-get install postgresql"
    echo "   - Or use a cloud service like Render, Supabase, or AWS RDS"
    exit 1
fi

echo "✅ PostgreSQL is installed"

# Create database
echo ""
echo "Creating database 'onekeel_swarm'..."
createdb onekeel_swarm 2>/dev/null && echo "✅ Database created" || echo "⚠️  Database may already exist"

# Update .env file
if [ -f .env ]; then
    echo ""
    echo "📝 Current DATABASE_URL in .env:"
    grep DATABASE_URL .env || echo "   Not found"
    
    echo ""
    echo "Would you like to update DATABASE_URL? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        # Backup existing .env
        cp .env .env.backup
        
        # Get current user
        DB_USER=$(whoami)
        
        # Update DATABASE_URL
        if grep -q "DATABASE_URL" .env; then
            sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER@localhost:5432/onekeel_swarm|" .env
        else
            echo "DATABASE_URL=postgresql://$DB_USER@localhost:5432/onekeel_swarm" >> .env
        fi
        
        echo "✅ Updated DATABASE_URL in .env"
        echo "   Backup saved as .env.backup"
    fi
else
    echo "❌ No .env file found"
    echo "   Run: cp .env.example .env"
fi

echo ""
echo "📊 Next steps:"
echo "   1. Verify connection: npm run test:db"
echo "   2. Run migrations: npm run db:migrate"
echo "   3. Verify schema: npm run db:verify"
echo "   4. Start development: npm run dev"
