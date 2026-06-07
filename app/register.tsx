import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { registerTenant, type TenantRegistrationRequest } from '../lib/api/register';
import { useLanguageStore, translations } from '../lib/language-store';
import { PickerModal, SuccessModal, ErrorModal } from '../components/ui/CustomModal';

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 nhân viên', labelEn: '1-10 employees' },
  { value: '11-50', label: '11-50 nhân viên', labelEn: '11-50 employees' },
  { value: '51-200', label: '51-200 nhân viên', labelEn: '51-200 employees' },
  { value: '201-500', label: '201-500 nhân viên', labelEn: '201-500 employees' },
  { value: '500+', label: '500+ nhân viên', labelEn: '500+ employees' },
];

export default function RegisterTenantScreen() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const t = translations[language];

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSizePicker, setShowSizePicker] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [representativePosition, setRepresentativePosition] = useState('');
  const [representativePhone, setRepresentativePhone] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [requestMessage, setRequestMessage] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!companyName.trim()) {
      newErrors.companyName = isVi ? 'Vui lòng nhập tên công ty' : 'Please enter company name';
    }
    if (!contactEmail.trim()) {
      newErrors.contactEmail = isVi ? 'Vui lòng nhập email liên hệ' : 'Please enter contact email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      newErrors.contactEmail = isVi ? 'Email không đúng định dạng' : 'Invalid email format';
    }
    if (representativePhone.trim() && !/^(0\d{9}|(\+84)\d{9})$/.test(representativePhone.trim().replace(/\s+/g, ''))) {
      newErrors.representativePhone = isVi ? 'Số điện thoại không hợp lệ' : 'Invalid phone number';
    }
    if (website.trim()) {
      try {
        new URL(website.trim());
      } catch {
        newErrors.website = isVi ? 'Website không đúng định dạng URL' : 'Invalid URL format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      setErrorMessage(isVi ? 'Vui lòng kiểm tra lại thông tin đã nhập.' : 'Please check your entered information.');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      const data: TenantRegistrationRequest = {
        companyName: companyName.trim(),
        contactEmail: contactEmail.trim(),
        address: address.trim() || undefined,
        website: website.trim() || undefined,
        companySize: companySize || undefined,
        representativeName: representativeName.trim() || undefined,
        representativePosition: representativePosition.trim() || undefined,
        representativePhone: representativePhone.trim() || undefined,
        requestMessage: requestMessage.trim() || undefined,
      };

      await registerTenant(data);
      setShowSuccessModal(true);
    } catch (e: any) {
      setErrorMessage(e.message || (isVi ? 'Đăng ký thất bại. Vui lòng thử lại.' : 'Registration failed. Please try again.'));
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }

  function getCompanySizeLabel(value: string) {
    const size = COMPANY_SIZES.find(s => s.value === value);
    if (!size) return '';
    return isVi ? size.label : size.labelEn;
  }

  if (success) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0f172a', '#134e4a', '#0f172a']}
          style={styles.background}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#10b981" />
          </View>
          <Text style={styles.successTitle}>
            {isVi ? 'Yêu cầu đã được gửi!' : 'Request Submitted!'}
          </Text>
          <Text style={styles.successDesc}>
            {isVi
              ? 'Yêu cầu đăng ký của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và liên hệ với bạn sớm.'
              : 'Your registration request has been submitted successfully. We will review and contact you soon.'}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.backButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.backButtonText}>
                {isVi ? 'Quay lại' : 'Go Back'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace('/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>
              {isVi ? 'Đã có tài khoản? Đăng nhập' : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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
              style={styles.backArrow}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isVi ? 'Đăng ký tổ chức' : 'Register Organization'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formSubtitle}>
              {isVi
                ? 'Đăng ký tổ chức của bạn để bắt đầu sử dụng AI chatbot.'
                : 'Register your organization to get started with AI chatbot.'}
            </Text>

            {/* Company Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isVi ? 'Tên công ty *' : 'Company Name *'}
              </Text>
              <TextInput
                style={[styles.input, errors.companyName && styles.inputError]}
                placeholder={isVi ? 'Nhập tên công ty' : 'Enter company name'}
                placeholderTextColor="#64748b"
                value={companyName}
                onChangeText={(text) => {
                  setCompanyName(text);
                  if (errors.companyName) setErrors({ ...errors, companyName: '' });
                }}
              />
              {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}
            </View>

            {/* Contact Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isVi ? 'Email liên hệ *' : 'Contact Email *'}
              </Text>
              <TextInput
                style={[styles.input, errors.contactEmail && styles.inputError]}
                placeholder={isVi ? 'contact@company.com' : 'contact@company.com'}
                placeholderTextColor="#64748b"
                value={contactEmail}
                onChangeText={(text) => {
                  setContactEmail(text);
                  if (errors.contactEmail) setErrors({ ...errors, contactEmail: '' });
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {errors.contactEmail && <Text style={styles.errorText}>{errors.contactEmail}</Text>}
            </View>

            {/* Representative Name & Position */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {isVi ? 'Người đại diện' : 'Representative'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={isVi ? 'Họ và tên' : 'Full name'}
                  placeholderTextColor="#64748b"
                  value={representativeName}
                  onChangeText={setRepresentativeName}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {isVi ? 'Chức vụ' : 'Position'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={isVi ? 'Chức vụ' : 'Position'}
                  placeholderTextColor="#64748b"
                  value={representativePosition}
                  onChangeText={setRepresentativePosition}
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isVi ? 'Số điện thoại' : 'Phone Number'}
              </Text>
              <TextInput
                style={[styles.input, errors.representativePhone && styles.inputError]}
                placeholder={isVi ? '+84 xxx xxx xxx' : '+84 xxx xxx xxx'}
                placeholderTextColor="#64748b"
                value={representativePhone}
                onChangeText={(text) => {
                  setRepresentativePhone(text);
                  if (errors.representativePhone) setErrors({ ...errors, representativePhone: '' });
                }}
                keyboardType="phone-pad"
              />
              {errors.representativePhone && <Text style={styles.errorText}>{errors.representativePhone}</Text>}
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isVi ? 'Địa chỉ' : 'Address'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={isVi ? '123 Đường ABC, Thành phố' : '123 Main St, City'}
                placeholderTextColor="#64748b"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* Website & Company Size */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {isVi ? 'Website' : 'Website'}
                </Text>
                <TextInput
                  style={[styles.input, errors.website && styles.inputError]}
                  placeholder="https://company.com"
                  placeholderTextColor="#64748b"
                  value={website}
                  onChangeText={(text) => {
                    setWebsite(text);
                    if (errors.website) setErrors({ ...errors, website: '' });
                  }}
                  autoCapitalize="none"
                />
                {errors.website && <Text style={styles.errorText}>{errors.website}</Text>}
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {isVi ? 'Quy mô' : 'Company Size'}
                </Text>
                <TouchableOpacity
                  style={styles.selectWrapper}
                  onPress={() => setShowSizePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.select,
                    !companySize && styles.selectPlaceholder
                  ]}>
                    {companySize ? getCompanySizeLabel(companySize) : (isVi ? 'Chọn quy mô' : 'Select size')}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748b" style={styles.selectArrow} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Message */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isVi ? 'Lời nhắn (tùy chọn)' : 'Message (Optional)'}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={isVi ? 'Chia sẻ thêm về nhu cầu của bạn...' : 'Tell us about your needs...'}
                placeholderTextColor="#64748b"
                value={requestMessage}
                onChangeText={setRequestMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
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
                  <Text style={styles.submitBtnText}>
                    {isVi ? 'Gửi yêu cầu' : 'Submit Request'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace('/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLinkText}>
                {isVi ? 'Đã có tài khoản? Đăng nhập' : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker Modal */}
      <PickerModal
        visible={showSizePicker}
        title={isVi ? 'Chọn quy mô công ty' : 'Select Company Size'}
        options={COMPANY_SIZES.map(size => ({
          label: isVi ? size.label : size.labelEn,
          value: size.value,
        }))}
        selectedValue={companySize}
        onSelect={setCompanySize}
        onClose={() => setShowSizePicker(false)}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title={isVi ? 'Thành công!' : 'Success!'}
        message={isVi
          ? 'Yêu cầu đăng ký của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và liên hệ với bạn sớm.'
          : 'Your registration request has been submitted successfully. We will review and contact you soon.'}
        buttonText={isVi ? 'Đã hiểu' : 'Got it'}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccess(true);
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backArrow: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  formCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f1f5f9',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#f87171',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  select: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f1f5f9',
  },
  selectPlaceholder: {
    color: '#64748b',
  },
  selectArrow: {
    marginRight: 4,
  },
  submitBtn: {
    marginTop: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  // Success screen
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  backButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
