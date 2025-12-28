@echo off
echo ========================================
echo  Federal & California Leave Assistant
echo  Git Repository Update Script
echo ========================================
echo.

echo [1/5] Checking git status...
git status

echo.
echo [2/5] Adding all changes to staging...
git add .

echo.
echo [3/5] Committing changes...
set /p commit_message="Enter commit message (or press Enter for default): "
if "%commit_message%"=="" set commit_message=Update application with professional redesign and improvements

git commit -m "%commit_message%"

echo.
echo [4/5] Pushing to GitHub repository...
git push origin main

echo.
echo [5/5] Repository update complete!
echo.
echo ========================================
echo  Summary:
echo  - All local changes have been committed
echo  - Changes pushed to GitHub repository
echo  - Repository is now up to date
echo ========================================
echo.

pause