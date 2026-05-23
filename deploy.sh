#!/bin/bash
# Deploy YVO BUHA Dashboard → https://yv-buha.netlify.app
cd "$(dirname "$0")"
MSG="${1:-Update $(date +%Y-%m-%d)}"
echo "📦 Git commit & push..."
git add -A
git commit -m "$MSG" 2>/dev/null || echo "  (keine neuen Änderungen)"
git push
echo "🚀 Netlify deploy..."
npx netlify-cli deploy --prod --dir . --site b63b69a6-3b48-432d-960c-224ae6b348cf
echo "✅ Fertig! → https://yv-buha.netlify.app"
