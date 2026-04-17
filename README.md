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

https://sp26se070internalchatbotbe-production.up.railway.app

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