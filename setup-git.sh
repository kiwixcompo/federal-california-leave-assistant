#!/bin/bash

echo "Federal & California Leave Assistant - Git Setup"
echo "=================================================="
echo

echo "This script will help you set up Git and upload to GitHub"
echo

echo "Step 1: Initialize Git repository"
git init

echo
echo "Step 2: Add all files to Git"
git add .

echo
echo "Step 3: Create initial commit"
git commit -m "Initial commit: Federal & California Leave Assistant v1.0"

echo
echo "Step 4: Instructions for GitHub upload"
echo
echo "TO COMPLETE THE SETUP:"
echo
echo "1. Go to GitHub.com and create a new repository"
echo "   - Repository name: federal-california-leave-assistant"
echo "   - Description: HR compliance tool for FMLA and California leave laws"
echo "   - Make it Private (recommended for business use)"
echo "   - Do NOT initialize with README (we already have files)"
echo
echo "2. Copy the repository URL from GitHub"
echo
echo "3. Run these commands (replace YOUR_USERNAME with your GitHub username):"
echo "   git remote add origin https://github.com/YOUR_USERNAME/federal-california-leave-assistant.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo
echo "4. Your project will be uploaded to GitHub!"
echo

echo "Current Git status:"
git status

echo
echo "Git setup complete! Follow the instructions above to upload to GitHub."