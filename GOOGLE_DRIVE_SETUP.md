# Google Drive Integration Setup Guide

## Overview
This app supports Google Sign-In and Google Drive file picker for:
- **Document Upload**: Upload documents from Google Drive
- **Logo Upload**: Upload images from Google Drive

## Prerequisites

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - **Google Drive API**: Required for reading files
   - **Google+ API**: Required for user info

### 2. Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type
3. Fill in app name, email, and other required fields
4. Add scopes:
   - `../auth/drive.readonly` - Read files from Google Drive
   - `../auth/userinfo.profile` - Get user profile
   - `../auth/userinfo.email` - Get user email

### 3. Create OAuth Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. For **Application type**, select:
   - **Android**: Create Android OAuth client with your app's package name and SHA-1 fingerprint
   - **iOS**: Create iOS OAuth client with your bundle ID
   - **Web**: Create Web application credentials

### 4. Get Your Client IDs
You'll need these Client IDs for configuration:
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` - For web/oauth flow
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` - For Android (from Google Cloud Console)
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` - For iOS (from Google Cloud Console)

### 5. Configure Environment Variables
Create a `.env` file in the project root:

```env
# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

### 6. Get SHA-1 Fingerprint for Android
```bash
# For debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For release keystore (when publishing)
keytool -list -v -keystore your-release-keystore.jks -alias your-alias -storepass your-storepass -keypass your-keypass
```

### 7. Configure OAuth Redirect URI
For the OAuth flow to work, you need to configure the redirect URI:
- **Scheme**: `sep490-aiconsulting` (already configured in app.json)
- The app will use this scheme for handling OAuth callbacks

## Testing the Integration

### Android
1. Build the APK with `npx expo run:android`
2. Make sure the SHA-1 fingerprint matches the one in Google Cloud Console
3. Test the Google Sign-In flow

### iOS
1. Add the bundle ID to Google Cloud Console
2. Run `npx expo run:ios`
3. Test the Google Sign-In flow

## Troubleshooting

### Common Issues

1. **Error: DEVELOPER_ERROR**
   - Check SHA-1 fingerprint is correct
   - Verify package name matches

2. **Error: INVALID_CLIENT_ID**
   - Verify Client IDs are correct
   - Check environment variables are set

3. **Error: NETWORK_ERROR**
   - Check internet connection
   - Verify OAuth redirect URI is configured

4. **Files not showing**
   - Check Drive API is enabled
   - Verify user has access to the files
   - Ensure files are not in trash

## Security Notes

- OAuth tokens are stored securely using `expo-secure-store`
- Tokens are only used for accessing Google Drive
- Users must explicitly sign in to access their files
- No automatic token refresh - users may need to sign in again after token expiry
