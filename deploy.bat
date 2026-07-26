@echo off
echo ========================================
echo   Stop Doing List - Deploy Script
echo ========================================
echo.

echo [1/4] Adding all changes...
git add .

echo.
echo [2/4] Committing changes...
git commit -m "Update: %~1"

echo.
echo [3/4] Pushing to GitHub...
git push origin main

echo.
echo [4/4] Deploying to Cloudflare Pages...
npx wrangler pages deploy "不做清单demo" --project-name stop-doing-list

echo.
echo ========================================
echo   Deploy complete!
echo ========================================
pause
