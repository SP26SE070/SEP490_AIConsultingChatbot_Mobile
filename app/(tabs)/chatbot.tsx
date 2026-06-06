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
import { sendMessage, getConversationHistory, rateMessage } from '../../lib/api/chatbot';
import { isRatingMessageId, resolveServerMessageId } from '../../lib/chatMessageId';
import { getPendingConversation, consumeNewChatRequest } from '../../lib/navigation-store';
import { useNotification } from '../../lib/notification';
import { saveChatSession, loadChatSession, clearChatSession } from '../../lib/chat-session-store';
import { migrateOldChatSessionIfExists } from '../../lib/chat-session-migration';
import { COLORS } from '../../lib/theme';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { TAGS_BASE } from '../../lib/api/config';
import { getAccessToken, getUser } from '../../lib/auth-store';
import { useResponsive } from '../../lib/useResponsive';

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
  documentTitle?: string;
  fileName?: string;
  chunkIndex: number;
  similarityScore?: number;
  relevanceScore?: number;
  snippet?: string;
  chunkContent?: string;
}

function getSourceTitle(source: ChatSourceDocument) {
  return source.documentTitle || source.fileName || source.documentId || 'Tài liệu';
}

function getSourceSnippet(source: ChatSourceDocument) {
  return source.snippet || source.chunkContent || '';
}

function getSourceScore(source: ChatSourceDocument) {
  return source.relevanceScore ?? source.similarityScore ?? 0;
}

function getSourceKey(source: ChatSourceDocument) {
  const id = source.documentId?.trim();
  if (id) return id.toLowerCase();
  return getSourceTitle(source).trim().toLowerCase();
}

function deduplicateSources(sources: ChatSourceDocument[]): ChatSourceDocument[] {
  const grouped = new Map<string, ChatSourceDocument>();
  for (const source of sources) {
    const key = getSourceKey(source);
    const existing = grouped.get(key);
    if (!existing || getSourceScore(source) > getSourceScore(existing)) {
      grouped.set(key, source);
    }
  }
  return [...grouped.values()].sort((a, b) => getSourceScore(b) - getSourceScore(a));
}

function mapApiSources(rawSources: unknown): ChatSourceDocument[] | undefined {
  if (!Array.isArray(rawSources) || rawSources.length === 0) return undefined;
  const mapped = rawSources.flatMap((source: any) => {
    if (!source || typeof source !== 'object') return [];
    return [{
      documentId: source.documentId || source.document_id || '',
      documentTitle: source.documentTitle || source.fileName || source.file_name,
      fileName: source.fileName || source.file_name,
      chunkIndex: source.chunkIndex ?? source.chunk_index ?? 0,
      similarityScore: source.similarityScore ?? source.relevanceScore,
      relevanceScore: source.relevanceScore ?? source.similarityScore,
      snippet: source.snippet || source.chunkContent || source.chunk_content,
      chunkContent: source.chunkContent || source.chunk_content,
    }];
  });
  const deduped = deduplicateSources(mapped);
  return deduped.length > 0 ? deduped : undefined;
}

function extractInlineSources(answer: string): ChatSourceDocument[] | undefined {
  const matches = [...answer.matchAll(/Nguồn:\s*([^\n]+)/gi)];
  if (matches.length === 0) return undefined;
  const sources = matches.map((match, index) => {
    const title = match[1].trim();
    return {
      documentId: title,
      documentTitle: title,
      fileName: title,
      chunkIndex: index,
      snippet: '',
    };
  });
  return deduplicateSources(sources);
}

function resolveMessageSources(result: any, answer: string): ChatSourceDocument[] | undefined {
  return mapApiSources(result?.sources)
    ?? mapApiSources(result?.sourceChunks)
    ?? extractInlineSources(answer);
}

