import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Pressable
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as documentPicker from 'expo-document-picker';
import { getDocuments, getDocumentUrl, uploadDocument } from '../lib/api/documents';
import { isRole } from '../lib/auth-store';
import { AppShell } from '../components/layout/AppShell';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore, translations } from '../lib/language-store';

interface Document {
  id: string;
  documentTitle: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  embeddingStatus: string;
  visibility: string;
}

export default function DocumentsScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canUpload, setCanUpload] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<{ uri: string; name: string; type: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const isStaffOrAdmin = await isRole('ROLE_STAFF') || await isRole('ROLE_TENANT_ADMIN');
      setCanUpload(isStaffOrAdmin);
    })();
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      setLoading(true);
      setError(null);
      const data = await getDocuments();
      const list = Array.isArray(data) ? data : (data.content ?? []);
      setDocuments(list);
    } catch (e: any) {
      setError(t.cannotLoadData);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!uploadFile || !uploadTitle.trim()) return;
    setUploading(true);
    try {
      await uploadDocument(uploadFile, uploadTitle.trim());
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadFile(null);
      Alert.alert(t.success, t.uploadSuccess);
      loadDocuments();
    } catch (e: any) {
      Alert.alert(t.error, e.message || t.uploadError);
    } finally {
      setUploading(false);
    }
  }

  async function pickDocument() {
    try {
      const result = await documentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setUploadFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
        });
      }
    } catch (e) {
      Alert.alert(t.error, t.selectFile);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function isNew(uploadedAt: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(uploadedAt) > sevenDaysAgo;
  }

  function getFileIcon(fileType: string) {
    if (fileType.includes('pdf')) return 'document';
    if (fileType.includes('word') || fileType.includes('doc')) return 'document-text';
    if (fileType.includes('sheet') || fileType.includes('excel')) return 'grid';
    if (fileType.includes('text') || fileType.includes('markdown')) return 'file-tray-stacked';
    return 'attach';
  }

  async function handleOpenDocument(documentId: string) {
    try {
      const url = await getDocumentUrl(documentId);
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      Alert.alert(t.error, t.error);
    }
  }

  return (
    <AppShell
      title={t.documents}
      subtitle={language === 'vi' ? 'Tài liệu nội bộ công ty' : 'Company Internal Documents'}
      headerRight={
        canUpload ? (
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => setShowUploadModal(true)}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          </TouchableOpacity>
        ) : undefined
      }
    >
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>{t.loading}</Text>
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadDocuments}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryText}>{t.retry}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={documents}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="folder-outline" size={44} color="#10b981" />
                </View>
                <Text style={styles.emptyTitle}>{t.noDocuments}</Text>
                <Text style={styles.emptyText}>{t.addDocuments}</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.documentItem}
              onPress={() => handleOpenDocument(item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.fileIconWrap}>
                <Ionicons name={getFileIcon(item.fileType) as any} size={24} color="#10b981" />
              </View>
              <View style={styles.documentInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.documentTitle} numberOfLines={1}>
                    {item.documentTitle || item.originalFileName}
                  </Text>
                  {isNew(item.uploadedAt) && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>{t.new}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.documentMeta}>
                  {formatSize(item.fileSize)} • {formatDate(item.uploadedAt)}
                </Text>
                <View style={styles.statusRow}>
                  <Ionicons 
                    name={item.embeddingStatus === 'COMPLETED' ? "checkmark-circle" : "time-outline"} 
                    size={12} 
                    color={item.embeddingStatus === 'COMPLETED' ? '#22c55e' : '#f59e0b'} 
                  />
                  <Text style={[
                    styles.embeddingStatus,
                    item.embeddingStatus === 'COMPLETED' ? styles.statusCompleted : styles.statusPending
                  ]}>
                    {item.embeddingStatus === 'COMPLETED' 
                      ? (language === 'vi' ? 'Đã xử lý' : 'Processed')
                      : (language === 'vi' ? 'Đang xử lý' : 'Processing')
                    }
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#475569" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modal}>
            <View style={modalStyles.handleBar} />
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>{t.uploadDocument}</Text>
              <Pressable onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </Pressable>
            </View>

            <Text style={modalStyles.label}>{t.documentTitle}</Text>
            <TextInput
              style={modalStyles.input}
              placeholder={language === 'vi' ? 'Nhập tiêu đề...' : 'Enter title...'}
              placeholderTextColor="#64748b"
              value={uploadTitle}
              onChangeText={setUploadTitle}
            />

            <Text style={modalStyles.label}>{language === 'vi' ? 'File (PDF, Word, Text)' : 'File (PDF, Word, Text)'}</Text>
            <TouchableOpacity style={modalStyles.filePicker} onPress={pickDocument}>
              <Ionicons name="document-attach-outline" size={24} color="#10b981" />
              <Text style={modalStyles.filePickerText}>
                {uploadFile ? uploadFile.name : (language === 'vi' ? 'Chọn file...' : 'Select file...')}
              </Text>
            </TouchableOpacity>

            <View style={modalStyles.actions}>
              <TouchableOpacity
                style={[
                  modalStyles.submitBtn, 
                  (!uploadFile || !uploadTitle.trim() || uploading) && modalStyles.submitBtnDisabled
                ]}
                onPress={handleUpload}
                disabled={!uploadFile || !uploadTitle.trim() || uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={modalStyles.submitBtnContent}>
                    <Ionicons name="cloud-upload" size={18} color="#fff" />
                    <Text style={modalStyles.submitBtnText}>{t.upload}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 15,
    marginTop: 12,
  },
  errorCard: {
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#1e293b',
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorText: { 
    color: '#f87171', 
    fontSize: 15, 
    textAlign: 'center' 
  },
  retryButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 12 
  },
  retryText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 15 
  },
  emptyCard: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  emptyTitle: { 
    color: '#f1f5f9', 
    fontSize: 18, 
    fontWeight: '700' 
  },
  emptyText: { 
    color: '#94a3b8', 
    fontSize: 14, 
    textAlign: 'center',
    lineHeight: 22,
  },
  list: { padding: 16, gap: 12 },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 14,
  },
  fileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: { flex: 1, minWidth: 0 },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 6 
  },
  documentTitle: { 
    color: '#f1f5f9', 
    fontSize: 15, 
    fontWeight: '600', 
    flex: 1 
  },
  newBadge: { 
    backgroundColor: '#10b981', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6 
  },
  newBadgeText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  documentMeta: { 
    color: '#64748b', 
    fontSize: 12, 
    marginBottom: 6 
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  embeddingStatus: { fontSize: 12 },
  statusCompleted: { color: '#22c55e' },
  statusPending: { color: '#f59e0b' },
  uploadBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f1f5f9',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    padding: 18,
  },
  filePickerText: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 14,
  },
  actions: {
    marginTop: 24,
  },
  submitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
