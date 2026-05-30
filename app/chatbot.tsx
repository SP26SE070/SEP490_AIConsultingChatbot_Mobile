import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from 'expo-router';
import { sendMessage, getConversationHistory, rateMessage } from '../lib/api/chatbot';
import { getPendingConversation, consumeNewChatRequest } from '../lib/navigation-store';
import { useNotification } from '../lib/notification';
import { saveChatSession, loadChatSession, clearChatSession } from '../lib/chat-session-store';
import { COLORS } from '../lib/theme';
import { AppShell } from '../components/layout/AppShell';
import { useLanguageStore, translations } from '../lib/language-store';
import { TAGS_BASE } from '../lib/api/config';
import { getAccessToken } from '../lib/auth-store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSourceDocument[];
  rating?: 'helpful' | 'not-helpful' | null;
  responseTimeMs?: number;
}

interface ChatSourceDocument {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  similarityScore: number;
  snippet: string;
}

export default function ChatbotScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const isVi = language === 'vi';
  const navigation = useNavigation();
  const { showConfirm } = useNotification();
  
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Tag filter state
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);

  const QUICK_PROMPTS = [
    language === 'vi' ? 'Chính sách nghỉ phép' : 'Leave policy',
    language === 'vi' ? 'Quy trình onboard' : 'Onboarding process',
    language === 'vi' ? 'Hỗ trợ IT' : 'IT Support',
  ];

  // Load tags on mount
  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    setLoadingTags(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${TAGS_BASE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const activeTags = (data.content || data || []).filter((tag: any) => tag.isActive !== false);
        setTags(activeTags);
      }
    } catch (e) {
      console.warn('Failed to load tags:', e);
    } finally {
      setLoadingTags(false);
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  }

  function clearTags() {
    setSelectedTagIds([]);
  }

  // Load saved session on mount
  useEffect(() => {
    const loadSavedSession = async () => {
      const savedSession = await loadChatSession();
      if (savedSession && savedSession.messages.length > 0) {
        setMessages(savedSession.messages);
        setConversationId(savedSession.conversationId);
      }
    };
    loadSavedSession();
  }, []);

  // Save session when messages change (debounced)
  useEffect(() => {
    if (messages.length > 0 && !historyLoading) {
      saveChatSession({ conversationId, messages, lastUpdated: Date.now() });
    }
  }, [messages, conversationId, historyLoading]);

  useFocusEffect(
    useCallback(() => {
      if (consumeNewChatRequest()) {
        // Start new conversation - clear session
        setConversationId(undefined);
        setMessages([]);
        return;
      }
      const convId = getPendingConversation();
      if (convId && convId !== conversationId) {
        setConversationId(convId);
        setMessages([]);
        loadConversationHistory(convId);
      }
      // If no pending conversation, restore saved session
      // (This is handled in the useEffect above)
    }, [conversationId])
  );

  async function loadConversationHistory(convId: string) {
    try {
      setHistoryLoading(true);
      const data = await getConversationHistory(convId);
      if (data.messages && Array.isArray(data.messages)) {
        const loadedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id || msg.messageId || Date.now().toString(),
          role: msg.role === 'USER' ? 'user' : 'assistant',
          content: msg.content,
        }));
        setMessages(loadedMessages);
        setConversationId(convId);
        // Save loaded session
        await saveChatSession({ conversationId: convId, messages: loadedMessages, lastUpdated: Date.now() });
      }
    } catch (e: any) {
      console.warn('Failed to load conversation history:', e);
      if (e?.status === 401) {
        setMessages([{
          id: 'auth-error',
          role: 'assistant',
          content: t.sessionExpired,
        }]);
      }
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setInput('');
    setSending(true);

    if (text) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }

    try {
      const result = await sendMessage({ message: content, conversationId, tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined });
      if (result.conversationId && !conversationId) {
        setConversationId(result.conversationId);
      }
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessage.id
            ? {
                ...msg,
                content: result.answer,
                sources: result.sources,
                responseTimeMs: result.responseTimeMs,
              }
            : msg
        )
      );
    } catch (e: any) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessage.id
            ? { ...msg, content: t.error + ': ' + (e.message || 'Unknown error') }
            : msg
        )
      );
    } finally {
      setSending(false);
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }

  async function startNewChat() {
    const confirmed = await showConfirm({
      title: language === 'vi' ? 'Cuộc trò chuyện mới?' : 'Start New Chat?',
      message: language === 'vi'
        ? 'Bạn có muốn bắt đầu một cuộc trò chuyện mới? Lịch sử hiện tại sẽ được giữ lại.'
        : 'Start a new conversation? Current history will be preserved.',
      confirmText: language === 'vi' ? 'Cuộc trò chuyện mới' : 'New Chat',
      cancelText: language === 'vi' ? 'Hủy' : 'Cancel',
      confirmStyle: 'primary',
      icon: 'chatbubbles',
      iconColor: '#10b981',
    });
    if (!confirmed) return;
    await clearChatSession();
    setConversationId(undefined);
    setMessages([]);
  }

  async function handleRate(messageId: string, rating: 'helpful' | 'not-helpful') {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, rating } : msg
      )
    );
    try {
      await rateMessage(messageId, rating);
    } catch (e) {
      console.warn('Rating failed:', e);
    }
  }

  const canSend = input.trim().length > 0 && !sending;

  return (
    <AppShell 
      title={t.chat} 
      subtitle={language === 'vi' ? 'Hỏi về chính sách, HR, IT...' : 'Ask about policies, HR, IT...'}
      headerRight={
        <TouchableOpacity
          style={styles.newChatBtn}
          onPress={startNewChat}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={22} color="#10b981" />
          <Text style={styles.newChatBtnText}>
            {language === 'vi' ? 'Mới' : 'New'}
          </Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.chatBody}>
        <View style={styles.messagesWrapper}>
          {historyLoading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.centerLoaderText}>{t.loading}</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              style={styles.messageList}
              contentContainerStyle={[
                styles.messageListContent,
                messages.length === 0 && styles.messageListEmpty,
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="chatbubbles" size={40} color="#10b981" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {language === 'vi' ? 'Xin chào!' : 'Hello!'}
                  </Text>
                  <Text style={styles.emptyText}>{t.askAnything}</Text>
                  <View style={styles.promptRow}>
                    {QUICK_PROMPTS.map(prompt => (
                      <TouchableOpacity
                        key={prompt}
                        style={styles.promptChip}
                        onPress={() => handleSend(prompt)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.promptChipText}>{prompt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.messageRow,
                    item.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  {item.role === 'assistant' && (
                    <View style={styles.avatar}>
                      <Ionicons name="sparkles" size={14} color="#10b981" />
                    </View>
                  )}
                  <View style={styles.messageColumn}>
                    <View
                      style={[
                        styles.messageBubble,
                        item.role === 'user' ? styles.userBubble : styles.assistantBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          item.role === 'user' ? styles.userText : styles.assistantText,
                        ]}
                      >
                        {item.content}
                      </Text>
                    </View>

                    {/* RAG Sources */}
                    {item.role === 'assistant' && item.sources && item.sources.length > 0 && (
                      <View style={styles.sourcesSection}>
                        <View style={styles.sourcesTitleRow}>
                          <Ionicons name="library-outline" size={12} color="#64748b" />
                          <Text style={styles.sourcesTitle}> {t.sources}</Text>
                        </View>
                        {item.sources.slice(0, 3).map((source, idx) => (
                          <View key={idx} style={styles.sourceItem}>
                            <View style={styles.sourceTitleRow}>
                              <Ionicons name="document-text-outline" size={12} color="#10b981" />
                              <Text style={styles.sourceTitle} numberOfLines={1}>
                                {source.documentTitle}
                              </Text>
                            </View>
                            <Text style={styles.sourceSnippet} numberOfLines={2}>
                              {source.snippet}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Response time */}
                    {item.role === 'assistant' && item.responseTimeMs && (
                      <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={10} color="#64748b" />
                        <Text style={styles.responseTime}>
                          {t.responseTime}: {item.responseTimeMs}{t.ms}
                        </Text>
                      </View>
                    )}

                    {/* Rating */}
                    {item.role === 'assistant' && item.id && (
                      <View style={styles.ratingRow}>
                        {item.rating === null ? (
                          <>
                            <TouchableOpacity
                              style={styles.rateBtn}
                              onPress={() => handleRate(item.id, 'helpful')}
                            >
                              <Ionicons name="thumbs-up-outline" size={14} color="#10b981" />
                              <Text style={styles.rateBtnText}>{t.helpful}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.rateBtn}
                              onPress={() => handleRate(item.id, 'not-helpful')}
                            >
                              <Ionicons name="thumbs-down-outline" size={14} color="#64748b" />
                              <Text style={styles.rateBtnTextMuted}>{t.notHelpful}</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <View style={styles.ratedBadge}>
                            <Ionicons 
                              name={item.rating === 'helpful' ? "checkmark-circle" : "chatbox-ellipses"} 
                              size={14} 
                              color="#10b981" 
                            />
                            <Text style={styles.ratedText}>
                              {item.rating === 'helpful' ? t.thanks : t.feedbackReceived}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              )}
            />
          )}

          {sending && (
            <View style={styles.typingRow}>
              <View style={styles.avatar}>
                <Ionicons name="sparkles" size={14} color="#10b981" />
              </View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={styles.typingText}>{t.thinking}</Text>
              </View>
            </View>
          )}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.inputSection}>
            {/* Tag Filter Bar */}
            {tags.length > 0 && (
              <View style={styles.tagFilterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScrollContent}>
                  <TouchableOpacity
                    style={[styles.tagFilterBtn, selectedTagIds.length > 0 && styles.tagFilterBtnActive]}
                    onPress={() => setShowTagPicker(true)}
                  >
                    <Ionicons
                      name={selectedTagIds.length > 0 ? 'pricetag' : 'pricetag-outline'}
                      size={14}
                      color={selectedTagIds.length > 0 ? '#10b981' : '#64748b'}
                    />
                    <Text style={[styles.tagFilterBtnText, selectedTagIds.length > 0 && styles.tagFilterBtnTextActive]}>
                      {selectedTagIds.length > 0
                        ? `${selectedTagIds.length} ${isVi ? 'tag' : 'tag'}${selectedTagIds.length > 1 ? 's' : ''}`
                        : isVi ? 'Chọn tag' : 'Select tags'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={selectedTagIds.length > 0 ? '#10b981' : '#64748b'} />
                  </TouchableOpacity>

                  {selectedTagIds.map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <View key={tagId} style={styles.selectedTagChip}>
                        <Text style={styles.selectedTagChipText}>{tag.name}</Text>
                        <TouchableOpacity onPress={() => toggleTag(tagId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  {selectedTagIds.length > 0 && (
                    <TouchableOpacity style={styles.clearTagsBtn} onPress={clearTags}>
                      <Ionicons name="close" size={14} color="#f87171" />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )}

            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                placeholder={t.chatPlaceholder}
                placeholderTextColor="#64748b"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
              />
              <Pressable
                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!canSend}
              >
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </Pressable>
            </View>
            <Text style={styles.charCount}>{input.length}/500</Text>
          </View>

          {/* Tag Picker Modal */}
          <Modal visible={showTagPicker} transparent animationType="fade" onRequestClose={() => setShowTagPicker(false)}>
            <TouchableWithoutFeedback onPress={() => setShowTagPicker(false)}>
              <View style={tagModalStyles.overlay}>
                <TouchableWithoutFeedback>
                  <View style={tagModalStyles.modalContent}>
                    <View style={tagModalStyles.header}>
                      <Text style={tagModalStyles.title}>{isVi ? 'Chọn phạm vi tìm kiếm' : 'Select search scope'}</Text>
                      <TouchableOpacity onPress={() => setShowTagPicker(false)}>
                        <Ionicons name="close" size={22} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                    <Text style={tagModalStyles.subtitle}>{isVi ? 'Chọn các tag để giới hạn tài liệu tìm kiếm' : 'Select tags to filter knowledge base'}</Text>

                    <ScrollView style={tagModalStyles.tagList} showsVerticalScrollIndicator={false}>
                      {tags.map(tag => {
                        const isSelected = selectedTagIds.includes(tag.id);
                        return (
                          <TouchableOpacity
                            key={tag.id}
                            style={[tagModalStyles.tagItem, isSelected && tagModalStyles.tagItemSelected]}
                            onPress={() => toggleTag(tag.id)}
                          >
                            <Text style={[tagModalStyles.tagItemText, isSelected && tagModalStyles.tagItemTextSelected]}>
                              {tag.name}
                            </Text>
                            {isSelected && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <TouchableOpacity style={tagModalStyles.doneBtn} onPress={() => setShowTagPicker(false)}>
                      <Text style={tagModalStyles.doneBtnText}>{isVi ? 'Xong' : 'Done'}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </KeyboardAvoidingView>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  chatBody: {
    flex: 1,
  },
  messagesWrapper: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 4,
  },
  messageListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centerLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  centerLoaderText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  promptChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  promptChipText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '92%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
  },
  messageRowAssistant: {
    alignSelf: 'flex-start',
  },
  messageColumn: {
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  messageBubble: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: '#10b981',
    borderBottomRightRadius: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  assistantBubble: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#f1f5f9',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 16,
    maxHeight: 120,
    paddingVertical: 8,
    lineHeight: 22,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
    elevation: 0,
  },
  charCount: {
    textAlign: 'right',
    color: '#64748b',
    fontSize: 11,
    marginTop: 6,
    marginRight: 4,
  },

  // Tag Filter Styles
  tagFilterContainer: {
    marginBottom: 10,
  },
  tagScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  tagFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagFilterBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  tagFilterBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  tagFilterBtnTextActive: {
    color: '#10b981',
  },
  selectedTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#10b981',
  },
  selectedTagChipText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  clearTagsBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  // Sources section
  sourcesSection: {
    marginTop: 8,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sourcesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sourcesTitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  sourceItem: {
    marginBottom: 8,
  },
  sourceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sourceTitle: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    flex: 1,
  },
  sourceSnippet: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    marginLeft: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  responseTime: {
    fontSize: 10,
    color: '#64748b',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rateBtnText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  rateBtnTextMuted: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  ratedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
  // New chat button in header
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  newChatBtnText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
});

// Tag Picker Modal Styles
const tagModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tagList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 300,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  tagItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  tagItemText: {
    fontSize: 15,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  tagItemTextSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
  doneBtn: {
    margin: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
