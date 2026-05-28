import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Pressable, RefreshControl, ScrollView
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as documentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AppShell } from '../components/layout/AppShell';
import { useLanguageStore, translations } from '../lib/language-store';
import { getAccessToken } from '../lib/auth-store';
import { KNOWLEDGE_BASE } from '../lib/api/config';

const API_TIMEOUT = 15000;

interface Document {
  id: string;
  documentTitle?: string;
  originalFileName?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
  embeddingStatus?: string;
  visibility?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  category?: string;
  description?: string;
  chunkCount?: number;
  accessibleDepartments?: number[];
  accessibleRoles?: number[];
  minimumRoleLevel?: number;
  currentVersionId?: string;
  versionCount?: number;
}

interface Category {
  id: string;
  name: string;
  code: string;
}

const VISIBILITY_LABELS_VI: Record<string, string> = {
  COMPANY_WIDE: 'Toàn công ty',
  SPECIFIC_DEPARTMENTS: 'Theo phòng ban',
  SPECIFIC_ROLES: 'Theo vai trò',
  SPECIFIC_DEPARTMENTS_AND_ROLES: 'Theo phòng ban và vai trò',
};

const VISIBILITY_LABELS_EN: Record<string, string> = {
  COMPANY_WIDE: 'Company-wide',
  SPECIFIC_DEPARTMENTS: 'Specific departments',
  SPECIFIC_ROLES: 'Specific roles',
  SPECIFIC_DEPARTMENTS_AND_ROLES: 'Specific departments & roles',
};

const STATUS_LABELS: Record<string, { vi: string; en: string; color: string }> = {
  COMPLETED: { vi: 'Đã xử lý', en: 'Processed', color: '#22c55e' },
  PENDING: { vi: 'Đang chờ', en: 'Pending', color: '#f59e0b' },
  PROCESSING: { vi: 'Đang xử lý', en: 'Processing', color: '#3b82f6' },
  FAILED: { vi: 'Thất bại', en: 'Failed', color: '#f87171' },
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = API_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function apiRequest(
  url: string,
  options: RequestInit = {},
  retries = 2
): Promise<Response> {
  const token = await getAccessToken();
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { ...options, headers });
      
      if (res.status === 401) {
        Alert.alert(
          'Phiên đã hết hạn',
          'Vui lòng đăng nhập lại.'
        );
        throw new Error('Unauthorized');
      }
      
      return res;
    } catch (e: any) {
      if (e.name === 'AbortError') {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error('Request timeout');
      }
      if (attempt < retries && (e.message === 'Unauthorized' || e.message.includes('fetch'))) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  
  throw new Error('Request failed');
}

