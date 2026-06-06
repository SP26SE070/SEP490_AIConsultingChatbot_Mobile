import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { registerTenant, type TenantRegistrationRequest } from '../../lib/api/register';
import { useLanguageStore, translations } from '../../lib/language-store';
import { PickerModal, SuccessModal, ErrorModal } from '../../components/ui/CustomModal';
import { useResponsive } from '../../lib/useResponsive';

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 nhân viên', labelEn: '1-10 employees' },
  { value: '11-50', label: '11-50 nhân viên', labelEn: '11-50 employees' },
  { value: '51-200', label: '51-200 nhân viên', labelEn: '51-200 employees' },
  { value: '201-500', label: '201-500 nhân viên', labelEn: '201-500 employees' },
  { value: '500+', label: '500+ nhân viên', labelEn: '500+ employees' },
];

const C = {
  bg: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  accent: '#10b981',
  accentDark: '#059669',
  danger: '#ef4444',
};

export default function RegisterTenantScreen() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const t = translations[language];
  const { gap, sz, fs } = useResponsive();

  const headerPaddingTop = sz(60);
  const headerPaddingHorizontal = sz(20);
  const headerPaddingBottom = sz(20);
  const backArrowSize = sz(44);
  const headerTitleSize = fs(22);
  const formCardMarginHorizontal = sz(16);
  const formCardBorderRadius = sz(24);
  const formCardPadding = sz(24);
  const inputBorderRadius = sz(12);
  const inputPaddingHorizontal = sz(16);
  const inputPaddingVertical = sz(14);
  const inputGroupMarginBottom = sz(16);
  const submitBtnBorderRadius = sz(14);
  const submitBtnPaddingVertical = sz(16);
  const successIconSize = sz(80);
  const successTitleSize = fs(26);

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
        <LinearGradient colors={[C.bg, '#134e4a', C.bg]} style={styles.background} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={C.accent} />
          </View>
          <Text style={[styles.successTitle, { fontSize: successTitleSize }]}>
            {isVi ? 'Yêu cầu đã được gửi!' : 'Request Submitted!'}
          </Text>
          <Text style={[styles.successDesc, { fontSize: fs(15), lineHeight: fs(22), marginBottom: sz(32) }]}>
            {isVi ? 'Yêu cầu đăng ký của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và liên hệ với bạn sớm.' : 'Your registration request has been submitted successfully. We will review and contact you soon.'}
          </Text>
          <TouchableOpacity style={[styles.backButton, { borderRadius: submitBtnBorderRadius }]} onPress={() => router.back()} activeOpacity={0.8}>
            <LinearGradient colors={[C.accent, C.accentDark]} style={styles.backButtonGradient}>
              <Text style={[styles.backButtonText, { fontSize: fs(16) }]}>{isVi ? 'Quay lại' : 'Go Back'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/login')} activeOpacity={0.7}>
            <Text style={styles.loginLinkText}>{isVi ? 'Đã có tài khoản? Đăng nhập' : 'Already have an account? Sign in'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[C.bg, '#134e4a', C.bg]} style={styles.background} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.header, { paddingTop: headerPaddingTop, paddingHorizontal: headerPaddingHorizontal, paddingBottom: headerPaddingBottom }]}>
            <TouchableOpacity style={[styles.backArrow, { width: backArrowSize, height: backArrowSize, borderRadius: sz(12), marginRight: sz(16) }]} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: headerTitleSize }]}>{isVi ? 'Đăng ký tổ chức' : 'Register Organization'}</Text>
          </View>

          <View style={[styles.formCard, { marginHorizontal: formCardMarginHorizontal, borderRadius: formCardBorderRadius, padding: formCardPadding }]}>
            <Text style={[styles.formSubtitle, { fontSize: fs(14), lineHeight: fs(20), marginBottom: sz(24) }]}>
              {isVi ? 'Đăng ký tổ chức của bạn để bắt đầu sử dụng AI chatbot.' : 'Register your organization to get started with AI chatbot.'}
            </Text>

            <View style={[styles.inputGroup, { marginBottom: inputGroupMarginBottom }]}>
              <Text style={[styles.label, { fontSize: fs(13), marginBottom: sz(8) }]}>{isVi ? 'Tên công ty *' : 'Company Name *'}</Text>
              <TextInput
                style={[styles.input, { borderRadius: inputBorderRadius, paddingHorizontal: inputPaddingHorizontal, paddingVertical: inputPaddingVertical, fontSize: fs(16) }, errors.companyName && { borderColor: C.danger }]}
                placeholder={isVi ? 'Nhập tên công ty' : 'Enter company name'}
                placeholderTextColor={C.textMuted}
                value={companyName}
                onChangeText={(text) => { setCompanyName(text); if (errors.companyName) setErrors({ ...errors, companyName: '' }); }}
              />
              {errors.companyName && <Text style={[styles.errorText, { fontSize: fs(12), marginTop: sz(4) }]}>{errors.companyName}</Text>}
            </View>

            <View style={[styles.inputGroup, { marginBottom: inputGroupMarginBottom }]}>
              <Text style={[styles.label, { fontSize: fs(13), marginBottom: sz(8) }]}>{isVi ? 'Email liên hệ *' : 'Contact Email *'}</Text>
              <TextInput
                style={[styles.input, { borderRadius: inputBorderRadius, paddingHorizontal: inputPaddingHorizontal, paddingVertical: inputPaddingVertical, fontSize: fs(16) }, errors.contactEmail && { borderColor: C.danger }]}
                placeholder="contact@company.com"
                placeholderTextColor={C.textMuted}
                value={contactEmail}
                onChangeText={(text) => { setContactEmail(text); if (errors.contactEmail) setErrors({ ...errors, contactEmail: '' }); }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {errors.contactEmail && <Text style={[styles.errorText, { fontSize: fs(12), marginTop: sz(4) }]}>{errors.contactEmail}</Text>}
            </View>

            <View style={[styles.row, { gap: sz(12) }]}>
              <View style={[styles.inputGroup, { flex: 1, marginBottom: inputGroupMarginBottom }]}>
                <Text style={[styles.label, { fontSize: fs(13), marginBottom: sz(8) }]}>{isVi ? 'Người đại diện' : 'Representative'}</Text>
                <TextInput style={[styles.input, { borderRadius: inputBorderRadius, paddingHorizontal: inputPaddingHorizontal, paddingVertical: inputPaddingVertical, fontSize: fs(16) }]} placeholder={isVi ? 'Họ và tên' : 'Full name'} placeholderTextColor={C.textMuted} value={representativeName} onChangeText={setRepresentativeName} />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginBottom: inputGroupMarginBottom }]}>
                <Text style={[styles.label, { fontSize: fs(13), marginBottom: sz(8) }]}>{isVi ? 'Chức vụ' : 'Position'}</Text>
                <TextInput style={[styles.input, { borderRadius: inputBorderRadius, paddingHorizontal: inputPaddingHorizontal, paddingVertical: inputPaddingVertical, fontSize: fs(16) }]} placeholder={isVi ? 'Chức vụ' : 'Position'} placeholderTextColor={C.textMuted} value={representativePosition} onChangeText={setRepresentativePosition} />
              </View>
            </View>

            <View style={[styles.inputGroup, { marginBottom: inputGroupMarginBottom }]}>
              <Text style={[styles.label, { fontSize: fs(13), marginBottom: sz(8) }]}>{isVi ? 'Số điện thoại' : 'Phone Number'}</Text>
              <TextInput
                style={[styles.input, { borderRadius: inputBorderRadius, paddingHorizontal: inputPaddingHorizontal, paddingVertical: inputPaddingVertical, fontSize: fs(16) }, errors.representativePhone && { borderColor: C.danger }]}
                placeholder="+84 xxx xxx xxx"
                placeholderTextColor={C.textMuted}
                value={representativePhone}
                onChangeText={(text) => { setRepresentativePhone(text); if (errors.representativePhone) setErrors({ ...errors, representativePhone: '' }); }}
                keyboardType="phone-pad"
              />
              {errors.representativePhone && <Text style={[styles.errorText, { fontSize: fs(12), marginTop: sz(4) }]}>{errors.representativePhone}</Text>}
            </View>

            <View style={[styles.inputGroup, { marginBottom: inputGroupMarginBottom }]}>
              <Text style={[styles.label, { fontSize: fs(13), marginBottom: sz(8) }]}>{isVi ? 'Địa chỉ' : 'Address'}</Text>
              <TextInput style={[styles.input, { borderRadius: inputBorderRadius, paddingHorizontal: inputPaddingHorizontal, paddingVertical: inputPaddingVertical, fontSize: fs(16) }]} placeholder={isVi ? '123 Đường ABC, Thành phố' : '123 Main St, City'} placeholderTextColor={C.textMuted} value={address} onChangeText={setAddress} />
            </View>

            <View style={[styles.row, { gap: sz(12) }]}>
              <View style={[styles.inputGroup, { flex: 1, marginBottom: inputGroupMarginBottom }]}>
                <Text style={[styles.label, { fontSize: fs(13), marginBottom: sz(8) }]}>{isVi ? 'Website' : 'Website'}</Text>
                <TextInput
                  style={[styles.input, { borderRadius: inputBorderRadius, paddingHorizontal: inputPaddingHorizontal, paddingVertical: inputPaddingVertical, fontSize: fs(16) }, errors.website && { borderColor: C.danger }]}
                  placeholder="https://company.com"
                  placeholderTextColor={C.textMuted}
                  value={website}
                  onChangeText={(text) => { setWebsite(text); if (errors.website) setErrors({ ...errors, website: '' }); }}
                  autoCapitalize="none"
                />
                {errors.website && <Text style={[styles.errorText, { fontSize: fs(12), marginTop: sz(4) }]}>{errors.website}</Text>}
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginBottom: inputGroupMarginBottom }]}>
                <Text style={[styles.label, { fontSize: fs(13), marginBottom: sz(8) }]}>{isVi ? 'Quy mô' : 'Company Size'}</Text>
                <TouchableOpacity style={[styles.selectWrapper, { borderRadius: inputBorderRadius }]} onPress={() => setShowSizePicker(true)} activeOpacity={0.7}>
                  <Text style={[styles.select, { paddingHorizontal: inputPaddingHorizontal, paddingVertical: inputPaddingVertical, fontSize: fs(16) }, !companySize && { color: C.textMuted }]}>{companySize ? getCompanySizeLabel(companySize) : (isVi ? 'Chọn quy mô' : 'Select size')}</Text>
                  <Ionicons name="chevron-down" size={20} color={C.textMuted} style={{ marginRight: sz(4) }} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.inputGroup, { marginBottom: inputGroupMarginBottom }]}>
              <Text style={[styles.label, { fontSize: fs(13), marginBottom: sz(8) }]}>{isVi ? 'Lời nhắn (tùy chọn)' : 'Message (Optional)'}</Text>
              <TextInput
                style={[styles.input, styles.textArea, { borderRadius: inputBorderRadius, paddingHorizontal: inputPaddingHorizontal, paddingVertical: inputPaddingVertical, fontSize: fs(16), minHeight: sz(100) }]}
                placeholder={isVi ? 'Chia sẻ thêm về nhu cầu của bạn...' : 'Tell us about your needs...'}
                placeholderTextColor={C.textMuted}
                value={requestMessage}
                onChangeText={setRequestMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { borderRadius: submitBtnBorderRadius, marginTop: sz(8), opacity: loading ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={loading ? ['#6b7280', '#4b5563'] : [C.accent, C.accentDark]} style={[styles.submitBtnGradient, { paddingVertical: submitBtnPaddingVertical }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.submitBtnText, { fontSize: fs(16) }]}>{isVi ? 'Gửi yêu cầu' : 'Submit Request'}</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.loginLink, { marginTop: sz(20) }]} onPress={() => router.replace('/login')} activeOpacity={0.7}>
              <Text style={styles.loginLinkText}>{isVi ? 'Đã có tài khoản? Đăng nhập' : 'Already have an account? Sign in'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerModal
        visible={showSizePicker}
        title={isVi ? 'Chọn quy mô công ty' : 'Select Company Size'}
        options={COMPANY_SIZES.map(size => ({ label: isVi ? size.label : size.labelEn, value: size.value }))}
        selectedValue={companySize}
        onSelect={setCompanySize}
        onClose={() => setShowSizePicker(false)}
      />

      <SuccessModal
        visible={showSuccessModal}
        title={isVi ? 'Thành công!' : 'Success!'}
        message={isVi ? 'Yêu cầu đăng ký của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và liên hệ với bạn sớm.' : 'Your registration request has been submitted successfully. We will review and contact you soon.'}
        buttonText={isVi ? 'Đã hiểu' : 'Got it'}
        onClose={() => { setShowSuccessModal(false); setSuccess(true); }}
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
  header: { flexDirection: 'row', alignItems: 'center' },
  backArrow: { backgroundColor: 'rgba(30, 41, 59, 0.8)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontWeight: '700', color: '#fff' },
  formCard: { backgroundColor: 'rgba(30, 41, 59, 0.98)', borderWidth: 1, borderColor: C.border },
  formSubtitle: { color: C.textMuted },
  inputGroup: {},
  label: { fontWeight: '600', color: '#e2e8f0' },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, color: C.text },
  inputError: { color: C.danger },
  textArea: { textAlignVertical: 'top' },
  errorText: { color: C.danger },
  row: { flexDirection: 'row' },
  selectWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  select: { flex: 1, color: C.text },
  selectPlaceholder: { color: C.textMuted },
  submitBtn: { overflow: 'hidden', shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnGradient: { alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
  loginLink: { alignItems: 'center', paddingVertical: 8 },
  loginLinkText: { fontSize: 14, color: C.accent, fontWeight: '500' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  successIcon: { marginBottom: 24 },
  successTitle: { fontWeight: '700', color: '#fff', marginBottom: 12, textAlign: 'center' },
  successDesc: { color: C.textMuted, textAlign: 'center' },
  backButton: { width: '100%', overflow: 'hidden', marginBottom: 16 },
  backButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  backButtonText: { color: '#fff', fontWeight: '700' },
});
