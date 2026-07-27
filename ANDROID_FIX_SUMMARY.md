# Android Upload Network Error - Fix Summary

## The Problem
Android WebView blocks XHR requests from file:// origins at a networking level before CORS headers can even apply. The upload fails with Network error.

## The Fix
Enabled CapacitorHttp plugin in capacitor.config.json:

plugins.CapacitorHttp.enabled = true

This makes all fetch and XMLHttpRequest calls from the WebView route through native Android HTTP (OkHttp), which has no CORS restrictions. The app still loads from file:// but network calls bypass CORS completely.

## Changes Made
1. capacitor.config.json - Added CapacitorHttp: { enabled: true }
2. AndroidManifest.xml - Added usesCleartextTraffic + networkSecurityConfig
3. Created res/xml/network_security_config.xml - HTTPS for production, cleartext for dev
4. CONTEXT.md - Updated

## To Try Again
1. The app is already synced to Android (npx cap sync android was run)
2. Open Android Studio with: npm run android:open
3. Build -> Clean Project then Build -> Rebuild Project
4. Install on device
