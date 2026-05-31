# SP26SE070 — AI Consulting Chatbot Mobile App

React Native mobile app for the Internal Consulting Chatbot Platform.
Built with Expo + TypeScript.

## Prerequisites

- Node.js 18+
- npm 9+
- Git
- Expo Go app on your phone (Android or iOS)

## Setup

1. Clone the repository
   ```
   git clone https://github.com/SP26SE070/SEP490_AIConsultingChatbot_Mobile.git
   cd SEP490_AIConsultingChatbot_Mobile
   ```

2. Install dependencies
   ```
   npm install --legacy-peer-deps
   ```

3. Start the development server
   ```
   npx expo start
   ```

4. Open Expo Go on your phone and scan the QR code

## Backend URL

Production APK uses:

https://sp26se070internalchatbotbe-production.up.railway.app

Local dev still uses `localhost` / `10.0.2.2:8080`.

## Build APK (EAS) — tài khoản Expo của bạn

1. Tạo tài khoản miễn phí tại [expo.dev](https://expo.dev) (nếu chưa có).

2. Login:
   ```
   npx eas-cli login
   ```

3. Liên kết project với tài khoản của bạn (chỉ lần đầu):
   ```
   npx eas-cli init
   ```
   Chọn **Create a new project** — Expo sẽ tạo project riêng dưới account của bạn.

4. Build APK:
   ```
   npm run build:android:apk
   ```

5. Khi build xong, mở [expo.dev](https://expo.dev) → **Projects** → project của bạn → **Builds** → **Download** APK.

Profile `preview` / `production` trong `eas.json` đã cấu hình:
- `buildType: apk`
- `EXPO_PUBLIC_API_BASE_URL` trỏ Railway BE

## Test Accounts
| Role         | Email             | Password |
| ------------ | ----------------- | -------- |
| Tenant Admin | admin@fpt.com     | 123456   |
| Employee     | employee1@fpt.com | 123456   |
| Employee     | employee2@fpt.com | 123456   |

## Development Rules

- Work on `dev` branch, **never commit to main directly**
- Commit format: `feat(screen): description`
- Always use: `npm install --legacy-peer-deps`

## Tech Stack

- React Native + Expo SDK 54
- TypeScript
- Expo Router (file-based navigation)
- expo-secure-store (token storage)

## Common Issues

- **npm install fails:** use `--legacy-peer-deps` flag
- **App not loading after QR scan:** phone and laptop must be on the same WiFi
- **Login fails:** check Railway backend is running

## Screens

| Screen        | Status      |
| ------------- | ----------- |
| Login         | In progress |
| Chatbot       | In progress |
| Chat History  | Pending     |
| Documents     | Pending     |
| Profile       | Pending     |