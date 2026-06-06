import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, TextInput, RefreshControl, ScrollView, Pressable
} from 'react-native';
import * as documentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { getAccessToken, getUserPermissions, getUserRoles, refreshUser } from '../../lib/auth-store';
import { KNOWLEDGE_BASE, CATEGORIES_BASE, TAGS_BASE, API_BASE_URL } from '../../lib/api/config';
import { useNotification } from '../../lib/notification';
import { PickerModal } from '../../components/ui/CustomModal';
import { useResponsive } from '../../lib/useResponsive';

const API_TIMEOUT = 15000;

// Document interface
interface Document {
  id: string;
  documentTitle?: string;
  originalFileName?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
  embeddingStatus?: string;
  visibility?: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  category?: string;
  description?: string;
  chunkCount?: number;
  categoryId?: string;
  tagIds?: string[];
}

// Category interface
interface DocumentCategoryResponse {
  id: string;
  tenantId?: string;
  parentId: string | null;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  children?: DocumentCategoryResponse[];
}

// Tag interface
interface DocumentTagResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  usageCount?: number;
}

type TabType = 'documents' | 'categories' | 'tags';

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

async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetchWithTimeout(url, { ...options, headers });
  if (res.status === 401) {
    showError('Vui lòng đăng nhập lại.', 'Phiên đã hết hạn');
    throw new Error('Unauthorized');
  }
  return res;
}

