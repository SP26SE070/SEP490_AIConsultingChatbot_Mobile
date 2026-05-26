import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal, TextInput, Pressable
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as documentPicker from 'expo-document-picker';
import { getDocuments, getDocumentUrl, uploadDocument } from '../lib/api/documents';
import { isRole } from '../lib/auth-store';
import { COLORS } from '../lib/theme';
import { AppShell } from '../components/layout/AppShell';
import { Ionicons } from '@expo/vector-icons';

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

const ACCEPTED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'];

export default function DocumentsScreen() {
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
      setError('Không thể tải danh sách tài liệu');
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
      Alert.alert('Thành công', 'Tài liệu đã được tải lên thành công!');
      loadDocuments();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tải lên tài liệu');
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
      Alert.alert('Lỗi', 'Không thể chọn file');
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
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
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('doc')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('text')) return '📃';
    return '📎';
  }

  async function handleOpenDocument(documentId: string) {
    try {
      const url = await getDocumentUrl(documentId);
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể mở tài liệu. Vui lòng thử lại.');
    }
  }

  return (
    <AppShell
      title="Tài liệu"
      subtitle="Tài liệu nội bộ công ty"
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
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDocuments}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={documents}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Chưa có tài liệu nào</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.documentItem}
              onPress={() => handleOpenDocument(item.id)}
            >
              <View style={styles.documentRow}>
                <Text style={styles.fileIcon}>{getFileIcon(item.fileType)}</Text>
                <View style={styles.documentInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.documentTitle} numberOfLines={1}>
                      {item.documentTitle || item.originalFileName}
                    </Text>
                    {isNew(item.uploadedAt) && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>MỚI</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.documentMeta}>
                    {formatSize(item.fileSize)} • {formatDate(item.uploadedAt)}
                  </Text>
                  <Text style={[
                    styles.embeddingStatus,
                    item.embeddingStatus === 'COMPLETED' ? styles.statusCompleted : styles.statusPending
                  ]}>
                    {item.embeddingStatus === 'COMPLETED' ? '✅ Đã xử lý' : '⏳ Đang xử lý'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textDim} />
              </View>
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
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>Tải lên tài liệu</Text>
              <Pressable onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </Pressable>
            </View>

            <Text style={modalStyles.label}>Tiêu đề tài liệu</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Nhập tiêu đề..."
              placeholderTextColor={COLORS.textDim}
              value={uploadTitle}
              onChangeText={setUploadTitle}
            />

            <Text style={modalStyles.label}>File (PDF, Word, Text)</Text>
            <TouchableOpacity style={modalStyles.filePicker} onPress={pickDocument}>
              <Ionicons name="document-attach-outline" size={24} color={COLORS.accent} />
              <Text style={modalStyles.filePickerText}>
                {uploadFile ? uploadFile.name : 'Chọn file...'}
              </Text>
            </TouchableOpacity>

            <View style={modalStyles.actions}>
              <TouchableOpacity
                style={[modalStyles.submitBtn, (!uploadFile || !uploadTitle.trim() || uploading) && modalStyles.submitBtnDisabled]}
                onPress={handleUpload}
                disabled={!uploadFile || !uploadTitle.trim() || uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={modalStyles.submitBtnText}>Tải lên</Text>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: COLORS.danger, fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { color: COLORS.textMuted, fontSize: 15, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  documentItem: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  documentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fileIcon: { fontSize: 28 },
  documentInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  documentTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 },
  newBadge: { backgroundColor: COLORS.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  documentMeta: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  embeddingStatus: { fontSize: 12 },
  statusCompleted: { color: COLORS.accent },
  statusPending: { color: '#f59e0b' },
  uploadBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  label: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    padding: 16,
  },
  filePickerText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  actions: {
    marginTop: 24,
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.surfaceLight,
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
