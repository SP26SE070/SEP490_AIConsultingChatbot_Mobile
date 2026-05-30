import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Pressable, RefreshControl, ScrollView
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as documentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AppShell } from '../components/layout/AppShell';
import { useLanguageStore, translations } from '../lib/language-store';
import { getAccessToken } from '../lib/auth-store';
import { KNOWLEDGE_BASE, CATEGORIES_BASE, TAGS_BASE } from '../lib/api/config';
import { TENANT_ADMIN_BASE } from '../lib/api/config';

const API_TIMEOUT = 15000;
const DOWNLOAD_HISTORY_KEY = 'download_history';

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

interface Tag {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Role {
  id: number;
  name: string;
  code: string;
  level: number;
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
  const [tags, setTags] = useState<Tag[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canUpload, setCanUpload] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<{ uri: string; name: string; type: string; size: number } | null>(null);
  const [uploadVisibility, setUploadVisibility] = useState<string>('COMPANY_WIDE');
  const [uploadCategory, setUploadCategory] = useState<string>('');
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [uploadDepartments, setUploadDepartments] = useState<number[]>([]);
  const [uploadRoles, setUploadRoles] = useState<number[]>([]);
  const [uploadMinRoleLevel, setUploadMinRoleLevel] = useState<number>(1);
  const [uploading, setUploading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [downloadHistory, setDownloadHistory] = useState<{ id: string; filename: string; uri: string; downloadedAt: number }[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Picker modal states
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showRoleLevelPicker, setShowRoleLevelPicker] = useState(false);
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);
  
  // Load download history
  async function loadDownloadHistory() {
    try {
      const data = await SecureStore.getItemAsync(DOWNLOAD_HISTORY_KEY);
      if (data) {
        setDownloadHistory(JSON.parse(data));
      }
    } catch (e) {
      console.log('Load history error:', e);
    }
  }
  
  // Save to download history
  async function saveToDownloadHistory(filename: string, uri: string) {
    try {
      const newEntry = {
        id: Date.now().toString(),
        filename,
        uri,
        downloadedAt: Date.now(),
      };
      const updated = [newEntry, ...downloadHistory].slice(0, 50);
      setDownloadHistory(updated);
      await SecureStore.setItemAsync(DOWNLOAD_HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.log('Save history error:', e);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadDownloadHistory();
    }, [])
  );
  
  // Normalize department (giống FE)
  function normalizeDepartment(raw: any): Department {
    const idRaw = raw.id ?? raw.department_id ?? raw.departmentId;
    const id = Number(idRaw);
    return {
      id: Number.isFinite(id) ? id : 0,
      name: raw.name || raw.departmentName || '',
      code: raw.code || raw.departmentCode || '',
    };
  }
  
  // Normalize role (giống FE)
  function normalizeRole(raw: any): Role {
    const idRaw = raw.id ?? raw.role_id ?? raw.roleId;
    const id = Number(idRaw);
    return {
      id: Number.isFinite(id) ? id : 0,
      name: raw.name || raw.roleName || '',
      code: raw.code || raw.roleCode || '',
      level: Number.isFinite(raw.level) ? raw.level : 1,
    };
  }
  
  // Normalize list (giống FE)
  function normalizeList(data: any, normalizeFn: (item: any) => any) {
    if (Array.isArray(data)) {
      return data.map(normalizeFn).filter((item: any) => item.id > 0);
    }
    if (data && typeof data === 'object') {
      const inner = data.content ?? data.data ?? data.departments ?? data.roles ?? data.items;
      if (Array.isArray(inner)) return inner.map(normalizeFn).filter((item: any) => item.id > 0);
      if (inner && typeof inner === 'object') return normalizeList(inner, normalizeFn);
    }
    return [];
  }
  
