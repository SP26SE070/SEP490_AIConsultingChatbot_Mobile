import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  ScrollView, TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { getChatbotConfig, updateChatbotConfig, type ChatbotMode, type EmbeddingProvider } from '../../lib/api/chatbot-config';
import { useNotification } from '../../lib/notification';

type ChatbotModeOption = {
  value: ChatbotMode;
  label: string;
  labelEn: string;
  desc: string;
  descEn: string;
  recommended?: boolean;
};

type EmbeddingProviderOption = {
  value: EmbeddingProvider;
  label: string;
  labelEn: string;
  desc: string;
  descEn: string;
};

const MODES: ChatbotModeOption[] = [
  {
    value: 'BALANCED',
    label: 'Cân bằng',
    labelEn: 'Balanced',
    desc: 'Tốt nhất cho hầu hết trường hợp. Câu trả lời đáng tin cậy.',
    descEn: 'Best for most cases. Reliable answers.',
    recommended: true,
  },
  {
    value: 'STRICT',
    label: 'Nghiêm ngặt',
    labelEn: 'Strict',
    desc: 'Chính xác hơn. Chỉ trả lời khi tự tin.',
    descEn: 'More accurate. Only answers when confident.',
  },
  {
    value: 'FLEXIBLE',
    label: 'Linh hoạt',
    labelEn: 'Flexible',
    desc: 'Trả lời rộng hơn. Có thể bao gồm thông tin ít liên quan.',
    descEn: 'Answers more broadly. May include less relevant info.',
  },
];

const EMBEDDING_PROVIDERS: EmbeddingProviderOption[] = [
  {
    value: 'GEMINI',
    label: 'Gemini',
    labelEn: 'Gemini',
    desc: 'Embedding cloud (mặc định, chạy nhanh và ổn định).',
    descEn: 'Cloud embedding (default, fastest setup).',
  },
  {
    value: 'LOCAL',
    label: 'MxBai Embed Large',
    labelEn: 'MxBai Embed Large',
    desc: 'Embedding cục bộ on-premise. Cần kho chunk dimension 1024.',
    descEn: 'On-premise local embedding endpoint. Requires 1024-dimension chunk store.',
  },
];

export default function AISettingsScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const isVi = language === 'vi';
  const { showSuccess, showError } = useNotification();

  const [mode, setMode] = useState<ChatbotMode>('BALANCED');
  const [originalMode, setOriginalMode] = useState<ChatbotMode>('BALANCED');
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>('GEMINI');
  const [originalEmbeddingProvider, setOriginalEmbeddingProvider] = useState<EmbeddingProvider>('GEMINI');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadConfig() {
    try {
      setError(null);
      const config = await getChatbotConfig();
      setMode(config.mode || 'BALANCED');
      setOriginalMode(config.mode || 'BALANCED');
      setEmbeddingProvider(config.embeddingProvider || 'GEMINI');
      setOriginalEmbeddingProvider(config.embeddingProvider || 'GEMINI');
    } catch (e: any) {
      console.log('Load config error:', e);
      setError(isVi ? 'Không thể tải cấu hình AI' : 'Failed to load AI config');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [])
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateChatbotConfig({ mode, embeddingProvider });
      setOriginalMode(mode);
      setOriginalEmbeddingProvider(embeddingProvider);
      showSuccess(isVi ? 'Đã lưu cài đặt AI' : 'AI settings saved', isVi ? 'Thành công' : 'Success');
    } catch (e: any) {
      console.log('Save error:', e);
      showError(isVi ? 'Không thể lưu cài đặt' : 'Failed to save settings', isVi ? 'Lỗi' : 'Error');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = mode !== originalMode || embeddingProvider !== originalEmbeddingProvider;

  if (loading) {
    return (
      <AppShell title={isVi ? 'Cài đặt AI' : 'AI Settings'}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>
            {isVi ? 'Đang tải...' : 'Loading...'}
          </Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={isVi ? 'Cài đặt AI' : 'AI Settings'}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadConfig();
            }}
            colors={['#10b981']}
          />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Section 1: Chatbot Behavior */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubbles-outline" size={20} color="#7c3aed" />
            <Text style={styles.sectionTitle}>
              {isVi ? 'Hành vi Chatbot' : 'Chatbot Behavior'}
            </Text>
          </View>
          <Text style={styles.sectionDesc}>
            {isVi ? 'Kiểm soát cách AI truy xuất câu trả lời' : 'Control how the AI retrieves answers'}
          </Text>

          {MODES.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                mode === option.value && styles.optionCardSelected,
              ]}
              onPress={() => setMode(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.optionRadio}>
                <View style={[
                  styles.radioOuter,
                  mode === option.value && styles.radioOuterSelected
                ]}>
                  {mode === option.value && <View style={styles.radioInner} />}
                </View>
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <Text style={[
                    styles.optionLabel,
                    mode === option.value && styles.optionLabelSelected
                  ]}>
                    {isVi ? option.label : option.labelEn}
                  </Text>
                  {option.recommended && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {isVi ? 'Khuyến nghị' : 'Recommended'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.optionDesc}>
                  {isVi ? option.desc : option.descEn}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section 2: Embedding Provider */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="server-outline" size={20} color="#7c3aed" />
            <Text style={styles.sectionTitle}>
              {isVi ? 'Nhà cung cấp Embedding' : 'Embedding Provider'}
            </Text>
          </View>
          <Text style={styles.sectionDesc}>
            {isVi
              ? 'Chọn engine embedding cho tài liệu: Gemini cloud hoặc MxBai Embed Large local.'
              : 'Choose embedding engine for documents: Gemini cloud or MxBai Embed Large local.'}
          </Text>

          {EMBEDDING_PROVIDERS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                embeddingProvider === option.value && styles.optionCardSelected,
              ]}
              onPress={() => setEmbeddingProvider(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.optionRadio}>
                <View style={[
                  styles.radioOuter,
                  embeddingProvider === option.value && styles.radioOuterSelected
                ]}>
                  {embeddingProvider === option.value && <View style={styles.radioInner} />}
                </View>
              </View>
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  embeddingProvider === option.value && styles.optionLabelSelected
                ]}>
                  {isVi ? option.label : option.labelEn}
                </Text>
                <Text style={styles.optionDesc}>
                  {isVi ? option.desc : option.descEn}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            (!hasChanges || saving) && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>
                {isVi ? 'Lưu cài đặt' : 'Save Settings'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isVi
              ? 'Cài đặt này chỉ áp dụng cho tenant hiện tại.'
              : 'These settings only apply to the current tenant.'}
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  optionCardSelected: {
    borderColor: '#7c3aed',
    backgroundColor: '#f5f3ff',
  },
  optionRadio: {
    marginRight: 12,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#7c3aed',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c3aed',
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  optionLabelSelected: {
    color: '#7c3aed',
  },
  optionDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 18,
  },
  badge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7c3aed',
  },
  saveBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: {
    backgroundColor: '#a78bfa',
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
