import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguageStore, translations } from '../lib/language-store';
import { fetchWithAuth } from '../lib/api/fetchWithAuth';
import { API_BASE_URL } from '../lib/api/config';
import { clearMustChangePasswordFlag } from '../lib/auth-store';
import { SuccessModal, ErrorModal } from '../components/ui/CustomModal';

export default function ChangePasswordScreen() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const t = translations[language];

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
        body: JSON.stringify({
          newPassword: newPassword,
        }),
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
      <LinearGradient
        colors={['#0f172a', '#134e4a', '#0f172a']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}
              activeOpacity={0.7}
            >
              <View style={styles.backBtnInner}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Ionicons name="shield-checkmark" size={22} color="#10b981" />
            </View>
          </View>

          {/* Required Notice */}
          <View style={styles.requiredNotice}>
            <Ionicons name="information-circle" size={18} color="#fbbf24" />
            <Text style={styles.requiredText}>
              {isVi
                ? 'Bạn cần đặt mật khẩu mới để tiếp tục sử dụng tài khoản.'
                : 'You need to set a new password to continue using your account.'}
            </Text>
          </View>

          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={40} color="#10b981" />
            </View>
            <Text style={styles.title}>
              {isVi ? 'Đặt mật khẩu mới' : 'Set New Password'}
            </Text>
            <Text style={styles.subtitle}>
              {isVi
                ? 'Vui lòng tạo mật khẩu mới cho tài khoản của bạn.'
                : 'Please create a new password for your account.'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isVi ? 'Mật khẩu mới' : 'New Password'}
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="key-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={isVi ? 'Nhập mật khẩu mới' : 'Enter new password'}
                  placeholderTextColor="#64748b"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isVi ? 'Xác nhận mật khẩu' : 'Confirm Password'}
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={isVi ? 'Nhập lại mật khẩu mới' : 'Re-enter new password'}
                  placeholderTextColor="#64748b"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Password Requirements */}
            <View style={styles.requirementsCard}>
              <Text style={styles.requirementsTitle}>
                {isVi ? 'Yêu cầu mật khẩu:' : 'Password requirements:'}
              </Text>
              {passwordRequirements.map((req, index) => {
                const isValid = newPassword && req.test(newPassword);
                return (
                  <View key={index} style={styles.requirementRow}>
                    <View style={[
                      styles.requirementIcon,
                      isValid && styles.requirementIconValid
                    ]}>
                      {isValid ? (
                        <Ionicons name="checkmark" size={12} color="#10b981" />
                      ) : (
                        <View style={styles.requirementDot} />
                      )}
                    </View>
                    <Text style={[
                      styles.requirementText,
                      isValid && styles.requirementTextValid
                    ]}>
                      {req.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                loading && styles.submitBtnDisabled
              ]}
              onPress={handleChangePassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#6b7280', '#4b5563'] : ['#10b981', '#059669']}
                style={styles.submitBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={20} color="#fff" />
                    <Text style={styles.submitBtnText}>
                      {isVi ? 'Đặt mật khẩu' : 'Set Password'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={isVi ? 'Thành công!' : 'Success!'}
        message={isVi
          ? 'Mật khẩu đã được thay đổi. Đang chuyển hướng...'
          : 'Password changed successfully. Redirecting...'}
        buttonText="OK"
        onClose={() => {
          setShowSuccessModal(false);
          router.replace('/chatbot');
        }}
      />

      {/* Error Modal */}
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
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    marginBottom: 20,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  backBtnInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  requiredNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  requiredText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#fbbf24',
    lineHeight: 18,
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#f1f5f9',
  },
  eyeBtn: {
    padding: 14,
  },
  requirementsCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  requirementIconValid: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#475569',
  },
  requirementText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  requirementTextValid: {
    color: '#10b981',
  },
  submitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
