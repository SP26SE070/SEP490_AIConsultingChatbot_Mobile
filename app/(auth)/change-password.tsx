import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguageStore, translations } from '../../lib/language-store';
import { fetchWithAuth } from '../../lib/api/fetchWithAuth';
import { API_BASE_URL } from '../../lib/api/config';
import { clearMustChangePasswordFlag } from '../../lib/auth-store';
import { SuccessModal, ErrorModal } from '../../components/ui/CustomModal';
import { useResponsive } from '../../lib/useResponsive';

const C = {
  bg: '#0f172a',
  surface: 'rgba(30, 41, 59, 0.9)',
  border: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  accent: '#10b981',
  warning: '#fbbf24',
  danger: '#ef4444',
};

export default function ChangePasswordScreen() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const t = translations[language];
  const { sz, fs } = useResponsive();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const passwordRequirements = [
    { test: (p: string) => p.length >= 8, label: isVi ? 'Ít nhất 8 ký tự' : 'At least 8 characters' },
    { test: (p: string) => /[A-Z]/.test(p), label: isVi ? 'Ít nhất 1 chữ hoa' : 'At least 1 uppercase letter' },
    { test: (p: string) => /[a-z]/.test(p), label: isVi ? 'Ít nhất 1 chữ thường' : 'At least 1 lowercase letter' },
    { test: (p: string) => /\d/.test(p), label: isVi ? 'Ít nhất 1 số' : 'At least 1 number' },
    { test: (p: string) => /[@$!%*?&#^]/.test(p), label: isVi ? 'Ít nhất 1 ký tự đặc biệt' : 'At least 1 special character' },
  ];

  function validateForm(): string | null {
    if (!newPassword) {
      return isVi ? 'Vui lòng nhập mật khẩu mới.' : 'Please enter a new password.';
    }
    for (const req of passwordRequirements) {
      if (!req.test(newPassword)) {
        return isVi ? 'Mật khẩu không đáp ứng yêu cầu.' : 'Password does not meet requirements.';
      }
    }
    if (!confirmPassword) {
      return isVi ? 'Vui lòng xác nhận mật khẩu.' : 'Please confirm your password.';
    }
    if (newPassword !== confirmPassword) {
      return isVi ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.';
    }
    return null;
  }

  async function handleChangePassword() {
    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/v1/profile/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword }),
      });

      if (res.ok) {
        await clearMustChangePasswordFlag();
        setShowSuccessModal(true);
      } else {
        const data = await res.json().catch(() => null);
        setErrorMessage(data?.message || (isVi ? 'Không thể đổi mật khẩu.' : 'Cannot change password.'));
        setShowErrorModal(true);
      }
    } catch (e) {
      setErrorMessage(isVi ? 'Đã xảy ra lỗi.' : 'An error occurred.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[C.bg, '#134e4a', C.bg]} style={styles.background} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.header, { paddingTop: sz(60), paddingHorizontal: sz(4), marginBottom: sz(20) }]}>
            <TouchableOpacity
              style={[styles.backBtn, { width: sz(48), height: sz(48), borderRadius: sz(14) }]}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}
              activeOpacity={0.7}
            >
              <View style={styles.backBtnInner}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={[styles.logoContainer, { width: sz(48), height: sz(48), borderRadius: sz(14) }]}>
              <Ionicons name="shield-checkmark" size={22} color={C.accent} />
            </View>
          </View>

          <View style={[styles.requiredNotice, { borderRadius: sz(12), paddingHorizontal: sz(14), paddingVertical: sz(12), marginBottom: sz(24) }]}>
            <Ionicons name="information-circle" size={18} color={C.warning} />
            <Text style={[styles.requiredText, { marginLeft: sz(10), fontSize: fs(13), lineHeight: fs(18) }]}>
              {isVi ? 'Bạn cần đặt mật khẩu mới để tiếp tục sử dụng tài khoản.' : 'You need to set a new password to continue using your account.'}
            </Text>
          </View>

          <View style={[styles.headerContent, { marginBottom: sz(32) }]}>
            <View style={[styles.iconContainer, { width: sz(80), height: sz(80), borderRadius: sz(40), marginBottom: sz(20) }]}>
              <Ionicons name="shield-checkmark" size={40} color={C.accent} />
            </View>
            <Text style={[styles.title, { fontSize: fs(26), marginBottom: sz(8) }]}>
              {isVi ? 'Đặt mật khẩu mới' : 'Set New Password'}
            </Text>
            <Text style={[styles.subtitle, { fontSize: fs(14), lineHeight: fs(20), paddingHorizontal: sz(20) }]}>
              {isVi ? 'Vui lòng tạo mật khẩu mới cho tài khoản của bạn.' : 'Please create a new password for your account.'}
            </Text>
          </View>

          <View style={[styles.formCard, { borderRadius: sz(20), padding: sz(24) }]}>
            <View style={[styles.inputGroup, { marginBottom: sz(20) }]}>
              <Text style={[styles.label, { fontSize: fs(13), marginBottom: sz(8) }]}>
                {isVi ? 'Mật khẩu mới' : 'New Password'}
              </Text>
              <View style={[styles.inputWrapper, { borderRadius: sz(12) }]}>
                <Ionicons name="key-outline" size={20} color={C.textMuted} style={[styles.inputIcon, { marginLeft: sz(14) }]} />
                <TextInput
                  style={[styles.input, { paddingVertical: sz(14), paddingHorizontal: sz(12), fontSize: fs(16) }]}
                  placeholder={isVi ? 'Nhập mật khẩu mới' : 'Enter new password'}
                  placeholderTextColor={C.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={[styles.eyeBtn, { padding: sz(14) }]}>
                  <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.inputGroup, { marginBottom: sz(20) }]}>
              <Text style={[styles.label, { fontSize: fs(13), marginBottom: sz(8) }]}>
                {isVi ? 'Xác nhận mật khẩu' : 'Confirm Password'}
              </Text>
              <View style={[styles.inputWrapper, { borderRadius: sz(12) }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={C.textMuted} style={[styles.inputIcon, { marginLeft: sz(14) }]} />
                <TextInput
                  style={[styles.input, { paddingVertical: sz(14), paddingHorizontal: sz(12), fontSize: fs(16) }]}
                  placeholder={isVi ? 'Nhập lại mật khẩu mới' : 'Re-enter new password'}
                  placeholderTextColor={C.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={[styles.eyeBtn, { padding: sz(14) }]}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.requirementsCard, { borderRadius: sz(12), padding: sz(16), marginBottom: sz(24) }]}>
              <Text style={[styles.requirementsTitle, { fontSize: fs(12), marginBottom: sz(12) }]}>
                {isVi ? 'Yêu cầu mật khẩu:' : 'Password requirements:'}
              </Text>
              {passwordRequirements.map((req, index) => {
                const isValid = newPassword && req.test(newPassword);
                return (
                  <View key={index} style={[styles.requirementRow, { marginBottom: sz(8) }]}>
                    <View style={[styles.requirementIcon, { width: sz(20), height: sz(20), borderRadius: sz(10) }, isValid && styles.requirementIconValid]}>
                      {isValid ? <Ionicons name="checkmark" size={12} color={C.accent} /> : <View style={styles.requirementDot} />}
                    </View>
                    <Text style={[styles.requirementText, { fontSize: fs(13), flex: 1 }, isValid && styles.requirementTextValid]}>
                      {req.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { borderRadius: sz(14), opacity: loading ? 0.6 : 1 }]}
              onPress={handleChangePassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={loading ? ['#6b7280', '#4b5563'] : [C.accent, '#059669']} style={[styles.submitBtnGradient, { paddingVertical: sz(16), gap: sz(10) }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="shield-checkmark" size={20} color="#fff" /><Text style={[styles.submitBtnText, { fontSize: fs(16) }]}>{isVi ? 'Đặt mật khẩu' : 'Set Password'}</Text></>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={showSuccessModal}
        title={isVi ? 'Thành công!' : 'Success!'}
        message={isVi ? 'Mật khẩu đã được thay đổi. Đang chuyển hướng...' : 'Password changed successfully. Redirecting...'}
        buttonText="OK"
        onClose={() => { setShowSuccessModal(false); router.replace('/chatbot'); }}
      />

      <ErrorModal
        visible={showErrorModal}
        title={isVi ? 'Đã xảy ra lỗi' : 'Error'}
        message={errorMessage}
        buttonText={isVi ? 'Đóng' : 'Close'}
        onClose={() => setShowErrorModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  background: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(100, 116, 139, 0.3)' },
  backBtnInner: { alignItems: 'center', justifyContent: 'center' },
  logoContainer: { backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  requiredNotice: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.3)' },
  requiredText: { flex: 1, color: C.warning },
  headerContent: { alignItems: 'center' },
  iconContainer: { backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.3)' },
  title: { fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { color: C.textMuted, textAlign: 'center' },
  formCard: { backgroundColor: 'rgba(30, 41, 59, 0.98)', borderWidth: 1, borderColor: C.border },
  inputGroup: {},
  label: { fontWeight: '600', color: '#e2e8f0' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  inputIcon: {},
  input: { flex: 1, color: C.text },
  eyeBtn: {},
  requirementsCard: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  requirementsTitle: { fontWeight: '600', color: C.textMuted },
  requirementRow: { flexDirection: 'row', alignItems: 'center' },
  requirementIcon: { borderWidth: 1.5, borderColor: '#475569', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  requirementIconValid: { borderColor: C.accent, backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  requirementDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#475569' },
  requirementText: { color: C.textMuted },
  requirementTextValid: { color: C.accent },
  submitBtn: { overflow: 'hidden', shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
});
