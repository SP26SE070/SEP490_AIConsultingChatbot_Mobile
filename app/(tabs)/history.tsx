import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getConversations } from '../../lib/api/chatbot';
import { setPendingConversation } from '../../lib/navigation-store';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { useResponsive } from '../../lib/useResponsive';

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
  const { gap, sz, fs } = useResponsive();

  // Responsive dimensions
  const listPadding = sz(16);
  const centeredPadding = sz(24);
  const errorCardPadding = sz(28);
  const errorCardRadius = sz(20);
  const errorIconSize = sz(48);
  const errorIconRadius = sz(24);
  const retryBtnPaddingH = sz(20);
  const retryBtnPaddingV = sz(12);
  const retryBtnRadius = sz(12);
  const emptyPaddingV = sz(60);
  const emptyIconSize = sz(80);
  const emptyIconRadius = sz(40);
  const emptyTitleSize = fs(18);
  const emptyTextSize = fs(14);
  const emptyTextLineHeight = fs(22);
  const emptyCardPadding = sz(20);
  const convCardPadding = sz(16);
  const convCardRadius = sz(16);
  const convItemIconSize = sz(22);
  const convIconWrapSize = sz(44);
  const convIconWrapRadius = sz(12);
  const convTitleSize = fs(15);
  const convMetaGap = sz(6);
  const convDateSize = fs(12);
  
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
          <View style={[styles.loadingWrapper, { gap: gap(16) }]}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={[styles.loadingText, { fontSize: fs(15) }]}>{t.loading}</Text>
          </View>
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <View style={[styles.errorCard, { padding: errorCardPadding, borderRadius: errorCardRadius }]}>
            <Ionicons name="alert-circle-outline" size={errorIconSize} color="#f87171" />
            <Text style={[styles.errorText, { fontSize: fs(15) }]}>{error}</Text>
            <TouchableOpacity style={[styles.retryButton, { paddingHorizontal: retryBtnPaddingH, paddingVertical: retryBtnPaddingV, borderRadius: retryBtnRadius }]} onPress={loadConversations}>
              <Ionicons name="refresh" size={sz(18)} color="#fff" />
              <Text style={[styles.retryText, { fontSize: fs(15) }]}>{t.retry}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={conversations}
          keyExtractor={(item, index) => item.conversationId ?? index.toString()}
          contentContainerStyle={[styles.list, { padding: listPadding, gap: gap(12) }]}
          ListEmptyComponent={
            <View style={styles.centered}>
              <View style={[styles.emptyCard, { padding: emptyCardPadding }]}>
                <View style={[styles.emptyIconWrap, { width: emptyIconSize, height: emptyIconSize, borderRadius: emptyIconRadius }]}>
                  <Ionicons name="chatbubbles-outline" size={sz(44)} color="#10b981" />
                </View>
                <Text style={[styles.emptyTitle, { fontSize: emptyTitleSize }]}>{t.noHistory}</Text>
                <Text style={[styles.emptyText, { fontSize: emptyTextSize, lineHeight: emptyTextLineHeight, paddingHorizontal: sz(20) }]}>
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
                style={[styles.conversationItem, { padding: convCardPadding, borderRadius: convCardRadius }]}
                onPress={() => {
                  setPendingConversation(item.conversationId);
                  router.push('/chatbot');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.itemIcon, { width: convIconWrapSize, height: convIconWrapSize, borderRadius: convIconWrapRadius }]}>
                  <Ionicons name="chatbox-ellipses" size={convIconWrapSize} color="#10b981" />
                </View>
                <View style={[styles.itemContent, { marginLeft: sz(12) }]}>
                  <Text style={[styles.conversationTitle, { fontSize: convTitleSize, marginBottom: sz(4) }]} numberOfLines={1}>
                    {item.title || (language === 'vi' ? 'Cuộc trò chuyện' : 'Conversation')}
                  </Text>
                  <View style={[styles.itemMeta, { gap: convMetaGap }]}>
                    <Ionicons name="time-outline" size={sz(12)} color="#64748b" />
                    <Text style={[styles.conversationDate, { fontSize: convDateSize }]}>
                      {formatDate(item.lastMessageAt || item.startedAt)}
                    </Text>
                    {item.totalMessages !== undefined && (
                      <>
                        <View style={[styles.dot, { marginHorizontal: sz(6) }]} />
                        <Text style={[styles.messageCount, { fontSize: fs(12) }]}>
                          {item.totalMessages} {language === 'vi' ? 'tin nhắn' : 'messages'}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={sz(20)} color="#475569" />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingWrapper: { alignItems: 'center' },
  loadingText: { color: '#94a3b8' },
  errorCard: { alignItems: 'center', gap: 16, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  errorText: { color: '#f87171', textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center' },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyCard: { alignItems: 'center', gap: 12 },
  emptyIconWrap: { backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.3)' },
  emptyTitle: { color: '#f1f5f9', fontWeight: '700' },
  emptyText: { color: '#94a3b8', textAlign: 'center' },
  list: { flexGrow: 1 },
  conversationItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b' },
  itemIcon: { alignItems: 'center', justifyContent: 'center' },
  itemContent: { flex: 1 },
  conversationTitle: { color: '#f1f5f9', fontWeight: '600' },
  itemMeta: { flexDirection: 'row', alignItems: 'center' },
  conversationDate: { color: '#64748b' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#475569' },
  messageCount: { color: '#64748b' },
});
