#!/bin/bash

cd /Users/joshcopp/Desktop/onekeel_swarm/client/src

echo "Checking for files with missing lucide-react imports..."
echo "================================================="

# List of icon names to check
ICONS="Brain|LogOut|Plus|TrendingUp|UserPlus|Users|Phone|Mail|Building|Calendar|Filter|Download|Upload|Trash2|Check|Target|Lightbulb|MessageSquare|CheckCircle|XCircle|AlertCircle|Shield|Search|Edit|Bell|ChevronDown|Bot|Send|BarChart2|Settings|FileText|ChevronRight|ChevronLeft|Menu|Clock|Play|Pause|TrendingDown|DollarSign|Key|CreditCard|User|MessageCircle|Minimize2|Maximize2|Plug|MoreVertical|MapPin|Tag"

# Find all TypeScript files
find . -name "*.tsx" -type f | while read -r file; do
    # Check if file uses any of these icons
    if grep -qE "<($ICONS)" "$file" 2>/dev/null; then
        # Check if it has lucide-react import
        if ! grep -q "from 'lucide-react'" "$file" 2>/dev/null; then
            echo "❌ Missing import: $file"
            # Show which icons are used
            grep -oE "<($ICONS)" "$file" 2>/dev/null | sort | uniq | sed 's/<//g' | tr '\n' ' '
            echo ""
        fi
    fi
done

echo ""
echo "Files that already have lucide-react imports:"
echo "============================================="
grep -l "from 'lucide-react'" $(find . -name "*.tsx" -type f) 2>/dev/null | head -20