import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, ScrollView, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import {
  listDriveFiles, listDriveFolders,
  downloadDriveFileAuthenticated, isImageFile, isPdfFile,
  type DriveFile, type DriveFolder
} from '../lib/google-drive';
import { useNotification } from '../lib/notification';
import { useGoogleAuth, saveGoogleToken, getGoogleToken } from '../lib/google-drive';

interface GoogleDrivePickerProps {
  visible: boolean;
  onClose: () => void;
  onFileSelected: (file: { uri: string; name: string; type: string }) => void;
  isVi: boolean;
  isImageOnly?: boolean;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

const FOLDER_ICON_COLOR = '#facc15';
const FILE_ICON_COLOR = '#64748b';
const IMAGE_ICON_COLOR = '#a855f7';
const PDF_ICON_COLOR = '#ef4444';

export function GoogleDrivePicker({
  visible,
  onClose,
  onFileSelected,
  isVi,
  isImageOnly = false,
}: GoogleDrivePickerProps) {
  const { showError, showSuccess } = useNotification();

  const { promptAsync } = useGoogleAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Breadcrumb navigation
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: 'My Drive' },
  ]);
  const currentFolderId = breadcrumbs[breadcrumbs.length - 1].id;

  // Load saved token on mount
  useEffect(() => {
    if (visible) {
      loadSavedToken();
    }
  }, [visible]);

  // Load content when folder changes
  useEffect(() => {
    if (visible && accessToken) {
      loadContent(currentFolderId);
    }
  }, [visible, accessToken, currentFolderId]);

  const loadSavedToken = async () => {
    try {
      const token = await getGoogleToken();
      if (token) {
        setAccessToken(token);
      }
    } catch (e) {
      console.error('Error loading Google token:', e);
    }
  };

  const loadContent = useCallback(async (folderId: string | null) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [filesData, foldersData] = await Promise.all([
        listDriveFiles(accessToken, folderId, 100),
        listDriveFolders(accessToken, folderId),
      ]);

      // Filter based on mode
      const filteredFiles = isImageOnly
        ? filesData.filter(f => isImageFile(f.mimeType))
        : filesData.filter(f => 
            isImageFile(f.mimeType) || 
            isPdfFile(f.mimeType) || 
            f.mimeType.includes('document') || 
            f.mimeType.includes('sheet') || 
            f.mimeType.includes('presentation')
          );

      setFiles(filteredFiles);
      setFolders(foldersData);
    } catch (e: any) {
      setError(e.message || (isVi ? 'Không thể tải danh sách file' : 'Failed to load files'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, isImageOnly, isVi]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await promptAsync();
      if (result?.type === 'success' && result.authentication?.accessToken) {
        await saveGoogleToken(result.authentication.accessToken);
        setAccessToken(result.authentication.accessToken);
      }
    } catch (e) {
      console.error('Google sign in error:', e);
      showError(isVi ? 'Đăng nhập Google thất bại' : 'Google sign in failed', isVi ? 'Lỗi' : 'Error');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleFilePress = async (file: DriveFile) => {
    if (!accessToken) return;
    setDownloading(file.id);
    try {
      const result = await downloadDriveFileAuthenticated(
        accessToken,
        file.id,
        file.name,
        file.mimeType
      );
      showSuccess(isVi ? 'Đã tải file thành công' : 'File downloaded successfully', isVi ? 'Thành công' : 'Success');
      onFileSelected(result);
      onClose();
    } catch (e: any) {
      showError(e.message || (isVi ? 'Không thể tải file' : 'Failed to download file'), isVi ? 'Lỗi' : 'Error');
    } finally {
      setDownloading(null);
    }
  };

  const handleFolderPress = (folder: DriveFolder) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbPress = (index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  const handleSignOut = async () => {
    setAccessToken(null);
  };

  const getFileIcon = (mimeType: string) => {
    if (isImageFile(mimeType)) return { name: 'image' as const, color: IMAGE_ICON_COLOR };
    if (isPdfFile(mimeType)) return { name: 'document-text' as const, color: PDF_ICON_COLOR };
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return { name: 'grid' as const, color: '#22c55e' };
    if (mimeType.includes('presentation') || mimeType.includes('slides')) return { name: 'albums' as const, color: '#f59e0b' };
    return { name: 'document' as const, color: FILE_ICON_COLOR };
  };

  const renderBreadcrumb = () => (
    <View style={styles.breadcrumbContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.breadcrumbScroll}
      >
        {breadcrumbs.map((item, index) => (
          <View key={index} style={styles.breadcrumbItem}>
            {index > 0 && <Ionicons name="chevron-forward" size={14} color="#64748b" style={styles.breadcrumbSep} />}
            <TouchableOpacity onPress={() => handleBreadcrumbPress(index)}>
              <Text style={[styles.breadcrumbText, index === breadcrumbs.length - 1 && styles.breadcrumbTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="folder-open-outline" size={64} color="#475569" />
      <Text style={styles.emptyText}>
        {isVi ? 'Thư mục trống' : 'Folder is empty'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="cloud-offline" size={48} color="#ef4444" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => loadContent(currentFolderId)}>
        <Text style={styles.retryText}>{isVi ? 'Thử lại' : 'Retry'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFileItem = ({ item }: { item: DriveFile | DriveFolder }) => {
    const isFolder = !('mimeType' in item);
    
    if (isFolder) {
      const folder = item as DriveFolder;
      return (
        <TouchableOpacity
          style={styles.itemContainer}
          onPress={() => handleFolderPress(folder)}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(250, 204, 21, 0.15)' }]}>
            <Ionicons name="folder" size={28} color={FOLDER_ICON_COLOR} />
          </View>
          <Text style={styles.itemName} numberOfLines={2}>{folder.name}</Text>
          <Ionicons name="chevron-forward" size={20} color="#475569" />
        </TouchableOpacity>
      );
    }

    const file = item as DriveFile;
    const iconInfo = getFileIcon(file.mimeType);
    const isDownloadingFile = downloading === file.id;

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => handleFilePress(file)}
        disabled={downloading !== null}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${iconInfo.color}20` }]}>
          {isDownloadingFile ? (
            <ActivityIndicator size="small" color={iconInfo.color} />
          ) : (
            <Ionicons name={iconInfo.name} size={28} color={iconInfo.color} />
          )}
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>{file.name}</Text>
          {file.size && (
            <Text style={styles.itemMeta}>{formatFileSize(parseInt(file.size))}</Text>
          )}
        </View>
        <Ionicons name="download-outline" size={22} color="#10b981" />
      </TouchableOpacity>
    );
  };

  const allItems = [...folders, ...files];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#f1f5f9" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {isImageOnly 
              ? (isVi ? 'Chọn ảnh từ Google Drive' : 'Select image from Google Drive')
              : (isVi ? 'Chọn file từ Google Drive' : 'Select file from Google Drive')
            }
          </Text>
          {accessToken ? (
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
              <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {!accessToken ? (
          <View style={styles.signInContainer}>
            <Ionicons name="logo-google" size={64} color="#4285f4" />
            <Text style={styles.signInTitle}>
              {isVi ? 'Đăng nhập Google' : 'Sign in with Google'}
            </Text>
            <Text style={styles.signInSubtitle}>
              {isVi 
                ? 'Đăng nhập để truy cập Google Drive của bạn'
                : 'Sign in to access your Google Drive'
              }
            </Text>
            <TouchableOpacity 
              style={styles.googleButton} 
              onPress={handleSignIn} 
              disabled={isSigningIn}
            >
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.googleButtonText}>
                {isSigningIn 
                  ? (isVi ? 'Đang đăng nhập...' : 'Signing in...')
                  : (isVi ? 'Đăng nhập Google' : 'Sign in with Google')
                }
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Breadcrumb */}
            {renderBreadcrumb()}

            {/* File List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>
                  {isVi ? 'Đang tải...' : 'Loading...'}
                </Text>
              </View>
            ) : error ? (
              renderError()
            ) : allItems.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={allItems}
                keyExtractor={(item) => item.id}
                renderItem={renderFileItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={loading}
                    onRefresh={() => loadContent(currentFolderId)}
                    tintColor="#10b981"
                  />
                }
              />
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  signInContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  signInTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 24,
    marginBottom: 8,
  },
  signInSubtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4285f4',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  breadcrumbContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  breadcrumbScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbSep: {
    marginHorizontal: 4,
  },
  breadcrumbText: {
    fontSize: 14,
    color: '#64748b',
  },
  breadcrumbTextActive: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    color: '#f1f5f9',
    fontWeight: '500',
  },
  itemMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#94a3b8',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
});