  // Load metadata for upload form
  async function loadMetadata() {
    try {
      const [catsResult, tagsResult, deptsResult, rolesResult] = await Promise.allSettled([
        apiRequest(`${KNOWLEDGE_BASE}/categories/manage`),
        apiRequest(`${TAGS_BASE}/active`),
        apiRequest(`${KNOWLEDGE_BASE}/documents/access-scope/departments`),
        apiRequest(`${KNOWLEDGE_BASE}/documents/access-scope/roles`),
      ]);
      
      if (catsResult.status === 'fulfilled' && catsResult.value.ok) {
        const catsData = await catsResult.value.json();
        if (Array.isArray(catsData)) setCategories(catsData);
        else if (catsData?.content) setCategories(catsData.content);
        else if (catsData?.data) setCategories(catsData.data);
      }
      
      if (tagsResult.status === 'fulfilled' && tagsResult.value.ok) {
        const tagsData = await tagsResult.value.json();
        if (Array.isArray(tagsData)) setTags(tagsData);
        else if (tagsData?.content) setTags(tagsData.content);
        else if (tagsData?.data) setTags(tagsData.data);
      }
      
      if (deptsResult.status === 'fulfilled' && deptsResult.value.ok) {
        const deptsData = await deptsResult.value.json();
        const depts = normalizeList(deptsData, normalizeDepartment);
        console.log('Departments parsed:', depts.length, depts);
        setDepartments(depts);
      }
      
      if (rolesResult.status === 'fulfilled' && rolesResult.value.ok) {
        const rolesData = await rolesResult.value.json();
        const roles = normalizeList(rolesData, normalizeRole);
        console.log('Roles parsed:', roles.length, roles);
        setRoles(roles);
      }
    } catch (e) {
      console.log('Load metadata error:', e);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      
      const [docsResult, catsResult, tagsResult, deptsResult, rolesResult] = await Promise.allSettled([
        apiRequest(`${KNOWLEDGE_BASE}/documents`),
        apiRequest(`${KNOWLEDGE_BASE}/categories/manage`),
        apiRequest(`${TAGS_BASE}/active`),
        apiRequest(`${TENANT_ADMIN_BASE}/departments/active`),
        apiRequest(`${TENANT_ADMIN_BASE}/roles`),
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
        console.log('Categories data:', JSON.stringify(catsData)?.substring(0, 500));
        if (Array.isArray(catsData)) {
          setCategories(catsData);
        } else if (catsData?.content) {
          setCategories(catsData.content);
        } else if (catsData?.data) {
          setCategories(catsData.data);
        }
      }
      
      if (tagsResult.status === 'fulfilled' && tagsResult.value.ok) {
        const tagsData = await tagsResult.value.json();
        console.log('Tags data:', JSON.stringify(tagsData)?.substring(0, 500));
        if (Array.isArray(tagsData)) {
          setTags(tagsData);
        } else if (tagsData?.content) {
          setTags(tagsData.content);
        } else if (tagsData?.data) {
          setTags(tagsData.data);
        }
      }
      
      if (deptsResult.status === 'fulfilled' && deptsResult.value.ok) {
        const deptsData = await deptsResult.value.json();
        const depts = normalizeList(deptsData, normalizeDepartment);
        console.log('Departments parsed:', depts.length, depts);
        setDepartments(depts);
      }
      
      if (rolesResult.status === 'fulfilled' && rolesResult.value.ok) {
        const rolesData = await rolesResult.value.json();
        const roles = normalizeList(rolesData, normalizeRole);
        console.log('Roles parsed:', roles.length, roles);
        setRoles(roles);
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
      // Send tagIds as separate parameters for each tag
      if (uploadTags.length > 0) {
        uploadTags.forEach(tagId => {
          formData.append('tagIds', tagId);
        });
      }
      // Send accessibleDepartments as separate parameters for each department (Spring @RequestParam List parsing)
      if (uploadDepartments.length > 0) {
        uploadDepartments.forEach(deptId => {
          formData.append('accessibleDepartments', deptId.toString());
        });
      }
      // Send accessibleRoles as separate parameters for each role
      if (uploadRoles.length > 0) {
        uploadRoles.forEach(roleId => {
          formData.append('accessibleRoles', roleId.toString());
        });
      }
      if (uploadMinRoleLevel > 1) {
        formData.append('minimumRoleLevel', uploadMinRoleLevel.toString());
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
        setUploadTags([]);
        setUploadDepartments([]);
        setUploadRoles([]);
        setUploadMinRoleLevel(1);
        setUploadVisibility('COMPANY_WIDE');
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
      const token = await getAccessToken();
      const filename = doc.originalFileName || doc.documentTitle || 'document';
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      // Tải file trực tiếp với auth header
      const downloadResult = await FileSystem.downloadAsync(
        `${KNOWLEDGE_BASE}/documents/${doc.id}/download`,
        fileUri,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      if (downloadResult.status === 200) {
        // Lưu vào download history
        await saveToDownloadHistory(filename, downloadResult.uri);
        
        // Share file để lưu vào Files app
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: getMimeType(filename),
            dialogTitle: isVi ? 'Lưu file' : 'Save file',
          });
        } else {
          Alert.alert(
            isVi ? 'Thành công' : 'Success',
            isVi ? `Đã tải "${filename}" thành công.` : `Downloaded "${filename}" successfully.`
          );
        }
      } else {
        Alert.alert(
          isVi ? 'Lỗi' : 'Error',
          isVi ? 'Không thể tải xuống tài liệu' : 'Cannot download document'
        );
      }
    } catch (e) {
      console.log('Download error:', e);
      Alert.alert(
        isVi ? 'Lỗi' : 'Error',
        isVi ? 'Không thể tải xuống tài liệu' : 'Cannot download document'
      );
    }
  }
  
  function getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
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

  async function handlePreviewText(doc: Document) {
    setPreviewLoading(true);
    setShowPreviewModal(true);
    try {
      const token = await getAccessToken();
      const res = await apiRequest(`${KNOWLEDGE_BASE}/documents/${doc.id}/preview`);
      if (res.ok) {
        const data = await res.json();
        setPreviewContent(data.content || data.text || 'Không có nội dung để hiển thị');
      } else if (res.status === 422) {
        setPreviewContent(isVi 
          ? 'Không trích được văn bản để xem trước (ví dụ: PDF scan). Vui lòng tải file gốc.' 
          : 'Cannot extract text for preview (e.g. scanned PDF). Please download the original file.');
      } else {
        setPreviewContent(isVi ? 'Không thể tải nội dung xem trước' : 'Cannot load preview content');
      }
    } catch (e) {
      setPreviewContent(isVi ? 'Lỗi khi tải nội dung' : 'Error loading content');
    } finally {
      setPreviewLoading(false);
    }
  }

  function isTextFile(filename?: string): boolean {
    if (!filename) return false;
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext || '');
  }

