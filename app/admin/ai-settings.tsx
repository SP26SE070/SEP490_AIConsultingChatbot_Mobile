import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  ScrollView, TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AppShell } from '../../components/layout/AppShell';
import { AppLogo } from '../../components/brand/AppLogo';
import { useLanguageStore, translations } from '../../lib/language-store';
import { getChatbotConfig, updateChatbotConfig, type ChatbotMode } from '../../lib/api/chatbot-config';
import { useNotification } from '../../lib/notification';
import { useResponsive } from '../../lib/useResponsive';

type ChatbotModeOption = {
  value: ChatbotMode;
  label: string;
  labelEn: string;
  desc: string;
  descEn: string;
  recommended?: boolean;
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

export default function AISettingsScreen() {
  const { sz } = useResponsive();
  const { language } = useLanguageStore();
  const t = translations[language];
  const isVi = language === 'vi';
  const { showSuccess, showError } = useNotification();

  // Responsive values
  const contentPadding = sz(16);
  const contentPaddingBottom = sz(40);

  const [mode, setMode] = useState<ChatbotMode>('BALANCED');
  const [originalMode, setOriginalMode] = useState<ChatbotMode>('BALANCED');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);

  useEffect(() => {
    const { getTenantInfo } = require('../../lib/api/tenant-settings');
    getTenantInfo().then(info => {
      if (info?.logoUrl) setTenantLogo(info.logoUrl);
    }).catch(() => {});
  }, []);

  async function loadConfig() {
    try {
      setError(null);
      const config = await getChatbotConfig();
      setMode(config.mode || 'BALANCED');
      setOriginalMode(config.mode || 'BALANCED');
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
      await updateChatbotConfig({ mode, embeddingProvider: 'GEMINI' });
      setOriginalMode(mode);
      showSuccess(isVi ? 'Đã lưu cài đặt AI' : 'AI settings saved', isVi ? 'Thành công' : 'Success');
    } catch (e: any) {
      console.log('Save error:', e);
      showError(isVi ? 'Không thể lưu cài đặt' : 'Failed to save settings', isVi ? 'Lỗi' : 'Error');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = mode !== originalMode;

  if (loading) {
    return (
      <AppShell title={isVi ? 'Cài đặt AI' : 'AI Settings'}>
        <View style={[styles.centerContainer]}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={[styles.loadingText, { marginTop: sz(12) }]}>
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
        contentContainerStyle={[styles.contentContainer, { padding: contentPadding, paddingBottom: contentPaddingBottom }]}
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
            <Ionicons name="chatbubbles-outline" size={sz(20)} color="#10b981" />
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
              style={[styles.optionCard, mode === option.value && styles.optionCardSelected]}
              onPress={() => setMode(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.optionRadio}>
                <View style={[styles.radioOuter, mode === option.value && styles.radioOuterSelected]}>
                  {mode === option.value && <View style={styles.radioInner} />}
                </View>
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <Text style={[styles.optionLabel, mode === option.value && styles.optionLabelSelected]}>
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

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={sz(20)} color="#fff" />
              <Text style={styles.saveBtnText}>
                {isVi ? 'Lưu cài đặt' : 'Save Settings'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <View style={styles.footerIcon}>
            <AppLogo size={20} tenantLogoUrl={tenantLogo} />
          </View>
          <Text style={styles.footerText}>
            {isVi ? 'AI Chatbot For Tenants' : 'AI Chatbot For Tenants'}
          </Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  contentContainer: {},
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', fontSize: 14 },
  errorContainer: { backgroundColor: 'rgba(248, 113, 113, 0.12)', borderRadius: 8 },
  errorText: { color: '#f87171', fontSize: 13 },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontWeight: '600', color: '#f1f5f9', fontSize: 17, marginLeft: 8 },
  sectionDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  optionCardSelected: { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)' },
  optionRadio: { marginTop: 2, marginRight: 12 },
  radioOuter: { borderWidth: 2, borderColor: '#475569', justifyContent: 'center', alignItems: 'center', width: 20, height: 20, borderRadius: 10 },
  radioOuterSelected: { borderColor: '#10b981' },
  radioInner: { backgroundColor: '#10b981', width: 10, height: 10, borderRadius: 5 },
  optionContent: { flex: 1 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  optionLabel: { fontWeight: '600', color: '#f1f5f9', fontSize: 15 },
  optionLabelSelected: { color: '#10b981' },
  optionDesc: { color: '#94a3b8', fontSize: 13, marginTop: 4, lineHeight: 18 },
  badge: { backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontWeight: '600', color: '#10b981', fontSize: 11 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 20 },
  footerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: { color: '#64748b', fontSize: 12 },
});
