#!/bin/bash

echo "🧪 Testing OneKeel Swarm Production Login"
echo "========================================="
echo ""

# Production URL
URL="https://ccl-3-final.onrender.com"

# Test if server is responding
echo "1️⃣ Testing server health..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$URL/api/health" 2>/dev/null || echo "FAILED")

if [[ "$HEALTH_RESPONSE" == "FAILED" ]]; then
    echo "❌ Cannot reach server at $URL"
    echo "   Check if the server is running"
    exit 1
fi

echo "✅ Server is responding"
echo ""

# Test login endpoint exists
echo "2️⃣ Testing login endpoint..."
LOGIN_TEST=$(curl -s -X POST -w "\nHTTP_STATUS:%{http_code}" "$URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null)

HTTP_STATUS=$(echo "$LOGIN_TEST" | grep "HTTP_STATUS:" | cut -d: -f2)

if [[ "$HTTP_STATUS" == "404" ]]; then
    echo "❌ Login endpoint not found"
    exit 1
elif [[ "$HTTP_STATUS" == "400" ]]; then
    echo "✅ Login endpoint exists (got expected 400 for empty request)"
else
    echo "⚠️  Unexpected status: $HTTP_STATUS"
fi
echo ""

# Try actual login
echo "3️⃣ Attempting login with admin credentials..."
LOGIN_RESPONSE=$(curl -s -X POST "$URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }' 2>/dev/null)

echo "Response: $LOGIN_RESPONSE"
echo ""

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "✅ Login successful!"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "   Token (first 20 chars): ${TOKEN:0:20}..."
    echo ""
    
    # Test authenticated endpoint
    echo "4️⃣ Testing authenticated endpoint..."
    ME_RESPONSE=$(curl -s "$URL/api/auth/me" \
      -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    echo "Response: $ME_RESPONSE"
    
elif echo "$LOGIN_RESPONSE" | grep -q "Invalid username or password"; then
    echo "❌ Login failed: Invalid credentials"
    echo "   The admin user may not exist in the production database"
    echo "   Run: node scripts/fix-production-login.js"
elif echo "$LOGIN_RESPONSE" | grep -q "Internal server error"; then
    echo "❌ Login failed: Server error"
    echo "   Check server logs for details"
    echo "   Likely causes:"
    echo "   - DATABASE_URL not configured"
    echo "   - JWT_SECRET not set"
    echo "   - Database connection issues"
else
    echo "❌ Login failed: Unknown error"
fi

echo ""
echo "📝 Troubleshooting Steps:"
echo "1. Check Render logs for error details"
echo "2. Verify DATABASE_URL is set in Render environment"
echo "3. Verify JWT_SECRET is set in Render environment"
echo "4. Run database migrations if not done"
echo "5. Use fix-production-login.js to create admin user"