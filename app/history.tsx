import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView
} from 'react-native';
import { router } from 'expo-router';
import { getConversations } from '../lib/api/chatbot';

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt?: string;
  totalMessages?: number;
}

export default function HistoryScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setLoading(true);
      setError(null);
      const data = await getConversations();
      const list = Array.isArray(data) ? data : (data.content ?? []);
      setConversations(list);
    } catch (e: any) {
      setError('Không thể tải lịch sử trò chuyện');
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
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử trò chuyện</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={loadConversations}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={conversations}
          keyExtractor={(item, index) => item.id ?? index.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationItem}
              onPress={() => router.push({
                pathname: '/chatbot',
                params: { conversationId: item.id }
              })}
            >
              <Text style={styles.conversationTitle} numberOfLines={1}>
                {item.title || 'Cuộc trò chuyện'}
              </Text>
              <Text style={styles.conversationDate}>
                {formatDate(item.lastMessageAt || item.createdAt)}
              </Text>
              {item.totalMessages !== undefined && (
                <Text style={styles.messageCount}>
                  {item.totalMessages} tin nhắn
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  backText: {
    color: '#22c55e',
    fontSize: 14,
    width: 80,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  conversationItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  conversationTitle: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  conversationDate: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  messageCount: {
    color: '#22c55e',
    fontSize: 12,
  },
});