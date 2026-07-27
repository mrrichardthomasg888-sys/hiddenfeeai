# Amazon Appstore Submission Guide

I've renamed your app to **DetectHiddenFees.com** and generated the release APK. However, the current APK is **unsigned**. Amazon (and Google) require all apps to be signed with a digital certificate before they can be uploaded or installed on a device.

## Step 1: Sign Your APK
To submit to Amazon, you must sign the `app-release-unsigned.apk` file. Since I don't have access to your private keystore (.jks file), you need to do this locally:

1. **Open Android Studio**.
2. Go to **Build > Generate Signed Bundle / APK...**
3. Select **APK** and click Next.
4. If you have a key, select it. If not, click **Create new...** to create a certificate for your app.
5. Choose the `release` build variant and ensure the destination is a folder you can easily access.

## Step 2: Amazon Appstore Requirements
Amazon has a few specific requirements that differ slightly from Google Play:

- **App Icons**: You will need a 512x512px and a 114x114px icon (PNG with no transparency).
- **Screenshots**: At least 3 to 10 screenshots.
- **Fire TV/Tablet**: Since this is a Capacitor app, it should run fine on Fire Tablets, but ensure your UI handles different aspect ratios well.

## Step 3: Submission Process
1. Log in to the [Amazon Developer Console](https://developer.amazon.com/).
2. Click **Add a New App > Android**.
3. Fill in the **App Information** (Name: DetectHiddenFees.com).
4. Upload your **Signed APK**.
5. Amazon will perform a "Live App Testing" (LAT) to ensure the app works on their devices.

## Important Note on Stripe
Amazon's policies regarding digital payments can be strict. Since your app charges a fee for an AI audit, ensure you comply with [Amazon's Policy on In-App Purchasing](https://developer.amazon.com/docs/policy-center/iap.html). Usually, for physical services or products, Stripe is fine, but for digital content, they may request you use Amazon's IAP system if they consider the "Audit Report" a digital good.

> [!WARNING]
> Do not lose your `.jks` keystore file! You will need the exact same key to upload updates to the store in the future.