export default function DocumentsScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const isVi = language === 'vi';
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canUpload, setCanUpload] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<{ uri: string; name: string; type: string; size: number } | null>(null);
  const [uploadVisibility, setUploadVisibility] = useState<string>('COMPANY_WIDE');
  const [uploadCategory, setUploadCategory] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      
      const [docsResult, catsResult] = await Promise.allSettled([
        apiRequest(`${KNOWLEDGE_BASE}/documents`),
        apiRequest(`${KNOWLEDGE_BASE}/categories`),
      ]);
      
      if (docsResult.status === 'fulfilled') {
        const docsRes = docsResult.value;
        console.log('Docs status:', docsRes.status);
        if (docsRes.ok) {
          const docsData = await docsRes.json();
          let docsList: Document[] = [];
          if (Array.isArray(docsData)) {
            docsList = docsData;
          } else if (docsData && typeof docsData === 'object') {
            const o = docsData as Record<string, unknown>;
            if (Array.isArray(o.content)) docsList = o.content as Document[];
            else if (Array.isArray(o.data)) docsList = o.data as Document[];
          }
          setDocuments(docsList);
        } else if (docsRes.status === 401) {
          setError(isVi ? 'Vui lòng đăng nhập lại' : 'Please login again');
        } else if (docsRes.status === 403) {
          setError(isVi ? 'Bạn không có quyền xem tài liệu' : 'You do not have permission to view documents');
        } else {
          setError(isVi ? 'Không thể tải danh sách tài liệu' : 'Failed to load documents');
        }
      } else {
        console.log('Docs fetch error:', docsResult.reason);
        setError(isVi ? 'Không thể kết nối máy chủ' : 'Cannot connect to server');
      }
      
      if (catsResult.status === 'fulfilled' && catsResult.value.ok) {
        const catsData = await catsResult.value.json();
        if (Array.isArray(catsData)) {
          setCategories(catsData);
        } else if (catsData?.content) {
          setCategories(catsData.content);
        }
      }
      
      setCanUpload(true);
    } catch (e: any) {
      console.log('Load error:', e);
      if (e.message === 'Unauthorized') {
        setError(isVi ? 'Vui lòng đăng nhập lại' : 'Please login again');
      } else {
        setError(e.message || (isVi ? 'Không thể tải dữ liệu' : 'Failed to load data'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleUpload() {
    if (!uploadFile) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Vui lòng chọn file' : 'Please select a file');
      return;
    }
    if (!uploadTitle.trim()) {
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Vui lòng nhập tiêu đề' : 'Please enter a title');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: uploadFile.uri,
        name: uploadFile.name,
        type: uploadFile.type,
      } as any);
      formData.append('documentTitle', uploadTitle.trim());
      formData.append('visibility', uploadVisibility);
      if (uploadDescription.trim()) {
        formData.append('description', uploadDescription.trim());
      }
      if (uploadCategory) {
        formData.append('categoryId', uploadCategory);
      }
      
      const res = await apiRequest(`${KNOWLEDGE_BASE}/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        Alert.alert(
          isVi ? 'Thành công' : 'Success',
          isVi ? 'Tài liệu đã được tải lên' : 'Document uploaded successfully'
        );
        setShowUploadModal(false);
        setUploadTitle('');
        setUploadDescription('');
        setUploadFile(null);
        setUploadCategory('');
        loadData();
      } else {
        const errorText = await res.text();
        let errorMessage = isVi ? 'Tải lên thất bại' : 'Upload failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {}
        setError(errorMessage);
      }
    } catch (e: any) {
      console.log('Upload error:', e);
      setError(e.message || (isVi ? 'Tải lên thất bại' : 'Upload failed'));
    } finally {
      setUploading(false);
    }
  }

  async function pickFile() {
    try {
      const result = await documentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
        });
      }
    } catch (e) {
      console.log('Pick file error:', e);
      Alert.alert(isVi ? 'Lỗi' : 'Error', isVi ? 'Không thể chọn file' : 'Cannot select file');
    }
  }

  async function handleDownload(doc: Document) {
    try {
      const downloadUrl = `${KNOWLEDGE_BASE}/documents/${doc.id}/download`;
      await WebBrowser.openBrowserAsync(downloadUrl);
    } catch (e) {
      console.log('Download error:', e);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi ? 'Không thể tải xuống tài liệu' : 'Cannot download document'
      );
    }
  }

  async function handleViewDetail(doc: Document) {
    try {
      const res = await apiRequest(`${KNOWLEDGE_BASE}/documents/detail/${doc.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDoc(data);
        setShowDetailModal(true);
      } else {
        setSelectedDoc(doc);
        setShowDetailModal(true);
      }
    } catch (e) {
      setSelectedDoc(doc);
      setShowDetailModal(true);
    }
  }

  function formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(1)} ${units[unit]}`;
  }

  function getStatusLabel(status?: string): { text: string; color: string } {
    const key = (status || '').toUpperCase();
    const label = STATUS_LABELS[key] || { vi: status || '—', en: status || '—', color: '#6b7280' };
    return { text: isVi ? label.vi : label.en, color: label.color };
  }

  function getVisibilityLabel(visibility?: string): string {
    const key = visibility || 'COMPANY_WIDE';
    if (isVi) {
      return VISIBILITY_LABELS_VI[key] || VISIBILITY_LABELS_VI.COMPANY_WIDE;
    }
    return VISIBILITY_LABELS_EN[key] || VISIBILITY_LABELS_EN.COMPANY_WIDE;
  }

  const filteredDocuments = documents.filter(doc => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTitle = (doc.documentTitle || doc.originalFileName || '').toLowerCase().includes(query);
      const matchDesc = (doc.description || '').toLowerCase().includes(query);
      if (!matchTitle && !matchDesc) return false;
    }
    if (filterStatus && doc.embeddingStatus?.toUpperCase() !== filterStatus.toUpperCase()) {
      return false;
    }
    return true;
  });

  const renderDocumentItem = ({ item }: { item: Document }) => {
    const status = getStatusLabel(item.embeddingStatus);
    
    return (
      <TouchableOpacity
        style={styles.docCard}
        onPress={() => handleViewDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.docIconContainer}>
          <Ionicons name="document-text" size={24} color="#10b981" />
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docTitle} numberOfLines={1}>
            {item.documentTitle || item.originalFileName || 'Untitled'}
          </Text>
          <View style={styles.docMeta}>
            <Text style={styles.docMetaText}>{formatFileSize(item.fileSize)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
            </View>
          </View>
          <Text style={styles.docVisibility}>{getVisibilityLabel(item.visibility)}</Text>
        </View>
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => handleDownload(item)}
        >
          <Ionicons name="download-outline" size={20} color="#6b7280" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <AppShell title={isVi ? 'Tài liệu' : 'Documents'}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>
            {isVi ? 'Đang tải...' : 'Loading...'}
          </Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={isVi ? 'Tài liệu' : 'Documents'}>
      <View style={styles.container}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadData()}>
              <Text style={styles.retryText}>{isVi ? 'Thử lại' : 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={isVi ? 'Tìm kiếm tài liệu...' : 'Search documents...'}
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => {
              const options = ['', 'COMPLETED', 'PENDING', 'PROCESSING', 'FAILED'];
              const labels = [
                isVi ? 'Tất cả' : 'All',
                isVi ? 'Đã xử lý' : 'Processed',
                isVi ? 'Đang chờ' : 'Pending',
                isVi ? 'Đang xử lý' : 'Processing',
                isVi ? 'Thất bại' : 'Failed',
              ];
              Alert.alert(
                isVi ? 'Lọc theo trạng thái' : 'Filter by status',
                '',
                options.map((val, idx) => ({
                  text: labels[idx],
                  onPress: () => setFilterStatus(val),
                }))
              );
            }}
          >
            <Ionicons name="filter" size={20} color={filterStatus ? '#10b981' : '#6b7280'} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredDocuments}
          renderItem={renderDocumentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={['#10b981']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {isVi ? 'Không có tài liệu nào' : 'No documents found'}
              </Text>
            </View>
          }
        />

        {canUpload && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setShowUploadModal(true)}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        <Modal
          visible={showUploadModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowUploadModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isVi ? 'Tải lên tài liệu' : 'Upload Document'}
              </Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.label}>
                {isVi ? 'Tiêu đề *' : 'Title *'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={isVi ? 'Nhập tiêu đề tài liệu' : 'Enter document title'}
                placeholderTextColor="#9ca3af"
                value={uploadTitle}
                onChangeText={setUploadTitle}
              />

              <Text style={styles.label}>
                {isVi ? 'Mô tả' : 'Description'}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={isVi ? 'Mô tả ngắn (tùy chọn)' : 'Short description (optional)'}
                placeholderTextColor="#9ca3af"
                value={uploadDescription}
                onChangeText={setUploadDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>
                {isVi ? 'Danh mục' : 'Category'}
              </Text>
              <TouchableOpacity
                style={styles.select}
                onPress={() => {
                  const options = categories.map(c => ({ text: `${c.name} (${c.code})`, value: c.id }));
                  Alert.alert(
                    isVi ? 'Chọn danh mục' : 'Select category',
                    '',
                    [
                      { text: isVi ? 'Không chọn' : 'None', onPress: () => setUploadCategory('') },
                      ...options.map(o => ({ text: o.text, onPress: () => setUploadCategory(o.value) }))
                    ]
                  );
                }}
              >
                <Text style={styles.selectText}>
                  {uploadCategory 
                    ? categories.find(c => c.id === uploadCategory)?.name || uploadCategory
                    : isVi ? 'Chọn danh mục' : 'Select category'
                  }
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>

              <Text style={styles.label}>
                {isVi ? 'Quyền truy cập' : 'Access'}
              </Text>
              <TouchableOpacity
                style={styles.select}
                onPress={() => {
                  const options = [
                    { text: VISIBILITY_LABELS_VI.COMPANY_WIDE, value: 'COMPANY_WIDE' },
                    { text: VISIBILITY_LABELS_VI.SPECIFIC_DEPARTMENTS, value: 'SPECIFIC_DEPARTMENTS' },
                    { text: VISIBILITY_LABELS_VI.SPECIFIC_ROLES, value: 'SPECIFIC_ROLES' },
                  ];
                  Alert.alert(
                    isVi ? 'Chọn quyền truy cập' : 'Select access',
                    '',
                    options.map(o => ({ text: o.text, onPress: () => setUploadVisibility(o.value) }))
                  );
                }}
              >
                <Text style={styles.selectText}>
                  {getVisibilityLabel(uploadVisibility)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>

              <Text style={styles.label}>
                {isVi ? 'File *' : 'File *'}
              </Text>
              <TouchableOpacity style={styles.filePicker} onPress={pickFile}>
                <Ionicons name="cloud-upload-outline" size={32} color="#10b981" />
                <Text style={styles.filePickerText}>
                  {uploadFile 
                    ? uploadFile.name
                    : isVi ? 'Nhấn để chọn file' : 'Tap to select file'
                  }
                </Text>
                {uploadFile && (
                  <Text style={styles.fileSize}>{formatFileSize(uploadFile.size)}</Text>
                )}
              </TouchableOpacity>

              {error && (
                <View style={styles.uploadError}>
                  <Text style={styles.uploadErrorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="#fff" />
                    <Text style={styles.uploadBtnText}>
                      {isVi ? 'Tải lên' : 'Upload'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>

        <Modal
          visible={showDetailModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowDetailModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {selectedDoc?.documentTitle || selectedDoc?.originalFileName || ''}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedDoc && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>
                      {isVi ? 'Tên file' : 'File name'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {selectedDoc.originalFileName || '—'}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>
                      {isVi ? 'Dung lượng' : 'Size'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {formatFileSize(selectedDoc.fileSize)}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>
                      {isVi ? 'Trạng thái xử lý' : 'Processing status'}
                    </Text>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: getStatusLabel(selectedDoc.embeddingStatus).color + '20',
                      alignSelf: 'flex-start'
                    }]}>
                      <Text style={[styles.statusText, { 
                        color: getStatusLabel(selectedDoc.embeddingStatus).color 
                      }]}>
                        {getStatusLabel(selectedDoc.embeddingStatus).text}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>
                      {isVi ? 'Quyền truy cập' : 'Access'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {getVisibilityLabel(selectedDoc.visibility)}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>
                      {isVi ? 'Ngày tải lên' : 'Uploaded at'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {selectedDoc.uploadedAt 
                        ? new Date(selectedDoc.uploadedAt).toLocaleString(isVi ? 'vi-VN' : 'en-US')
                        : '—'
                      }
                    </Text>
                  </View>

                  {selectedDoc.description && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        {isVi ? 'Mô tả' : 'Description'}
                      </Text>
                      <Text style={styles.detailValue}>
                        {selectedDoc.description}
                      </Text>
                    </View>
                  )}

                  {selectedDoc.uploadedByName && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>
                        {isVi ? 'Người tải lên' : 'Uploaded by'}
                      </Text>
                      <Text style={styles.detailValue}>
                        {selectedDoc.uploadedByName}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.downloadDetailBtn}
                    onPress={() => handleDownload(selectedDoc)}
                  >
                    <Ionicons name="download" size={20} color="#fff" />
                    <Text style={styles.downloadDetailBtnText}>
                      {isVi ? 'Tải xuống' : 'Download'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    flex: 1,
  },
  retryText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#374151',
  },
  filterBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  docIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  docMetaText: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  docVisibility: {
    fontSize: 12,
    color: '#9ca3af',
  },
  downloadBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  select: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 16,
    color: '#374151',
  },
  filePicker: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#86efac',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  filePickerText: {
    marginTop: 8,
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  fileSize: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  uploadError: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  uploadErrorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  uploadBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  uploadBtnDisabled: {
    opacity: 0.7,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
  },
  downloadDetailBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  downloadDetailBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
