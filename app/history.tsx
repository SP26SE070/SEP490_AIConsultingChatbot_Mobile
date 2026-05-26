import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { getConversations } from '../lib/api/chatbot';
import { setPendingConversation } from '../lib/navigation-store';
import { COLORS } from '../lib/theme';
import { AppShell } from '../components/layout/AppShell';

interface Conversation {
  conversationId: string;
  id?: string;
  title: string;
  status: string;
  startedAt: string;
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
    <AppShell title="Lịch sử" subtitle="Các cuộc trò chuyện trước đây">
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
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
          keyExtractor={(item, index) => item.conversationId ?? index.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
            </View>
          }
          renderItem={({ item }) => {
            return (
            <TouchableOpacity
              style={styles.conversationItem}
              onPress={() => {
                setPendingConversation(item.conversationId);
                router.push('/chatbot');
              }}
            >
              <Text style={styles.conversationTitle} numberOfLines={1}>
                {item.title || 'Cuộc trò chuyện'}
              </Text>
              <Text style={styles.conversationDate}>
                {formatDate(item.lastMessageAt || item.startedAt)}
              </Text>
              {item.totalMessages !== undefined && (
                <Text style={styles.messageCount}>
                  {item.totalMessages} tin nhắn
                </Text>
              )}
            </TouchableOpacity>
            );
          }}
        />
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  conversationItem: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  conversationTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  conversationDate: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  messageCount: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
  },
});