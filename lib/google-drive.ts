import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

const GOOGLE_TOKEN_KEY = 'google_access_token';

// Google Client IDs - set these in app.json extra or .env
const GOOGLE_CLIENT_IDS = {
  web: '960708241687-3nle9ls2u4fh6ftj16500kgb8lq8gp64.apps.googleusercontent.com',
  android: '960708241687-s6nbfpadhdd52rr01mp9l43aa6tktnos.apps.googleusercontent.com',
  ios: '960708241687-63d87usg2005t862lee8g6hcf2ev42ku.apps.googleusercontent.com',
};

// Google API configuration
export const GOOGLE_DRIVE_API_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
}

// Google Auth configuration - expo-auth-session auto-discovers endpoints
// Create auth request hook (must be called at top level)
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CLIENT_IDS.android,
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    webClientId: GOOGLE_CLIENT_IDS.web,
    scopes: GOOGLE_DRIVE_API_SCOPES,
  });

  return { request, response, promptAsync };
}

// Token storage functions
export async function saveGoogleToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(GOOGLE_TOKEN_KEY, token);
}

export async function getGoogleToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(GOOGLE_TOKEN_KEY);
}

export async function clearGoogleToken(): Promise<void> {
  await SecureStore.deleteItemAsync(GOOGLE_TOKEN_KEY);
}

// List files from Google Drive
export async function listDriveFiles(
  accessToken: string,
  folderId?: string,
  pageSize: number = 50
): Promise<DriveFile[]> {
  let query = "trashed=false and (mimeType contains 'image/' or mimeType contains 'application/pdf' or mimeType contains 'document')";
  
  if (folderId) {
    query = `trashed=false and '${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'application/pdf' or mimeType contains 'document')`;
  }

  const fields = 'files(id,name,mimeType,size,modifiedTime,thumbnailLink,webContentLink,webViewLink),nextPageToken';
  
  const params = new URLSearchParams({
    q: query,
    fields,
    pageSize: pageSize.toString(),
    orderBy: 'modifiedTime desc',
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to list Google Drive files');
  }

  const data = await response.json();
  return data.files || [];
}

// List folders from Google Drive
export async function listDriveFolders(
  accessToken: string,
  folderId?: string
): Promise<DriveFolder[]> {
  let query = folderId
    ? `trashed=false and mimeType='application/vnd.google-apps.folder' and '${folderId}' in parents`
    : `trashed=false and mimeType='application/vnd.google-apps.folder' and 'root' in parents`;

  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name)',
    orderBy: 'name',
  });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to list Google Drive folders');
  }

  const data = await response.json();
  return data.files || [];
}

// Download file from Google Drive using authenticated access
export async function downloadDriveFileAuthenticated(
  accessToken: string,
  fileId: string,
  fileName: string,
  mimeType: string
): Promise<{ uri: string; name: string; type: string }> {
  // Download to local cache
  const localUri = `${FileSystem.cacheDirectory || ''}${fileName}`;
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download file from Google Drive');
  }

  const blob = await response.blob();
  
  // Convert blob to base64 for FileSystem
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const dataUri = `data:${mimeType};base64,${base64}`;
      resolve({ uri: dataUri, name: fileName, type: mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Check if file is an image
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

// Check if file is a PDF
export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType === 'com.google.android.apps.docs.download';
}

// Get appropriate file type for upload
export function getFileType(mimeType: string): string {
  if (isImageFile(mimeType)) return 'image/png';
  if (isPdfFile(mimeType)) return 'application/pdf';
  return mimeType;
}
