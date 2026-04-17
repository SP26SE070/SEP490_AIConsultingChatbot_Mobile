import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { getDocuments, getDocumentUrl } from '../lib/api/documents';

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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tài liệu</Text>
        <View style={{ width: 80 }} />
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
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
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9' },
  backText: { color: '#22c55e', fontSize: 14, width: 80 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#ef4444', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#22c55e', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { color: '#64748b', fontSize: 15, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  documentItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  documentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fileIcon: { fontSize: 28 },
  documentInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  documentTitle: { color: '#f1f5f9', fontSize: 14, fontWeight: '600', flex: 1 },
  newBadge: { backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  documentMeta: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  embeddingStatus: { fontSize: 12 },
  statusCompleted: { color: '#22c55e' },
  statusPending: { color: '#f59e0b' },
});