export default function DocumentsScreen() {
  const { width, sz, fs, gap } = useResponsive();
  const { language } = useLanguageStore();
  const t = translations[language];
  const isVi = language === 'vi';
  const { showToast, showConfirm, showSuccess, showError, showInfo } = useNotification();
  const API_BASE = `${API_BASE_URL}/api/v1`;

  // Responsive values
  const isSmall = width < 375;

  // Permission guard — only for non-admin
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    getUserRoles().then(roles => {
      if (roles.includes('ROLE_TENANT_ADMIN') || roles.includes('ROLE_SUPER_ADMIN')) {
        setHasAccess(true);
      } else {
        refreshUser().then(() => getUserPermissions()).then(perms => {
          setHasAccess(perms.includes('DOCUMENT_READ'));
        });
      }
    });
  }, []);

  // Tab bar
  const tabBarPaddingV = isSmall ? sz(4) : sz(8);
  const tabIconSize = sz(20);
  const tabLabelSize = fs(12);
  const tabItemPaddingV = isSmall ? sz(8) : sz(10);

  // Search
  const searchPadding = sz(16);
  const searchInputPaddingH = isSmall ? sz(10) : sz(14);
  const searchInputPaddingV = isSmall ? sz(8) : sz(10);
  const searchIconSize = sz(20);
  const searchInputFontSize = fs(15);
  const filterBtnPadding = isSmall ? sz(8) : sz(10);
  const filterBtnSize = sz(40);

  // List
  const listPadding = sz(16);
  const listGap = sz(10);

  // Doc Card
  const docCardPadding = isSmall ? sz(12) : sz(16);
  const docCardRadius = sz(14);
  const docIconSize = sz(24);
  const docIconWrapSize = isSmall ? sz(40) : sz(44);
  const docIconWrapRadius = isSmall ? sz(10) : sz(10);
  const docTitleSize = fs(15);
  const docMetaSize = fs(12);
  const docInfoGap = sz(12);
  const statusBadgePaddingH = sz(10);
  const statusBadgePaddingV = sz(4);
  const statusBadgeRadius = sz(12);
  const statusTextSize = fs(11);

  // FAB
  const fabSize = isSmall ? sz(48) : sz(56);
  const fabBottom = isSmall ? sz(20) : sz(24);
  const fabRight = isSmall ? sz(20) : sz(16);

  // Modal
  const modalPadding = sz(16);
  const modalHeaderPaddingH = sz(16);
  const modalHeaderPaddingV = sz(16);
  const modalTitleSize = fs(18);
  const modalContentPadding = sz(16);
  const formLabelSize = fs(13);
  const inputPaddingH = isSmall ? sz(12) : sz(14);
  const inputPaddingV = isSmall ? sz(12) : sz(12);
  const inputFontSize = fs(15);
  const filePickerPaddingV = sz(20);
  const filePickerIconSize = sz(32);
  const filePickerTextSize = fs(15);
  const submitBtnPaddingV = sz(14);
  const submitBtnRadius = sz(12);
  const submitBtnTextSize = fs(15);

  // Category
  const catItemPadding = isSmall ? sz(10) : sz(12);
  const catItemRadius = sz(12);
  const catNameSize = fs(14);
  const catCodeSize = fs(11);
  const catActionsGap = sz(4);
  const catActionBtnPadding = sz(6);
  const catTreeMarginLeft = sz(16);

  // Tag
  const tagCardPadding = isSmall ? sz(14) : sz(16);
  const tagCardRadius = sz(14);
  const tagIconSize = sz(20);
  const tagIconWrapSize = isSmall ? sz(40) : sz(40);
  const tagIconWrapRadius = isSmall ? sz(10) : sz(10);
  const tagNameSize = fs(16);
  const tagCodeSize = fs(12);
  const tagFooterPaddingTop = sz(12);
  const tagUsageSize = fs(12);
  const tagActionsGap = sz(4);
  const tagActionBtnPadding = sz(6);
  const tagHeaderGap = sz(12);

  // Empty
  const emptyPaddingV = sz(80);
  const emptyIconSize = sz(64);
  const emptyTextSize = fs(16);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('documents');

  // ========== DOCUMENTS STATE ==========
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Filter state & picker
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const filterOptions = [
    { value: '', label: isVi ? 'Tất cả' : 'All' },
    { value: 'COMPLETED', label: isVi ? 'Đã xử lý' : 'Processed' },
    { value: 'PENDING', label: isVi ? 'Đang chờ' : 'Pending' },
    { value: 'PROCESSING', label: isVi ? 'Đang xử lý' : 'Processing' },
    { value: 'FAILED', label: isVi ? 'Thất bại' : 'Failed' },
  ];
  const [canUpload, setCanUpload] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<{ uri: string; name: string; type: string; size: number } | null>(null);
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [uploadVisibility, setUploadVisibility] = useState<string>('COMPANY_WIDE');
  const [uploading, setUploading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [categories, setCategories] = useState<DocumentCategoryResponse[]>([]);
  const [tags, setTags] = useState<DocumentTagResponse[]>([]);

  // ========== CATEGORIES STATE ==========
  const [catList, setCatList] = useState<DocumentCategoryResponse[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState<DocumentCategoryResponse | null>(null);
  const [catForm, setCatForm] = useState({ name: '', code: '', description: '', parentId: null as string | null });
  const [processing, setProcessing] = useState(false);

  // ========== TAGS STATE ==========
  const [tagList, setTagList] = useState<DocumentTagResponse[]>([]);
  const [tagLoading, setTagLoading] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editTag, setEditTag] = useState<DocumentTagResponse | null>(null);
  const [tagForm, setTagForm] = useState({ name: '', code: '', description: '' });

  // ========== LOAD DATA ==========
  async function loadDocuments() {
    try {
        const token = await getAccessToken();
        try {
          // eslint-disable-next-line no-console
          console.debug('[Documents] loading docs, url=', `${API_BASE}/knowledge/documents`, 'tokenExists=', !!token);
        } catch {}
        const res = await apiRequest(`${API_BASE}/knowledge/documents`);
      if (res.ok) {
        const data = await res.json();
        const docs = data.content || data.data || data || [];
        setDocuments(Array.isArray(docs) ? docs : []);
      }
    } catch (e) {
      console.warn('Load docs error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await apiRequest(`${API_BASE}/knowledge/categories/manage`);
      if (res.ok) {
        const data = await res.json();
        setCatList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Load categories error:', e);
    } finally {
      setCatLoading(false);
    }
  }

  async function loadTags() {
    try {
      const res = await apiRequest(`${API_BASE}/knowledge/tags/manage`);
      if (res.ok) {
        const data = await res.json();
        setTagList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('Load tags error:', e);
    } finally {
      setTagLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await loadDocuments();
        await loadCategories();
        await loadTags();
      })();
    }, [loadDocuments, loadCategories, loadTags])
  );

  // ========== DOCUMENT HANDLERS ==========
  const filteredDocuments = documents.filter(doc => {
    if (filterStatus && doc.embeddingStatus !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const title = (doc.documentTitle || doc.originalFileName || '').toLowerCase();
      return title.includes(query);
    }
    return true;
  });

  async function handleUpload() {
    if (!uploadFile || !uploadTitle.trim()) {
      showError(isVi ? 'Vui lòng chọn file và nhập tiêu đề' : 'Please select file and enter title', isVi ? 'Lỗi' : 'Error');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', uploadTitle.trim());
      formData.append('description', uploadDescription.trim());
      formData.append('visibility', uploadVisibility);
      if (uploadCategory) formData.append('categoryId', uploadCategory);
      uploadTags.forEach(tagId => formData.append('tagIds', tagId));
      formData.append('file', {
        uri: uploadFile.uri,
        name: uploadFile.name,
        type: uploadFile.type,
      } as any);

      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/knowledge/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        showSuccess(isVi ? 'Tải lên thành công' : 'Upload successful', isVi ? 'Thành công' : 'Success');
        setShowUploadModal(false);
        setUploadTitle('');
        setUploadDescription('');
        setUploadFile(null);
        loadDocuments();
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.message || 'Upload failed', isVi ? 'Lỗi' : 'Error');
      }
    } catch (e: any) {
      showError(e.message, isVi ? 'Lỗi' : 'Error');
    } finally {
      setUploading(false);
    }
  }

  async function handlePreview(doc: Document) {
    setSelectedDoc(doc);
    setShowDetailModal(true);
  }

  // ========== CATEGORY HANDLERS ==========
  function buildTree(flat: DocumentCategoryResponse[]): DocumentCategoryResponse[] {
    const byId = new Map<string, DocumentCategoryResponse>();
    for (const cat of flat) byId.set(cat.id, { ...cat, children: [] });
    const roots: DocumentCategoryResponse[] = [];
    for (const cat of byId.values()) {
      if (cat.parentId && byId.has(cat.parentId)) {
        const parent = byId.get(cat.parentId);
        if (parent) parent.children = [...(parent.children || []), cat];
        continue;
      }
      roots.push(cat);
    }
    return roots;
  }

  function openCatModal(category?: DocumentCategoryResponse) {
    if (category) {
      setEditCat(category);
      setCatForm({ name: category.name, code: category.code, description: category.description || '', parentId: category.parentId });
    } else {
      setEditCat(null);
      setCatForm({ name: '', code: '', description: '', parentId: null });
    }
    setShowCatModal(true);
  }

  async function handleSaveCat() {
    if (!catForm.name.trim() || !catForm.code.trim()) return;
    setProcessing(true);
    try {
      const body = {
        name: catForm.name.trim(),
        code: catForm.code.trim().toUpperCase(),
        description: catForm.description.trim() || null,
        parentId: catForm.parentId || null,
      };
      const token = await getAccessToken();
      const url = editCat
        ? `${API_BASE}/knowledge/categories/update/${editCat.id}`
        : `${API_BASE}/knowledge/categories/create`;
      const method = editCat ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowCatModal(false);
        loadCategories();
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.message || 'Failed', isVi ? 'Lỗi' : 'Error');
      }
    } catch (e: any) {
      showError(e.message, isVi ? 'Lỗi' : 'Error');
    } finally {
      setProcessing(false);
    }
  }

  async function handleToggleCat(category: DocumentCategoryResponse) {
    try {
      const token = await getAccessToken();
      const url = `${API_BASE}/knowledge/categories/${category.id}/${category.isActive ? 'deactivate' : 'activate'}`;
      await fetch(url, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      loadCategories();
    } catch (e) {
      showError(isVi ? 'Thao tác thất bại' : 'Operation failed', isVi ? 'Lỗi' : 'Error');
    }
  }

  async function handleDeleteCat(id: string) {
    const confirmed = await showConfirm({
      title: isVi ? 'Xác nhận xóa' : 'Confirm Delete',
      message: isVi ? 'Bạn có chắc muốn xóa danh mục này?' : 'Are you sure you want to delete this category?',
      confirmText: isVi ? 'Xóa' : 'Delete',
      cancelText: isVi ? 'Hủy' : 'Cancel',
      confirmStyle: 'danger',
      icon: 'trash',
      iconColor: '#ef4444',
    });
    if (!confirmed) return;
    try {
      const token = await getAccessToken();
      await fetch(`${API_BASE}/knowledge/categories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadCategories();
    } catch (e) {
      showError(isVi ? 'Xóa thất bại' : 'Delete failed', isVi ? 'Lỗi' : 'Error');
    }
  }

  // ========== TAG HANDLERS ==========
  function openTagModal(tag?: DocumentTagResponse) {
    if (tag) {
      setEditTag(tag);
      setTagForm({ name: tag.name, code: tag.code, description: tag.description || '' });
    } else {
      setEditTag(null);
      setTagForm({ name: '', code: '', description: '' });
    }
    setShowTagModal(true);
  }

  async function handleSaveTag() {
    if (!tagForm.name.trim() || !tagForm.code.trim()) return;
    setProcessing(true);
    try {
      const body = {
        name: tagForm.name.trim(),
        code: tagForm.code.trim().toUpperCase(),
        description: tagForm.description.trim() || null,
      };
      const token = await getAccessToken();
      const url = editTag ? `${API_BASE}/knowledge/tags/${editTag.id}` : `${API_BASE}/knowledge/tags`;
      const method = editTag ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowTagModal(false);
        loadTags();
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.message || 'Failed', isVi ? 'Lỗi' : 'Error');
      }
    } catch (e: any) {
      showError(e.message, isVi ? 'Lỗi' : 'Error');
    } finally {
      setProcessing(false);
    }
  }

  async function handleToggleTag(tag: DocumentTagResponse) {
    try {
      const token = await getAccessToken();
      const url = `${API_BASE}/knowledge/tags/${tag.id}/${tag.isActive ? 'deactivate' : 'activate'}`;
      await fetch(url, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
      loadTags();
    } catch (e) {
      showError(isVi ? 'Thao tác thất bại' : 'Operation failed', isVi ? 'Lỗi' : 'Error');
    }
  }

  async function handleDeleteTag(id: string) {
    const confirmed = await showConfirm({
      title: isVi ? 'Xác nhận xóa' : 'Confirm Delete',
      message: isVi ? 'Bạn có chắc muốn xóa thẻ này?' : 'Are you sure you want to delete this tag?',
      confirmText: isVi ? 'Xóa' : 'Delete',
      cancelText: isVi ? 'Hủy' : 'Cancel',
      confirmStyle: 'danger',
      icon: 'trash',
      iconColor: '#ef4444',
    });
    if (!confirmed) return;
    try {
      const token = await getAccessToken();
      await fetch(`${API_BASE}/knowledge/tags/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      loadTags();
    } catch (e) {
      showError(isVi ? 'Xóa thất bại' : 'Delete failed', isVi ? 'Lỗi' : 'Error');
    }
  }

  // ========== RENDER ==========
  function renderTabBar() {
    const tabs: { key: TabType; icon: string; label: string }[] = [
      { key: 'documents', icon: 'document-text', label: isVi ? 'Tài liệu' : 'Documents' },
      { key: 'categories', icon: 'folder', label: isVi ? 'Danh mục' : 'Categories' },
      { key: 'tags', icon: 'pricetag', label: isVi ? 'Thẻ' : 'Tags' },
    ];
    return (
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={tabIconSize}
              color={activeTab === tab.key ? '#10b981' : '#64748b'}
            />
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderDocumentsTab() {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>{isVi ? 'Đang tải...' : 'Loading...'}</Text>
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        {/* Search & Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={searchIconSize} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={isVi ? 'Tìm kiếm...' : 'Search...'}
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterPicker(true)}>
            <Ionicons name="filter" size={searchIconSize} color={filterStatus ? '#10b981' : '#6b7280'} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredDocuments}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDocuments(); }} colors={['#10b981']} />}
          ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="folder-open-outline" size={emptyIconSize} color="#d1d5db" /><Text style={styles.emptyText}>{isVi ? 'Không có tài liệu' : 'No documents'}</Text></View>}
          renderItem={({ item }) => {
            const status = STATUS_LABELS[item.embeddingStatus || 'PENDING'] || STATUS_LABELS.PENDING;
            return (
              <TouchableOpacity style={styles.docCard} onPress={() => handlePreview(item)} activeOpacity={0.75}>
                <View style={[styles.docIconWrap, { width: docIconWrapSize, height: docIconWrapSize, borderRadius: docIconWrapRadius }]}>
                  <Ionicons name="document-text" size={docIconSize} color="#10b981" />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle} numberOfLines={1}>{item.documentTitle || item.originalFileName}</Text>
                  <Text style={styles.docMeta}>{item.uploadedByName || item.uploadedByEmail || 'Unknown'} · {item.uploadedAt ? new Date(item.uploadedAt).toLocaleDateString() : ''}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{isVi ? status.vi : status.en}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {/* Upload FAB */}
        <TouchableOpacity style={[styles.fab, { bottom: fabBottom, right: fabRight, width: fabSize, height: fabSize, borderRadius: fabSize / 2 }]} onPress={() => setShowUploadModal(true)}>
          <Ionicons name="add" size={sz(28)} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  function renderCategoriesTab() {
    if (catLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      );
    }

    const treeData = buildTree(catList);

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={treeData}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={false} onRefresh={loadCategories} colors={['#10b981']} />}
          ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="folder-open-outline" size={emptyIconSize} color="#10b981" /><Text style={styles.emptyText}>{isVi ? 'Chưa có danh mục' : 'No categories'}</Text></View>}
          renderItem={({ item }) => (
            <CatTreeItem
              category={item}
              isVi={isVi}
              onEdit={openCatModal}
              onToggle={handleToggleCat}
              onDelete={handleDeleteCat}
              depth={0}
            />
          )}
        />
        <TouchableOpacity style={[styles.fab, { bottom: fabBottom, right: fabRight, width: fabSize, height: fabSize, borderRadius: fabSize / 2 }]} onPress={() => openCatModal()}>
          <Ionicons name="add" size={sz(28)} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  function renderTagsTab() {
    if (tagLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={tagList}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={false} onRefresh={loadTags} colors={['#10b981']} />}
          ListEmptyComponent={<View style={styles.emptyContainer}><Ionicons name="pricetag-outline" size={emptyIconSize} color="#10b981" /><Text style={styles.emptyText}>{isVi ? 'Chưa có thẻ' : 'No tags'}</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.tagCard}>
              <View style={[styles.tagHeader, { gap: tagHeaderGap }]}>
                <View style={[styles.tagIconWrap, { width: tagIconWrapSize, height: tagIconWrapSize, borderRadius: tagIconWrapRadius, backgroundColor: item.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.12)' }]}>
                  <Ionicons name="pricetag" size={tagIconSize} color={item.isActive ? '#10b981' : '#94a3b8'} />
                </View>
                <View style={styles.tagInfo}>
                  <Text style={styles.tagName}>{item.name}</Text>
                  <Text style={styles.tagCode}>{item.code}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)' }]}>
                  <Text style={[styles.statusText, { color: item.isActive ? '#22c55e' : '#94a3b8' }]}>
                    {item.isActive ? (isVi ? 'Hoạt động' : 'Active') : (isVi ? 'Tạm ngưng' : 'Inactive')}
                  </Text>
                </View>
              </View>
              <View style={styles.tagFooter}>
                <Text style={styles.tagUsage}>{item.usageCount || 0} {isVi ? 'tài liệu' : 'docs'}</Text>
                <View style={[styles.tagActions, { gap: tagActionsGap }]}>
                  <TouchableOpacity style={styles.tagActionBtn} onPress={() => openTagModal(item)}>
                    <Ionicons name="create-outline" size={sz(18)} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.tagActionBtn} onPress={() => handleToggleTag(item)}>
                    <Ionicons name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={sz(18)} color={item.isActive ? '#f59e0b' : '#22c55e'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.tagActionBtn} onPress={() => handleDeleteTag(item.id)}>
                    <Ionicons name="trash-outline" size={sz(18)} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
        <TouchableOpacity style={[styles.fab, { bottom: fabBottom, right: fabRight, width: fabSize, height: fabSize, borderRadius: fabSize / 2 }]} onPress={() => openTagModal()}>
          <Ionicons name="add" size={sz(28)} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  // Permission denied state
  if (hasAccess === false) {
    return (
      <AppShell title={isVi ? 'Tài liệu' : 'Documents'}>
        <View style={styles.centerContainer}>
          <View style={[styles.errorIcon, { width: sz(80), height: sz(80), borderRadius: sz(40) }]}>
            <Ionicons name="shield-outline" size={sz(40)} color="#f59e0b" />
          </View>
          <Text style={[styles.errorTitle, { fontSize: fs(18) }]}>
            {isVi ? 'Không có quyền truy cập' : 'Access Denied'}
          </Text>
          <Text style={[styles.errorText, { fontSize: fs(14) }]}>
            {isVi
              ? 'Bạn chưa được cấp quyền xem tài liệu. Vui lòng liên hệ quản trị viên.'
              : 'You do not have permission to view documents. Please contact your administrator.'}
          </Text>
          <TouchableOpacity
            style={[styles.uploadBtn, { paddingHorizontal: sz(20), paddingVertical: sz(12), borderRadius: sz(12) }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={sz(18)} color="#fff" />
            <Text style={[styles.uploadBtnText, { fontSize: fs(15) }]}>
              {isVi ? 'Quay lại' : 'Go Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={isVi ? 'Tài liệu' : 'Documents'}>
      {renderTabBar()}
      
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        {activeTab === 'documents' && renderDocumentsTab()}
        {activeTab === 'categories' && renderCategoriesTab()}
        {activeTab === 'tags' && renderTagsTab()}
      </View>

      {/* ========== MODALS ========== */}

      {/* Filter Picker */}
      <PickerModal
        visible={showFilterPicker}
        title={isVi ? 'Lọc theo trạng thái' : 'Filter by status'}
        options={filterOptions}
        selectedValue={filterStatus}
        onSelect={(val) => setFilterStatus(val)}
        onClose={() => setShowFilterPicker(false)}
      />

      {/* Upload Modal */}
      <Modal visible={showUploadModal} animationType="slide" onRequestClose={() => setShowUploadModal(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isVi ? 'Tải lên tài liệu' : 'Upload Document'}</Text>
            <TouchableOpacity onPress={() => setShowUploadModal(false)}><Ionicons name="close" size={sz(24)} color="#f1f5f9" /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text style={styles.formLabel}>{isVi ? 'Tiêu đề *' : 'Title *'}</Text>
            <TextInput style={styles.input} value={uploadTitle} onChangeText={setUploadTitle} placeholder={isVi ? 'Nhập tiêu đề' : 'Enter title'} placeholderTextColor="#64748b" />
            <Text style={styles.formLabel}>{isVi ? 'Mô tả' : 'Description'}</Text>
            <TextInput style={[styles.input, { height: sz(80) }]} value={uploadDescription} onChangeText={setUploadDescription} placeholder={isVi ? 'Mô tả tài liệu' : 'Document description'} placeholderTextColor="#64748b" multiline />
            <TouchableOpacity style={styles.filePickerBtn} onPress={async () => {
              const result = await documentPicker.getDocumentAsync({ type: '*/*' });
              if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                setUploadFile({ uri: asset.uri, name: asset.name || 'file', type: asset.mimeType || 'application/octet-stream', size: asset.size || 0 });
              }
            }}>
              <Ionicons name="folder-open" size={filePickerIconSize} color="#10b981" />
              <Text style={styles.filePickerText}>{uploadFile ? uploadFile.name : (isVi ? 'Chọn file từ thiết bị' : 'Select from device')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, uploading && styles.submitBtnDisabled]} onPress={handleUpload} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="cloud-done" size={sz(20)} color="#fff" /><Text style={styles.submitBtnText}>{isVi ? 'Tải lên' : 'Upload'}</Text></>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal visible={showCatModal} animationType="slide" onRequestClose={() => setShowCatModal(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editCat ? (isVi ? 'Sửa danh mục' : 'Edit Category') : (isVi ? 'Tạo danh mục' : 'Create Category')}</Text>
            <TouchableOpacity onPress={() => setShowCatModal(false)}><Ionicons name="close" size={sz(24)} color="#f1f5f9" /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text style={styles.formLabel}>{isVi ? 'Tên *' : 'Name *'}</Text>
            <TextInput style={styles.input} value={catForm.name} onChangeText={v => setCatForm(p => ({ ...p, name: v }))} placeholder={isVi ? 'VD: Nhân sự' : 'Eg: HR'} placeholderTextColor="#64748b" />
            <Text style={styles.formLabel}>{isVi ? 'Mã *' : 'Code *'}</Text>
            <TextInput style={styles.input} value={catForm.code} onChangeText={v => setCatForm(p => ({ ...p, code: v.toUpperCase() }))} placeholder={isVi ? 'VD: HR' : 'Eg: HR'} placeholderTextColor="#64748b" autoCapitalize="characters" />
            <Text style={styles.formLabel}>{isVi ? 'Mô tả' : 'Description'}</Text>
            <TextInput style={[styles.input, { height: sz(60) }]} value={catForm.description} onChangeText={v => setCatForm(p => ({ ...p, description: v }))} placeholder={isVi ? 'Mô tả' : 'Description'} placeholderTextColor="#64748b" />
            <TouchableOpacity style={[styles.submitBtn, processing && styles.submitBtnDisabled]} onPress={handleSaveCat} disabled={processing}>
              {processing ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={sz(20)} color="#fff" /><Text style={styles.submitBtnText}>{isVi ? 'Lưu' : 'Save'}</Text></>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Tag Modal */}
      <Modal visible={showTagModal} animationType="slide" onRequestClose={() => setShowTagModal(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editTag ? (isVi ? 'Sửa thẻ' : 'Edit Tag') : (isVi ? 'Tạo thẻ' : 'Create Tag')}</Text>
            <TouchableOpacity onPress={() => setShowTagModal(false)}><Ionicons name="close" size={sz(24)} color="#f1f5f9" /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            <Text style={styles.formLabel}>{isVi ? 'Tên *' : 'Name *'}</Text>
            <TextInput style={styles.input} value={tagForm.name} onChangeText={v => setTagForm(p => ({ ...p, name: v }))} placeholder={isVi ? 'VD: Chính sách' : 'Eg: Policy'} placeholderTextColor="#64748b" />
            <Text style={styles.formLabel}>{isVi ? 'Mã *' : 'Code *'}</Text>
            <TextInput style={styles.input} value={tagForm.code} onChangeText={v => setTagForm(p => ({ ...p, code: v.toUpperCase() }))} placeholder={isVi ? 'VD: POLICY' : 'Eg: POLICY'} placeholderTextColor="#64748b" autoCapitalize="characters" />
            <Text style={styles.formLabel}>{isVi ? 'Mô tả' : 'Description'}</Text>
            <TextInput style={[styles.input, { height: sz(60) }]} value={tagForm.description} onChangeText={v => setTagForm(p => ({ ...p, description: v }))} placeholder={isVi ? 'Mô tả' : 'Description'} placeholderTextColor="#64748b" />
            <TouchableOpacity style={[styles.submitBtn, processing && styles.submitBtnDisabled]} onPress={handleSaveTag} disabled={processing}>
              {processing ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={sz(20)} color="#fff" /><Text style={styles.submitBtnText}>{isVi ? 'Lưu' : 'Save'}</Text></>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </AppShell>
  );
}

// ========== HELPER COMPONENTS ==========

function CatTreeItem({
  category, isVi, onEdit, onToggle, onDelete, depth
}: {
  category: DocumentCategoryResponse;
  isVi: boolean;
  onEdit: (c: DocumentCategoryResponse) => void;
  onToggle: (c: DocumentCategoryResponse) => void;
  onDelete: (id: string) => void;
  depth: number;
}) {
  const { sz, fs } = useResponsive();
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  const catItemPadding = sz(12);
  const catItemRadius = sz(12);
  const catNameSize = fs(14);
  const catCodeSize = fs(11);
  const catActionsGap = sz(4);
  const catActionBtnPadding = sz(6);
  const catTreeMarginLeft = sz(16);

  return (
    <View>
      <View style={[styles.catItem, { marginLeft: depth * catTreeMarginLeft }]}>
        <TouchableOpacity style={[styles.catItemLeft, { gap: sz(8) }]} onPress={() => hasChildren && setExpanded(!expanded)}>
          {hasChildren ? <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={sz(18)} color="#64748b" /> : <View style={{ width: sz(18) }} />}
          <Ionicons name="folder" size={sz(20)} color="#10b981" />
          <View style={styles.catInfo}>
            <Text style={styles.catName}>{category.name}</Text>
            <Text style={styles.catCode}>{category.code}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.catActions}>
          <TouchableOpacity style={styles.catActionBtn} onPress={() => onEdit(category)}><Ionicons name="create-outline" size={sz(18)} color="#10b981" /></TouchableOpacity>
          <TouchableOpacity style={styles.catActionBtn} onPress={() => onToggle(category)}><Ionicons name={category.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={sz(18)} color={category.isActive ? '#f59e0b' : '#22c55e'} /></TouchableOpacity>
          <TouchableOpacity style={styles.catActionBtn} onPress={() => onDelete(category.id)}><Ionicons name="trash-outline" size={sz(18)} color="#ef4444" /></TouchableOpacity>
        </View>
      </View>
      {expanded && hasChildren && (category.children ?? []).map(child => (
        <CatTreeItem key={child.id} category={child} isVi={isVi} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} depth={depth + 1} />
      ))}
    </View>
  );
}

// ========== STYLES ==========
const styles = StyleSheet.create({
  // Loading & Empty
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#94a3b8' },
  errorIcon: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: { fontWeight: '700', color: '#f1f5f9', textAlign: 'center' },
  errorText: { color: '#94a3b8', textAlign: 'center', maxWidth: 280 },
  emptyContainer: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#64748b', textAlign: 'center' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  tabLabel: { color: '#64748b', fontWeight: '500', fontSize: 13 },
  tabLabelActive: { color: '#10b981', fontWeight: '600' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: '#f1f5f9', fontSize: 15 },
  filterBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  listContainer: { gap: 10, paddingBottom: 100 },

  // Document Card
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  docIconWrap: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docInfo: { flex: 1, gap: 4 },
  docTitle: { fontWeight: '600', color: '#f1f5f9' },
  docMeta: { color: '#94a3b8', fontSize: 12 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontWeight: '600', fontSize: 11 },

  // FAB
  fab: {
    position: 'absolute',
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },

  // Category Item
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  catItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  catInfo: { flex: 1, marginLeft: 8 },
  catName: { fontWeight: '600', color: '#f1f5f9' },
  catCode: { color: '#64748b', fontSize: 11, marginTop: 2 },
  catActions: { flexDirection: 'row', gap: 2 },
  catActionBtn: { padding: 6, borderRadius: 8 },

  // Tag Card
  tagCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  tagHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  tagIconWrap: { alignItems: 'center', justifyContent: 'center' },
  tagInfo: { flex: 1, marginLeft: 12, gap: 2 },
  tagName: { fontWeight: '600', color: '#f1f5f9' },
  tagCode: { color: '#10b981', fontSize: 11 },
  tagFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tagUsage: { color: '#64748b', fontSize: 12 },
  tagActions: { flexDirection: 'row', gap: 4 },
  tagActionBtn: { padding: 6, borderRadius: 8 },

  // Modal
  modalWrap: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalTitle: { fontWeight: '700', color: '#f1f5f9', fontSize: 18 },
  modalScroll: { flex: 1 },
  modalContent: { gap: 16, padding: 16 },
  formLabel: { color: '#94a3b8', fontWeight: '500', marginBottom: 6, fontSize: 13 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    fontSize: 15,
    color: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filePickerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#334155',
    paddingVertical: 24,
    gap: 10,
  },
  filePickerText: { color: '#64748b', fontSize: 14 },
  formHelpText: { color: '#64748b', fontSize: 12, marginTop: -4 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 14,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