  async function handlePreviewFromUri(uri: string) {
    try {
      setPreviewLoading(true);
      setShowPreviewModal(true);
      const content = await FileSystem.readAsStringAsync(uri);
      setPreviewContent(content);
    } catch (e) {
      setPreviewContent(isVi ? 'Không thể đọc file' : 'Cannot read file');
    } finally {
      setPreviewLoading(false);
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
          <>
            {/* Nút xem lịch sử download */}
            {downloadHistory.length > 0 && (
              <TouchableOpacity
                style={styles.historyFab}
                onPress={() => setShowHistoryModal(true)}
              >
                <Ionicons name="folder" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.fab}
              onPress={() => {
                // Reset form
                setUploadTitle('');
                setUploadDescription('');
                setUploadFile(null);
                setUploadCategory('');
                setUploadTags([]);
                setUploadDepartments([]);
                setUploadRoles([]);
                setUploadMinRoleLevel(1);
                setUploadVisibility('COMPANY_WIDE');
                // Load fresh metadata
                loadMetadata();
                setShowUploadModal(true);
              }}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          </>
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
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text style={styles.selectText}>
                  {uploadCategory
                    ? categories.find(c => c.id === uploadCategory)?.name || uploadCategory
                    : isVi ? 'Chọn danh mục' : 'Select category'
                  }
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>

              {/* Tags */}
              <Text style={styles.label}>
                {isVi ? 'Nhãn' : 'Tags'}
              </Text>
              <View style={styles.tagsContainer}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.tagChip, uploadTags.includes(tag.id) && styles.tagChipSelected]}
                    onPress={() => {
                      if (uploadTags.includes(tag.id)) {
                        setUploadTags(uploadTags.filter(t => t !== tag.id));
                      } else {
                        setUploadTags([...uploadTags, tag.id]);
                      }
                    }}
                  >
                    <Text style={[styles.tagChipText, uploadTags.includes(tag.id) && styles.tagChipTextSelected]}>
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {tags.length === 0 && (
                  <Text style={styles.noDataText}>
                    {isVi ? 'Không có nhãn nào' : 'No tags available'}
                  </Text>
                )}
              </View>

              <Text style={styles.label}>
                {isVi ? 'Quyền truy cập' : 'Access'}
              </Text>
              <TouchableOpacity
                style={styles.select}
                onPress={() => setShowVisibilityPicker(true)}
              >
                <Text style={styles.selectText}>
                  {getVisibilityLabel(uploadVisibility)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>

              {/* Departments - shown when visibility requires it */}
              {(uploadVisibility === 'SPECIFIC_DEPARTMENTS' || uploadVisibility === 'SPECIFIC_DEPARTMENTS_AND_ROLES') && (
                <>
                  <Text style={styles.label}>
                    {isVi ? 'Phòng ban được truy cập' : 'Accessible Departments'}
                  </Text>
                  <View style={styles.tagsContainer}>
                    {departments.map(dept => (
                      <TouchableOpacity
                        key={dept.id}
                        style={[styles.tagChip, uploadDepartments.includes(dept.id) && styles.tagChipSelected]}
                        onPress={() => {
                          if (uploadDepartments.includes(dept.id)) {
                            setUploadDepartments(uploadDepartments.filter(d => d !== dept.id));
                          } else {
                            setUploadDepartments([...uploadDepartments, dept.id]);
                          }
                        }}
                      >
                        <Text style={[styles.tagChipText, uploadDepartments.includes(dept.id) && styles.tagChipTextSelected]}>
                          {dept.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {departments.length === 0 && (
                      <Text style={styles.noDataText}>
                        {isVi ? 'Không có phòng ban nào' : 'No departments available'}
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Roles - shown when visibility requires it */}
              {(uploadVisibility === 'SPECIFIC_ROLES' || uploadVisibility === 'SPECIFIC_DEPARTMENTS_AND_ROLES') && (
                <>
                  <Text style={styles.label}>
                    {isVi ? 'Vai trò được truy cập' : 'Accessible Roles'}
                  </Text>
                  <View style={styles.tagsContainer}>
                    {roles.map(role => (
                      <TouchableOpacity
                        key={role.id}
                        style={[styles.tagChip, uploadRoles.includes(role.id) && styles.tagChipSelected]}
                        onPress={() => {
                          if (uploadRoles.includes(role.id)) {
                            setUploadRoles(uploadRoles.filter(r => r !== role.id));
                          } else {
                            setUploadRoles([...uploadRoles, role.id]);
                          }
                        }}
                      >
                        <Text style={[styles.tagChipText, uploadRoles.includes(role.id) && styles.tagChipTextSelected]}>
                          {role.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {roles.length === 0 && (
                      <Text style={styles.noDataText}>
                        {isVi ? 'Không có vai trò nào' : 'No roles available'}
                      </Text>
                    )}
                  </View>
                </>
              )}

              {/* Minimum Role Level */}
              <Text style={styles.label}>
                {isVi ? 'Cấp độ vai trò tối thiểu' : 'Minimum Role Level'}
              </Text>
              <TouchableOpacity
                style={styles.select}
                onPress={() => setShowRoleLevelPicker(true)}
              >
                <Text style={styles.selectText}>
                  {uploadMinRoleLevel === 1 ? (isVi ? '1 - Giám đốc' : '1 - Executive') :
                   uploadMinRoleLevel === 2 ? (isVi ? '2 - Trưởng phòng' : '2 - Manager') :
                   uploadMinRoleLevel === 3 ? (isVi ? '3 - Senior' : '3 - Senior') :
                   uploadMinRoleLevel === 4 ? (isVi ? '4 - Nhân viên' : '4 - Employee') :
                   (isVi ? '5 - Thực tập' : '5 - Intern')}
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

        {/* Download History Modal */}
        <Modal
          visible={showHistoryModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowHistoryModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isVi ? 'File đã tải' : 'Downloaded Files'}
              </Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {downloadHistory.length === 0 ? (
                <View style={styles.centerContainer}>
                  <Ionicons name="folder-open-outline" size={64} color="#d1d5db" />
                  <Text style={styles.loadingText}>
                    {isVi ? 'Chưa có file nào được tải' : 'No files downloaded'}
                  </Text>
                </View>
              ) : (
                downloadHistory.map((item) => (
                  <View key={item.id} style={styles.historyItemContainer}>
                    <TouchableOpacity
                      style={styles.historyModalItem}
                      onPress={() => {
                        // Xem trực tiếp file text
                        if (isTextFile(item.filename)) {
                          handlePreviewFromUri(item.uri);
                        } else {
                          // Tải lại file để xem (share)
                          handleDownload({ id: item.id, originalFileName: item.filename });
                        }
                      }}
                    >
                      <View style={styles.historyModalItemIcon}>
                        <Ionicons 
                          name={isTextFile(item.filename) ? "document-text" : "download-outline"} 
                          size={20} 
                          color={isTextFile(item.filename) ? "#10b981" : "#6b7280"} 
                        />
                      </View>
                      <View style={styles.historyModalItemInfo}>
                        <Text style={styles.historyModalItemName} numberOfLines={1}>
                          {item.filename}
                        </Text>
                        <Text style={styles.historyModalItemTime}>
                          {new Date(item.downloadedAt).toLocaleString(isVi ? 'vi-VN' : 'en-US')}
                        </Text>
                      </View>
                      {isTextFile(item.filename) && (
                        <View style={styles.eyeIcon}>
                          <Ionicons name="eye" size={18} color="#10b981" />
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* Preview Modal */}
        <Modal
          visible={showPreviewModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowPreviewModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isVi ? 'Nội dung file' : 'File Content'}
              </Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.previewContent}>
              {previewLoading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color="#10b981" />
                  <Text style={styles.loadingText}>
                    {isVi ? 'Đang tải...' : 'Loading...'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.previewText}>{previewContent}</Text>
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* Category Picker Modal */}
        <Modal
          visible={showCategoryPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isVi ? 'Chọn danh mục' : 'Select Category'}
              </Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    uploadCategory === item.id && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setUploadCategory(item.id);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    uploadCategory === item.id && styles.pickerItemTextSelected
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={styles.pickerItemSubtext}>{item.code}</Text>
                  {uploadCategory === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.centerContainer}>
                  <Text style={styles.loadingText}>
                    {isVi ? 'Không có danh mục nào' : 'No categories available'}
                  </Text>
                </View>
              }
            />
          </View>
        </Modal>

        {/* Role Level Picker Modal */}
        <Modal
          visible={showRoleLevelPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowRoleLevelPicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isVi ? 'Chọn cấp độ vai trò' : 'Select Role Level'}
              </Text>
              <TouchableOpacity onPress={() => setShowRoleLevelPicker(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[
                { value: 1, label: isVi ? '1 - Giám đốc' : '1 - Executive', desc: isVi ? 'CEO, Giám đốc' : 'CEO, Director' },
                { value: 2, label: isVi ? '2 - Trưởng phòng' : '2 - Manager', desc: isVi ? 'Quản lý cấp cao' : 'Senior Manager' },
                { value: 3, label: isVi ? '3 - Senior' : '3 - Senior', desc: isVi ? 'Team Lead, Senior' : 'Team Lead, Senior' },
                { value: 4, label: isVi ? '4 - Nhân viên' : '4 - Employee', desc: isVi ? 'Nhân viên' : 'Employee' },
                { value: 5, label: isVi ? '5 - Thực tập' : '5 - Intern', desc: isVi ? 'Thực tập sinh' : 'Intern' },
              ]}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    uploadMinRoleLevel === item.value && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setUploadMinRoleLevel(item.value);
                    setShowRoleLevelPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    uploadMinRoleLevel === item.value && styles.pickerItemTextSelected
                  ]}>
                    {item.label}
                  </Text>
                  <Text style={styles.pickerItemSubtext}>{item.desc}</Text>
                  {uploadMinRoleLevel === item.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </Modal>

        {/* Visibility Picker Modal */}
        <Modal
          visible={showVisibilityPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowVisibilityPicker(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isVi ? 'Chọn quyền truy cập' : 'Select Access'}
              </Text>
              <TouchableOpacity onPress={() => setShowVisibilityPicker(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[
                { value: 'COMPANY_WIDE', label: VISIBILITY_LABELS_VI.COMPANY_WIDE, desc: isVi ? 'Tất cả nhân viên đều có thể xem' : 'All employees can view' },
                { value: 'SPECIFIC_DEPARTMENTS', label: VISIBILITY_LABELS_VI.SPECIFIC_DEPARTMENTS, desc: isVi ? 'Chỉ phòng ban được chọn' : 'Only selected departments' },
                { value: 'SPECIFIC_ROLES', label: VISIBILITY_LABELS_VI.SPECIFIC_ROLES, desc: isVi ? 'Chỉ vai trò được chọn' : 'Only selected roles' },
                { value: 'SPECIFIC_DEPARTMENTS_AND_ROLES', label: VISIBILITY_LABELS_VI.SPECIFIC_DEPARTMENTS_AND_ROLES, desc: isVi ? 'Phòng ban VÀ vai trò' : 'Departments AND roles' },
              ]}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    uploadVisibility === item.value && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setUploadVisibility(item.value);
                    setShowVisibilityPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    uploadVisibility === item.value && styles.pickerItemTextSelected
                  ]}>
                    {item.label}
                  </Text>
                  <Text style={styles.pickerItemSubtext}>{item.desc}</Text>
                  {uploadVisibility === item.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
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
  // History modal styles
  historyFab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  historyItemContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  historyModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  historyModalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyModalItemInfo: {
    flex: 1,
  },
  historyModalItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  historyModalItemTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  eyeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b98120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  previewText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  // Tags styles
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tagChipSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  tagChipText: {
    fontSize: 13,
    color: '#374151',
  },
  tagChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  // Picker modal styles
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  pickerItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  pickerItemText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  pickerItemTextSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
  pickerItemSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginLeft: 20,
  },
});
