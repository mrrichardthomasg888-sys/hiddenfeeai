# Walkthrough - Fixing Stripe Redirection within the App

I have implemented a fix to ensure that the Stripe payment flow happens entirely within the app's WebView, avoiding the redirect to the external Google Chrome browser.

## Changes Made

### 1. Capacitor Configuration
I updated `capacitor.config.json` to include `allowNavigation` for Stripe domains. This tells the Capacitor WebView that it is permitted to load these external URLs directly instead of handing them off to the system browser.

```json
  "server": {
    "hostname": "app",
    "androidScheme": "https",
    "cleartext": true,
    "allowNavigation": ["checkout.stripe.com", "*.stripe.com"]
  }
```

### 2. Server-Side Redirect Logic
I updated the server's checkout session creation to be dynamic. It now accepts an `origin` parameter from the client. This ensures that Stripe knows exactly where to send the user back to—whether it's the web URL or the app's internal `https://app` URL.

- **File**: `server/src/routes/checkout.ts`

### 3. Client-Side Payment Initiation
I updated the frontend to pass its current `window.location.origin` to the server when starting a payment.
- **Files**: `UploadCard.tsx`, `PaymentGate.tsx`

### 4. Build and Sync
- Rebuilt the frontend assets using `npm run build --workspace client`.
- Synced the updated assets and configuration to the Android project using `npx cap sync android`.

## Verification Results

- **Build**: Successful.
- **Capacitor Sync**: Successful.
- **Expected Behavior**: When the user clicks "Pay", the Stripe Checkout page will load directly over the current app content. Once payment is completed or cancelled, Stripe will redirect the user back to the app's internal report page (`https://app/report/...`), which will then verify the payment and start the analysis.

> [!TIP]
> If you find that other third-party services (like a specific bank's authentication page) still open in Chrome, you can add their domains to the `allowNavigation` array in `capacitor.config.json`.