async function resolveAssistantMessageId(
  result: any,
  convId: string | undefined
): Promise<string | undefined> {
  const fromResponse = resolveServerMessageId({
    messageId: result?.messageId,
    message_id: result?.message_id,
    id: result?.messageId,
  });
  if (fromResponse && isRatingMessageId(fromResponse)) return fromResponse;

  if (!convId) return undefined;

  try {
    const history = await getConversationHistory(convId);
    const lastAssistant = [...(history.messages || [])]
      .reverse()
      .find((msg: any) => msg.role === 'ASSISTANT');
    const historyId = resolveServerMessageId(lastAssistant);
    if (historyId && isRatingMessageId(historyId)) return historyId;
  } catch {
    // ignore
  }

  return undefined;
}

function stripInlineSource(text: string) {
  return text
    .replace(/\n?Nguồn:\s*[^\n]+(?:\n?)/gi, '')
    .trim();
}

export default function ChatbotScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const isVi = language === 'vi';
  const navigation = useNavigation();
  const { showConfirm } = useNotification();
  const { gap, sz, fs } = useResponsive();

  // Responsive dimensions
  const inputSectionPaddingH = sz(16);
  const inputSectionPaddingTop = sz(12);
  const inputSectionPaddingBottom = sz(16);
  const avatarSize = sz(36);
  const avatarBorderRadius = sz(18);
  const messageBubblePaddingH = sz(16);
  const messageBubblePaddingV = sz(12);
  const messageBubbleBorderRadius = sz(20);
  const sendButtonSize = sz(44);
  const sendButtonRadius = sz(22);
  const emptyIconSize = sz(100);
  const emptyIconRadius = sz(50);
  const emptyTitleSize = fs(26);
  const emptyTextSize = fs(15);
  const emptyTextLineHeight = fs(24);
  const promptChipPaddingH = sz(18);
  const promptChipPaddingV = sz(12);
  const promptChipRadius = sz(20);
  const promptChipTextSize = fs(13);
  const promptRowGap = sz(10);
  const inputCardPaddingLeft = sz(18);
  const inputCardPaddingV = sz(8);
  const inputCardRadius = sz(24);
  const inputFontSize = fs(16);
  const inputLineHeight = fs(22);
  const inputMaxHeight = sz(120);
  const charCountSize = fs(11);
  const charCountMarginR = sz(4);
  const emptyStatePaddingH = sz(24);
  const emptyMarginBottom = sz(24);
  const emptyTextPaddingH = sz(20);
  const messageListPaddingH = sz(16);
  const messageListPaddingV = sz(16);
  const messageListGap = sz(4);
  const messageRowMarginBottom = sz(12);
  const avatarMarginRight = sz(10);
  const avatarMarginTop = sz(2);
  const typingRowPaddingH = sz(16);
  const typingRowPaddingB = sz(8);
  const typingBubblePaddingH = sz(14);
  const typingBubblePaddingV = sz(10);
  const typingBubbleRadius = sz(18);
  const typingTextSize = fs(13);
  const sourcesSectionMarginTop = sz(8);
  const sourcesSectionPadding = sz(10);
  const sourcesSectionRadius = sz(10);
  const sourcesTitleRowMarginBottom = sz(8);
  const sourceItemMarginBottom = sz(8);
  const sourceSnippetMarginLeft = sz(18);
  const sourceTitleRowMarginBottom = sz(4);
  const metaRowMarginTop = sz(4);
  const ratingRowMarginTop = sz(6);
  const rateBtnPaddingH = sz(10);
  const rateBtnPaddingV = sz(5);
  const rateBtnRadius = sz(14);
  const ratedBadgePaddingH = sz(10);
  const ratedBadgePaddingV = sz(5);
  const ratedBadgeRadius = sz(14);
  const tagFilterContainerMarginBottom = sz(10);
  const tagScrollPaddingR = sz(16);
  const tagFilterBtnPaddingH = sz(12);
  const tagFilterBtnPaddingV = sz(8);
  const tagFilterBtnRadius = sz(20);
  const tagFilterBtnTextSize = fs(13);
  const selectedTagChipPaddingH = sz(10);
  const selectedTagChipPaddingV = sz(6);
  const selectedTagChipRadius = sz(16);
  const selectedTagChipTextSize = fs(12);
  const clearTagsBtnPadding = sz(6);
  const clearTagsBtnRadius = sz(12);
  const modalMaxWidth = sz(360);
  const modalRadius = sz(20);
  const modalHeaderPadding = sz(20);
  const modalTitleSize = fs(18);
  const modalSubtitlePaddingH = sz(20);
  const modalSubtitlePaddingTop = sz(8);
  const modalTagListPaddingH = sz(12);
  const modalTagListPaddingV = sz(8);
  const modalTagListMaxHeight = sz(300);
  const modalTagItemPaddingV = sz(14);
  const modalTagItemPaddingH = sz(16);
  const modalTagItemRadius = sz(12);
  const modalTagItemMarginBottom = sz(4);
  const modalTagItemTextSize = fs(15);
  const modalDoneBtnMargin = sz(16);
  const modalDoneBtnMarginTop = sz(8);
  const modalDoneBtnPaddingV = sz(14);
  const modalDoneBtnRadius = sz(12);
  const modalDoneBtnTextSize = fs(16);
  const tagIconSize = sz(14);
  const newChatBtnPaddingH = sz(12);
  const newChatBtnPaddingV = sz(8);
  const newChatBtnRadius = sz(20);
  const newChatBtnIconSize = sz(22);
  const newChatBtnTextSize = fs(13);
  const responseTimeSize = fs(10);
  const rateBtnTextSize = fs(12);
  const rateBtnIconSize = sz(14);
  
  const [userId, setUserId] = useState<string | undefined>();
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

  // Load user and saved session on mount
  useEffect(() => {
    const initialize = async () => {
      await migrateOldChatSessionIfExists();
      const user = await getUser();
      if (user?.id) {
        setUserId(user.id);
        const savedSession = await loadChatSession(user.id);
        if (savedSession && savedSession.messages.length > 0) {
          setMessages(savedSession.messages);
          setConversationId(savedSession.conversationId);
        }
      }
    };
    initialize();
  }, []);

  // Save session when messages change (debounced)
  useEffect(() => {
    if (messages.length > 0 && !historyLoading && userId) {
      saveChatSession(userId, { conversationId, messages, lastUpdated: Date.now() });
    }
  }, [messages, conversationId, historyLoading, userId]);

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
        const loadedMessages: Message[] = data.messages.map((msg: any, index: number) => ({
          id: resolveServerMessageId(msg) || `history-${index}`,
          role: msg.role === 'USER' ? 'user' : 'assistant',
          content: msg.content,
          sources: resolveMessageSources(msg, msg.content),
          rating: msg.rating === 5 ? 'helpful' : msg.rating === 1 ? 'not-helpful' : null,
          responseTimeMs: msg.responseTimeMs,
        }));
        setMessages(loadedMessages);
        setConversationId(convId);
        // Save loaded session
        if (userId) {
          await saveChatSession(userId, { conversationId: convId, messages: loadedMessages, lastUpdated: Date.now() });
        }
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

    const assistantPlaceholderId = `pending-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      userMessage,
      { id: assistantPlaceholderId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setSending(true);

    if (text) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }

    try {
      const result = await sendMessage({ message: content, conversationId, tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined });
      const convId = result.conversationId || conversationId;
      if (result.conversationId && !conversationId) {
        setConversationId(result.conversationId);
      }
      const answer = result.answer || '';
      const realMessageId = await resolveAssistantMessageId(result, convId);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantPlaceholderId
            ? {
                id: realMessageId || assistantPlaceholderId,
                role: 'assistant',
                content: stripInlineSource(answer),
                sources: resolveMessageSources(result, answer),
                responseTimeMs: result.responseTimeMs,
                rating: null,
              }
            : msg
        )
      );
    } catch (e: any) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantPlaceholderId
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
    if (userId) {
      await clearChatSession(userId);
    }
    setConversationId(undefined);
    setMessages([]);
  }

  async function handleRate(messageId: string, rating: 'helpful' | 'not-helpful') {
    if (!isRatingMessageId(messageId)) return;
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
          style={[styles.newChatBtn, { paddingHorizontal: newChatBtnPaddingH, paddingVertical: newChatBtnPaddingV, borderRadius: newChatBtnRadius }]}
          onPress={startNewChat}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={sz(newChatBtnIconSize)} color="#10b981" />
          <Text style={[styles.newChatBtnText, { fontSize: newChatBtnTextSize }]}>
            {language === 'vi' ? 'Mới' : 'New'}
          </Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.chatBody}>
        <View style={styles.messagesWrapper}>
          {historyLoading ? (
            <View style={[styles.centerLoader, { gap: gap(12) }]}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={[styles.centerLoaderText, { fontSize: fs(14) }]}>{t.loading}</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              style={styles.messageList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              contentContainerStyle={[
                styles.messageListContent,
                { paddingHorizontal: messageListPaddingH, paddingVertical: messageListPaddingV, gap: messageListGap },
                messages.length === 0 && styles.messageListEmpty,
              ]}
              ListEmptyComponent={
                <View style={[styles.emptyState, { paddingHorizontal: emptyStatePaddingH }]}>
                  <View style={[styles.emptyIconWrap, { width: emptyIconSize, height: emptyIconSize, borderRadius: emptyIconRadius, marginBottom: emptyMarginBottom }]}>
                    <Ionicons name="chatbubbles" size={sz(40)} color="#10b981" />
                  </View>
                  <Text style={[styles.emptyTitle, { fontSize: emptyTitleSize }]}>
                    {language === 'vi' ? 'Xin chào!' : 'Hello!'}
                  </Text>
                  <Text style={[styles.emptyText, { fontSize: emptyTextSize, lineHeight: emptyTextLineHeight, marginBottom: emptyMarginBottom, paddingHorizontal: emptyTextPaddingH }]}>{t.askAnything}</Text>
                  <View style={[styles.promptRow, { gap: promptRowGap }]}>
                    {QUICK_PROMPTS.map(prompt => (
                      <TouchableOpacity
                        key={prompt}
                        style={[styles.promptChip, { paddingHorizontal: promptChipPaddingH, paddingVertical: promptChipPaddingV, borderRadius: promptChipRadius }]}
                        onPress={() => handleSend(prompt)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.promptChipText, { fontSize: promptChipTextSize }]}>{prompt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.messageRow,
                    { marginBottom: messageRowMarginBottom, maxWidth: '92%' },
                    item.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                  ]}
                >
                  {item.role === 'assistant' && (
                    <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarBorderRadius, marginRight: avatarMarginRight, marginTop: avatarMarginTop }]}>
                      <Ionicons name="sparkles" size={sz(14)} color="#10b981" />
                    </View>
                  )}
                  <View style={styles.messageColumn}>
                    <View
                      style={[
                        styles.messageBubble,
                        { paddingHorizontal: messageBubblePaddingH, paddingVertical: messageBubblePaddingV, borderRadius: messageBubbleBorderRadius },
                        item.role === 'user' ? styles.userBubble : styles.assistantBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          { fontSize: fs(15), lineHeight: fs(22) },
                          item.role === 'user' ? styles.userText : styles.assistantText,
                        ]}
                      >
                        {item.content}
                      </Text>
                    </View>

                    {/* RAG Sources */}
                    {item.role === 'assistant' && item.sources && item.sources.length > 0 && (
                      <View style={[styles.sourcesSection, { marginTop: sourcesSectionMarginTop, padding: sourcesSectionPadding, borderRadius: sourcesSectionRadius }]}>
                        <View style={[styles.sourcesTitleRow, { marginBottom: sourcesTitleRowMarginBottom }]}>
                          <Ionicons name="library-outline" size={sz(12)} color="#64748b" />
                          <Text style={[styles.sourcesTitle, { fontSize: fs(11) }]}> {t.sources}</Text>
                        </View>
                        {deduplicateSources(item.sources).slice(0, 3).map((source) => (
                          <View key={getSourceKey(source)} style={[styles.sourceItem, { marginBottom: sourceItemMarginBottom }]}>
                            <View style={[styles.sourceTitleRow, { marginBottom: sourceTitleRowMarginBottom }]}>
                              <Ionicons name="document-text-outline" size={sz(12)} color="#10b981" />
                              <Text style={[styles.sourceTitle, { fontSize: fs(12) }]} numberOfLines={1}>
                                {getSourceTitle(source)}
                              </Text>
                            </View>
                            <Text style={[styles.sourceSnippet, { fontSize: fs(12), lineHeight: fs(18), marginLeft: sourceSnippetMarginLeft }]} numberOfLines={2}>
                              {getSourceSnippet(source)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Response time */}
                    {item.role === 'assistant' && item.responseTimeMs && (
                      <View style={[styles.metaRow, { marginTop: metaRowMarginTop }]}>
                        <Ionicons name="time-outline" size={sz(10)} color="#64748b" />
                        <Text style={[styles.responseTime, { fontSize: responseTimeSize }]}>
                          {t.responseTime}: {item.responseTimeMs}{t.ms}
                        </Text>
                      </View>
                    )}

                    {/* Rating */}
                    {item.role === 'assistant' && isRatingMessageId(item.id) && (
                      <View style={[styles.ratingRow, { marginTop: ratingRowMarginTop }]}>
                        {item.rating == null ? (
                          <>
                            <TouchableOpacity
                              style={[styles.rateBtn, styles.rateBtnNeutral, { paddingHorizontal: rateBtnPaddingH, paddingVertical: rateBtnPaddingV, borderRadius: rateBtnRadius }]}
                              onPress={() => handleRate(item.id, 'helpful')}
                            >
                              <Ionicons name="thumbs-up-outline" size={rateBtnIconSize} color="#94a3b8" />
                              <Text style={[styles.rateBtnTextNeutral, { fontSize: rateBtnTextSize }]}>{t.helpful}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.rateBtn, styles.rateBtnNeutral, { paddingHorizontal: rateBtnPaddingH, paddingVertical: rateBtnPaddingV, borderRadius: rateBtnRadius }]}
                              onPress={() => handleRate(item.id, 'not-helpful')}
                            >
                              <Ionicons name="thumbs-down-outline" size={rateBtnIconSize} color="#94a3b8" />
                              <Text style={[styles.rateBtnTextNeutral, { fontSize: rateBtnTextSize }]}>{t.notHelpful}</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <View style={[styles.ratedBadge, { paddingHorizontal: ratedBadgePaddingH, paddingVertical: ratedBadgePaddingV, borderRadius: ratedBadgeRadius }]}>
                            <Ionicons
                              name={item.rating === 'helpful' ? "thumbs-up" : "thumbs-down"}
                              size={rateBtnIconSize}
                              color="#10b981"
                            />
                            <Text style={[styles.ratedText, { fontSize: rateBtnTextSize }]}>
                              {item.rating === 'helpful' ? t.helpful : t.notHelpful}
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
            <View style={[styles.typingRow, { paddingHorizontal: typingRowPaddingH, paddingBottom: typingRowPaddingB }]}>
              <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarBorderRadius, marginRight: avatarMarginRight, marginTop: avatarMarginTop }]}>
                <Ionicons name="sparkles" size={sz(14)} color="#10b981" />
              </View>
              <View style={[styles.typingBubble, { paddingHorizontal: typingBubblePaddingH, paddingVertical: typingBubblePaddingV, borderRadius: typingBubbleRadius }]}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={[styles.typingText, { fontSize: typingTextSize }]}>{t.thinking}</Text>
              </View>
            </View>
          )}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={[styles.inputSection, { paddingHorizontal: inputSectionPaddingH, paddingTop: inputSectionPaddingTop, paddingBottom: inputSectionPaddingBottom }]}>
            {/* Tag Filter Bar */}
            {tags.length > 0 && (
              <View style={[styles.tagFilterContainer, { marginBottom: tagFilterContainerMarginBottom }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.tagScrollContent, { paddingRight: tagScrollPaddingR }]}>
                  <TouchableOpacity
                    style={[styles.tagFilterBtn, selectedTagIds.length > 0 && styles.tagFilterBtnActive]}
                    onPress={() => setShowTagPicker(true)}
                  >
                    <Ionicons
                      name={selectedTagIds.length > 0 ? 'pricetag' : 'pricetag-outline'}
                      size={sz(14)}
                      color={selectedTagIds.length > 0 ? '#10b981' : '#64748b'}
                    />
                    <Text style={[styles.tagFilterBtnText, { fontSize: tagFilterBtnTextSize }, selectedTagIds.length > 0 && styles.tagFilterBtnTextActive]}>
                      {selectedTagIds.length > 0
                        ? `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''}`
                        : isVi ? 'Chọn tag' : 'Select tags'}
                    </Text>
                    <Ionicons name="chevron-down" size={sz(14)} color={selectedTagIds.length > 0 ? '#10b981' : '#64748b'} />
                  </TouchableOpacity>

                  {selectedTagIds.map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <View key={tagId} style={[styles.selectedTagChip, { paddingHorizontal: selectedTagChipPaddingH, paddingVertical: selectedTagChipPaddingV, borderRadius: selectedTagChipRadius }]}>
                        <Text style={[styles.selectedTagChipText, { fontSize: selectedTagChipTextSize }]}>{tag.name}</Text>
                        <TouchableOpacity onPress={() => toggleTag(tagId)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={sz(16)} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  {selectedTagIds.length > 0 && (
                    <TouchableOpacity style={[styles.clearTagsBtn, { padding: clearTagsBtnPadding, borderRadius: clearTagsBtnRadius }]} onPress={clearTags}>
                      <Ionicons name="close" size={sz(14)} color="#f87171" />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            )}

            <View style={[styles.inputCard, { paddingLeft: inputCardPaddingLeft, paddingRight: sz(8), paddingVertical: inputCardPaddingV, borderRadius: inputCardRadius }]}>
              <TextInput
                style={[styles.input, { fontSize: inputFontSize, lineHeight: inputLineHeight, maxHeight: inputMaxHeight, paddingVertical: sz(8) }]}
                placeholder={t.chatPlaceholder}
                placeholderTextColor="#64748b"
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={500}
              />
              <Pressable
                style={[styles.sendButton, { width: sendButtonSize, height: sendButtonSize, borderRadius: sendButtonRadius }, !canSend && styles.sendButtonDisabled]}
                onPress={() => handleSend()}
                disabled={!canSend}
              >
                <Ionicons name="arrow-up" size={sz(20)} color="#fff" />
              </Pressable>
            </View>
            <Text style={[styles.charCount, { fontSize: charCountSize, marginRight: charCountMarginR, marginTop: sz(6) }]}>{input.length}/500</Text>
          </View>

          {/* Tag Picker Modal */}
          <Modal visible={showTagPicker} transparent animationType="fade" onRequestClose={() => setShowTagPicker(false)}>
            <TouchableWithoutFeedback onPress={() => setShowTagPicker(false)}>
              <View style={[tagModalStyles.overlay, { padding: sz(24) }]}>
                <TouchableWithoutFeedback>
                  <View style={[tagModalStyles.modalContent, { borderRadius: modalRadius, maxWidth: modalMaxWidth }]}>
                    <View style={[tagModalStyles.header, { padding: modalHeaderPadding }]}>
                      <Text style={[tagModalStyles.title, { fontSize: modalTitleSize }]}>{isVi ? 'Chọn phạm vi tìm kiếm' : 'Select search scope'}</Text>
                      <TouchableOpacity onPress={() => setShowTagPicker(false)}>
                        <Ionicons name="close" size={sz(22)} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[tagModalStyles.subtitle, { fontSize: fs(13), paddingHorizontal: modalSubtitlePaddingH, paddingTop: modalSubtitlePaddingTop, paddingBottom: sz(4) }]}>{isVi ? 'Chọn các tag để giới hạn tài liệu tìm kiếm' : 'Select tags to filter knowledge base'}</Text>

                    <ScrollView style={[tagModalStyles.tagList, { paddingHorizontal: modalTagListPaddingH, paddingVertical: modalTagListPaddingV, maxHeight: modalTagListMaxHeight }]} showsVerticalScrollIndicator={false}>
                      {tags.map(tag => {
                        const isSelected = selectedTagIds.includes(tag.id);
                        return (
                          <TouchableOpacity
                            key={tag.id}
                            style={[tagModalStyles.tagItem, isSelected && tagModalStyles.tagItemSelected, { paddingVertical: modalTagItemPaddingV, paddingHorizontal: modalTagItemPaddingH, borderRadius: modalTagItemRadius, marginBottom: modalTagItemMarginBottom }]}
                            onPress={() => toggleTag(tag.id)}
                          >
                            <Text style={[tagModalStyles.tagItemText, isSelected && tagModalStyles.tagItemTextSelected, { fontSize: modalTagItemTextSize }]}>
                              {tag.name}
                            </Text>
                            {isSelected && <Ionicons name="checkmark-circle" size={sz(20)} color="#10b981" />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <TouchableOpacity style={[tagModalStyles.doneBtn, { margin: modalDoneBtnMargin, marginTop: modalDoneBtnMarginTop, paddingVertical: modalDoneBtnPaddingV, borderRadius: modalDoneBtnRadius }]} onPress={() => setShowTagPicker(false)}>
                      <Text style={[tagModalStyles.doneBtnText, { fontSize: modalDoneBtnTextSize }]}>{isVi ? 'Xong' : 'Done'}</Text>
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  emptyTitle: {
    fontWeight: '700',
    color: '#f1f5f9',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  promptChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  promptChipText: {
    color: '#10b981',
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  messageBubble: {
    flex: 1,
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
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typingText: {
    color: '#94a3b8',
  },
  inputSection: {
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  input: {
    flex: 1,
    color: '#f1f5f9',
  },
  sendButton: {
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
    marginTop: 6,
  },

  // Tag Filter Styles
  tagFilterContainer: {
  },
  tagScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagFilterBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  tagFilterBtnText: {
    color: '#64748b',
    fontWeight: '500',
  },
  tagFilterBtnTextActive: {
    color: '#10b981',
  },
  selectedTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
  },
  selectedTagChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  clearTagsBtn: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  // Sources section
  sourcesSection: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  sourcesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourcesTitle: {
    color: '#64748b',
    fontWeight: '600',
  },
  sourceItem: {
  },
  sourceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceTitle: {
    color: '#10b981',
    fontWeight: '600',
    flex: 1,
  },
  sourceSnippet: {
    color: '#94a3b8',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  responseTime: {
    color: '#64748b',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rateBtnNeutral: {
    backgroundColor: '#162033',
    borderColor: '#2b3a4d',
  },
  rateBtnText: {
    color: '#10b981',
    fontWeight: '500',
  },
  rateBtnTextNeutral: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  rateBtnTextMuted: {
    color: '#64748b',
    fontWeight: '500',
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  ratedText: {
    color: '#10b981',
    fontWeight: '500',
  },
  // New chat button in header
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  newChatBtnText: {
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
  },
  modalContent: {
    backgroundColor: '#1e293b',
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontWeight: '700',
    color: '#f1f5f9',
  },
  subtitle: {
    color: '#94a3b8',
  },
  tagList: {
    maxHeight: 300,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  tagItemText: {
    color: '#e2e8f0',
    fontWeight: '500',
  },
  tagItemTextSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  doneBtnText: {
    fontWeight: '600',
    color: '#fff',
  },
});
