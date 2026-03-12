# Futures Daily Word — Native Build Guide

## Prerequisites

- **macOS** with Xcode 15+ (for iOS builds)
- **Android Studio** Hedgehog+ with SDK 34 (for Android builds)
- Node.js 18+, npm 9+
- CocoaPods (for iOS): `sudo gem install cocoapods`

## Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Build the web app
npm run build

# 3. Add native platforms
npm run cap:add:ios
npm run cap:add:android

# 4. Sync web assets to native projects
npm run cap:sync
```

## iOS Build

```bash
# Sync and open Xcode
npm run build:ios
npm run cap:open:ios
```

In Xcode:
1. Select the "App" target
2. Set Team to your Apple Developer account
3. Set Bundle ID: `com.futureschurch.dailyword`
4. Set Display Name: `Futures Daily Word`
5. Set Version: `2.0.0`, Build: `1`
6. Add push notification capability (Signing & Capabilities → + Capability → Push Notifications)
7. Add camera usage description in Info.plist: `NSCameraUsageDescription` = "Take a profile photo"
8. Archive → Distribute to App Store Connect

## Android Build

```bash
# Sync and open Android Studio
npm run build:android
npm run cap:open:android
```

In Android Studio:
1. Open `android/app/build.gradle`
2. Verify `applicationId = "com.futureschurch.dailyword"`
3. Set `versionCode` and `versionName`
4. Add Firebase `google-services.json` to `android/app/` for push notifications
5. Build → Generate Signed Bundle/APK → Android App Bundle (.aab)
6. Upload to Google Play Console

## Push Notifications Setup

### iOS (APNs)
1. Apple Developer Portal → Certificates → Create APNs Key
2. Download .p8 key file
3. Add key ID and team ID to your push notification server config

### Android (FCM)
1. Firebase Console → Project Settings → Cloud Messaging
2. Download `google-services.json` → place in `android/app/`
3. Server key goes in your push notification server config

## App Store Metadata

**App Name:** Futures Daily Word
**Subtitle:** Your Daily Bible Reading Companion
**Category:** Lifestyle → Religion & Spirituality
**Keywords:** bible, devotional, church, prayer, reading plan, daily word, futures church, scripture
**Support URL:** https://futureschurch.com
**Privacy URL:** https://futuresdailyword.com/privacy

### App Store Description
Your daily Bible reading companion from Futures Church. Read scripture in 8 translations, follow guided reading plans, journal your reflections, pray with your church community, and explore the Bible with AI-powered insights.

Features:
• Daily curated scripture passages with commentary
• 8 Bible translations (ESV, NLT, KJV, NKJV, NIV, AMP, NASB, WEB)
• Listen to passages with audio playback
• Bible AI for scripture questions and study
• Community prayer wall across all campuses
• Reading plans including 30-Day Faith Pathway
• Journal and sermon notes
• Dark and light themes
• Offline KJV Bible
• Multi-language support (English, Spanish, Portuguese)

### Screenshots Needed
- iPhone 6.7" (iPhone 15 Pro Max): 1290 × 2796
- iPhone 6.5" (iPhone 14 Plus): 1284 × 2778
- iPad 12.9" (iPad Pro): 2048 × 2732
- Android Phone: 1080 × 1920 minimum

Take screenshots of: Home, Reading Plan, Prayer Wall, Bible AI, Journal, Settings

## Icon Requirements

### iOS
- 1024 × 1024 PNG (no transparency, no rounded corners — iOS applies mask)

### Android
- 512 × 512 PNG (adaptive icon with foreground + background layers)
- Foreground: 432 × 432 safe area within 512 × 512

Place icons in:
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- `android/app/src/main/res/mipmap-*/`

## Splash Screen

- iOS: `ios/App/App/Assets.xcassets/Splash.imageset/`
- Android: `android/app/src/main/res/drawable/splash.png`
- Background color: `#0F0F0F` (already set in capacitor.config.ts)
