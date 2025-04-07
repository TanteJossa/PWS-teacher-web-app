# deploy.ps1 (PowerShell)

# Check if Firebase CLI is installed
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "Firebase CLI not found. Please install it: npm install -g firebase-tools"
    exit 1
}

# --- Vue.js Build and Deploy ---
# Write-Host "Building Vue.js application..."
# cd vuejs # Navigate to the Vue.js project directory.  Exit if it fails.
# if (-not $?) { exit }  # Check for errors in cd
# npm install
# npm run build

# Write-Host "Deploying Vue.js application to Firebase Hosting..."
# firebase deploy --only hosting -P toetspws

# --- Firebase Functions Deployment ---
cd ./functions  # Navigate to functions directory
if (-not $?) { exit } # Check for errors

# Check for functions dependencies.  The -d (directory) test is the correct way.
if (-not (Test-Path -Path "node_modules" -PathType Container)) {
  Write-Host "Installing functions dependencies..."
  npm install
}

Write-Host "Building Firebase Cloud Functions..."
npm run build  # This runs 'tsc' to transpile TypeScript

Write-Host "Deploying Firebase Cloud Functions..."
firebase deploy --only functions -P toetspws

Write-Host "Deployment complete!"

# --- Set admin claims (ONLY ONCE, then comment this out) ---
Write-Host "Setting admin claims..."
firebase functions:shell -P toetspws --port 9099 | Out-Null # Redirect the initial output
# Use Invoke-Expression to run commands within the Firebase Shell (very tricky)
Invoke-Expression "setAdminClaim({email: 'your.admin@email.com'})"  # Replace with your admin email
# You may need to add a delay here, give the shell time to respond.
Start-Sleep -Seconds 5  # Wait 5 seconds (adjust as needed)
Invoke-Expression ".exit"