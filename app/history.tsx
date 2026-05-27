import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getConversations } from '../lib/api/chatbot';
import { setPendingConversation } from '../lib/navigation-store';
import { AppShell } from '../components/layout/AppShell';
import { useLanguageStore, translations } from '../lib/language-store';

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
  const { language } = useLanguageStore();
  const t = translations[language];
  
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
      setError(t.cannotLoadData);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <AppShell title={t.history} subtitle={language === 'vi' ? 'Các cuộc trò chuyện của bạn' : 'Your conversations'}>
      {loading && (
        <View style={styles.centered}>
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>{t.loading}</Text>
          </View>
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadConversations}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryText}>{t.retry}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={conversations}
          keyExtractor={(item, index) => item.conversationId ?? index.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="chatbubbles-outline" size={44} color="#10b981" />
                </View>
                <Text style={styles.emptyTitle}>{t.noHistory}</Text>
                <Text style={styles.emptyText}>
                  {language === 'vi' 
                    ? 'Bắt đầu trò chuyện với AI để xem lịch sử tại đây'
                    : 'Start chatting with AI to see history here'}
                </Text>
              </View>
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
                activeOpacity={0.8}
              >
                <View style={styles.itemIcon}>
                  <Ionicons name="chatbox-ellipses" size={22} color="#10b981" />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.conversationTitle} numberOfLines={1}>
                    {item.title || (language === 'vi' ? 'Cuộc trò chuyện' : 'Conversation')}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Ionicons name="time-outline" size={12} color="#64748b" />
                    <Text style={styles.conversationDate}>
                      {formatDate(item.lastMessageAt || item.startedAt)}
                    </Text>
                    {item.totalMessages !== undefined && (
                      <>
                        <View style={styles.dot} />
                        <Text style={styles.messageCount}>
                          {item.totalMessages} {language === 'vi' ? 'tin nhắn' : 'messages'}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#475569" />
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
  loadingWrapper: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 15,
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
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
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
    fontWeight: '700',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 14,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  conversationTitle: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conversationDate: {
    color: '#64748b',
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#64748b',
  },
  messageCount: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
});
