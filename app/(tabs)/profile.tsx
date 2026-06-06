import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  ScrollView, Modal, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getProfile, updateProfile, sendOtpForContactEmail, updateContactEmail } from '../../lib/api/profile';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { useNotification } from '../../lib/notification';
import { useResponsive } from '../../lib/useResponsive';

export default function ProfileScreen() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const { showToast, showSuccess, showError } = useNotification();
  const { gap, sz, fs } = useResponsive();

  // Responsive dimensions
  const contentPadding = sz(16);
  const contentPaddingBottom = sz(40);
  const headerCardPadding = sz(24);
  const headerCardBorderRadius = sz(24);
  const avatarSize = sz(88);
  const avatarBorderRadius = sz(44);
  const infoCardBorderRadius = sz(16);
  const infoCardPadding = sz(16);
  const inputBorderRadius = sz(12);
  const inputPadding = sz(14);

  // Styles responsive values (needed for module-level styles)
  const infoItemGap = sz(14);
  const infoItemPaddingV = sz(8);
  const infoIconWrapSize = sz(40);
  const infoIconWrapRadius = sz(12);
  const editBtnGap = sz(8);
  const editBtnPaddingV = sz(12);
  const editBtnRadius = sz(12);
  const editBtnMarginT = sz(4);
  const inputGroupGap = sz(8);
  const errorMarginT = sz(4);
  const buttonRowGap = sz(12);
  const buttonRowMarginT = sz(8);
  const cancelBtnPaddingV = sz(14);
  const cancelBtnRadius = sz(12);
  const saveBtnPaddingV = sz(14);
  const saveBtnRadius = sz(12);
  const menuItemGap = sz(14);
  const menuItemPaddingV = sz(12);
  const menuIconSize = sz(44);
  const menuIconRadius = sz(12);
  const appInfoPaddingV = sz(24);
  const appInfoGap = sz(8);
  const appInfoIconSize = sz(48);
  const appInfoIconRadius = sz(14);
  const modalOverlayBg = 'rgba(0,0,0,0.7)';
  const modalRadius = sz(24);
  const modalPadding = sz(24);
  const modalPaddingB = sz(40);
  const handleBarWidth = sz(40);
  const handleBarHeight = sz(4);
  const handleBarRadius = sz(2);
  const handleBarMarginB = sz(20);
  const modalTitleSize = fs(20);
  const modalInputGroupMarginB = sz(16);
  const modalLabelMarginB = sz(8);
  const modalInputPaddingV = sz(12);
  const dateRowGap = sz(12);
  const dateRowMarginB = sz(16);
  const errorBoxGap = sz(8);
  const errorBoxPadding = sz(12);
  const errorBoxRadius = sz(10);
  const errorBoxMarginB = sz(16);
  const modalBtnGap = sz(12);
  const modalBtnMarginT = sz(8);
  const modalBtnPaddingV = sz(14);
  const modalBtnRadius = sz(12);

  const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingContent: { alignItems: 'center', gap: 16 },
    loadingText: { color: '#94a3b8', fontSize: 15 },
    content: { padding: 16, paddingBottom: 24, gap: 20 },
    headerCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(16, 185, 129, 0.4)' },
    avatarText: { color: '#10b981', fontSize: 32, fontWeight: '700' },
    statusBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0f172a', borderRadius: 12 },
    userName: { color: '#f1f5f9', fontSize: 22, fontWeight: '700', marginBottom: 4 },
    userEmail: { color: '#94a3b8', fontSize: 14, marginBottom: 12 },
    roleChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
    roleText: { color: '#10b981', fontSize: 13, fontWeight: '600' },
    section: { gap: 12 },
    sectionTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', paddingLeft: 4 },
    infoCard: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', gap: 12 },
    editCard: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', gap: 16 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: infoItemGap, paddingVertical: infoItemPaddingV },
    infoIconWrap: { width: infoIconWrapSize, height: infoIconWrapSize, borderRadius: infoIconWrapRadius, backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center' },
    infoContent: { flex: 1 },
    infoLabel: { color: '#64748b', fontSize: fs(12), marginBottom: 2 },
    infoValue: { color: '#f1f5f9', fontSize: fs(15), fontWeight: '500' },
    editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: editBtnGap, paddingVertical: editBtnPaddingV, borderRadius: editBtnRadius, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)', marginTop: editBtnMarginT },
    editBtnText: { color: '#10b981', fontSize: fs(14), fontWeight: '600' },
    inputGroup: { gap: inputGroupGap },
    inputLabel: { color: '#94a3b8', fontSize: fs(13), fontWeight: '600' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: sz(12), backgroundColor: '#0f172a', borderRadius: inputBorderRadius, paddingHorizontal: inputPadding, paddingVertical: inputPadding, borderWidth: 1, borderColor: '#334155' },
    input: { flex: 1, color: '#f1f5f9', fontSize: fs(15) },
    errorText: { color: '#f87171', fontSize: fs(12), marginTop: errorMarginT },
    buttonRow: { flexDirection: 'row', gap: buttonRowGap, marginTop: buttonRowMarginT },
    cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: editBtnGap, paddingVertical: cancelBtnPaddingV, borderRadius: cancelBtnRadius, backgroundColor: '#334155', borderWidth: 1, borderColor: '#475569' },
    cancelBtnText: { color: '#94a3b8', fontSize: fs(15), fontWeight: '600' },
    saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: editBtnGap, paddingVertical: saveBtnPaddingV, borderRadius: saveBtnRadius, backgroundColor: '#10b981' },
    saveBtnText: { color: '#fff', fontSize: fs(15), fontWeight: '600' },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: menuItemGap, paddingVertical: menuItemPaddingV },
    menuIcon: { width: menuIconSize, height: menuIconSize, borderRadius: menuIconRadius, backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center' },
    menuContent: { flex: 1 },
    menuTitle: { color: '#f1f5f9', fontSize: fs(15), fontWeight: '600', marginBottom: 2 },
    menuSubtitle: { color: '#64748b', fontSize: fs(13) },
    btnDisabled: { opacity: 0.6 },
    appInfo: { alignItems: 'center', paddingVertical: appInfoPaddingV, gap: appInfoGap },
    appInfoIcon: { width: appInfoIconSize, height: appInfoIconSize, borderRadius: appInfoIconRadius, backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center' },
    appName: { color: '#f1f5f9', fontSize: fs(16), fontWeight: '700' },
    appVersion: { color: '#64748b', fontSize: fs(13) },
  });

  const modalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: modalOverlayBg, justifyContent: 'flex-end' },
    modal: { backgroundColor: '#1e293b', borderTopLeftRadius: modalRadius, borderTopRightRadius: modalRadius, padding: modalPadding, paddingBottom: modalPaddingB },
    handleBar: { width: handleBarWidth, height: handleBarHeight, backgroundColor: '#475569', borderRadius: handleBarRadius, alignSelf: 'center', marginBottom: handleBarMarginB },
    title: { color: '#f1f5f9', fontSize: modalTitleSize, fontWeight: '700', textAlign: 'center', marginBottom: sz(24) },
    inputGroup: { marginBottom: modalInputGroupMarginB },
    label: { color: '#94a3b8', fontSize: fs(13), fontWeight: '600', marginBottom: modalLabelMarginB },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: sz(12), backgroundColor: '#0f172a', borderRadius: inputBorderRadius, paddingHorizontal: inputPadding, paddingVertical: modalInputPaddingV, borderWidth: 1, borderColor: '#334155' },
    input: { flex: 1, color: '#f1f5f9', fontSize: fs(15) },
    dateRow: { flexDirection: 'row', gap: dateRowGap, marginBottom: dateRowMarginB },
    dateField: { flex: 1 },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: errorBoxGap, backgroundColor: 'rgba(248, 113, 113, 0.15)', borderRadius: errorBoxRadius, padding: errorBoxPadding, marginBottom: errorBoxMarginB, borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.3)' },
    errorText: { color: '#f87171', fontSize: fs(13), flex: 1 },
    buttonRow: { flexDirection: 'row', gap: modalBtnGap, marginTop: modalBtnMarginT },
    cancelBtn: { flex: 1, paddingVertical: modalBtnPaddingV, borderRadius: modalBtnRadius, backgroundColor: '#334155', alignItems: 'center', borderWidth: 1, borderColor: '#475569' },
    cancelBtnText: { color: '#94a3b8', fontSize: fs(15), fontWeight: '600' },
    primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: editBtnGap, paddingVertical: modalBtnPaddingV, borderRadius: modalBtnRadius, backgroundColor: '#10b981' },
    primaryBtnText: { color: '#fff', fontSize: fs(15), fontWeight: '600' },
  });

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Update Profile
  const [editingProfile, setEditingProfile] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempYear, setTempYear] = useState('');
  const [tempMonth, setTempMonth] = useState('');
  const [tempDay, setTempDay] = useState('');
  const [dateError, setDateError] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Update Contact Email
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newContactEmail, setNewContactEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await getProfile();
      setProfile(data);
      setPhoneNumber(data.phoneNumber || '');
      setAddress(data.address || '');
      setDateOfBirth(data.dateOfBirth || '');
      
      if (data.dateOfBirth) {
        const parts = data.dateOfBirth.split('-');
        if (parts.length === 3) {
          setTempYear(parts[0]);
          setTempMonth(parts[1]);
          setTempDay(parts[2]);
        }
      }
    } catch (e) {
      showError('Không thể tải thông tin cá nhân', 'Lỗi');
    } finally {
      setLoading(false);
    }
  }

  function validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^0\d{9,10}$/;
    return phoneRegex.test(phone);
  }

  function validateDate(year: string, month: string, day: string): boolean {
    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);
    
    if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
    if (y < 1900 || y > new Date().getFullYear()) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return false;
    }
    
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const dayDiff = today.getDate() - date.getDate();
    
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      actualAge--;
    }
    
    return actualAge >= 18;
  }

  function handleDateConfirm() {
    setDateError('');
    
    if (!tempYear || !tempMonth || !tempDay) {
      setDateError('Vui lòng nhập đầy đủ ngày tháng năm');
      return;
    }
    
    const y = parseInt(tempYear);
    const m = parseInt(tempMonth);
    const d = parseInt(tempDay);
    
    if (isNaN(y) || isNaN(m) || isNaN(d)) {
      setDateError('Ngày sinh không hợp lệ');
      return;
    }
    
    if (y < 1900 || y > new Date().getFullYear()) {
      setDateError('Năm sinh phải từ 1900 đến hiện tại');
      return;
    }
    
    if (m < 1 || m > 12) {
      setDateError('Tháng phải từ 1 đến 12');
      return;
    }
    
    if (d < 1 || d > 31) {
      setDateError('Ngày phải từ 1 đến 31');
      return;
    }
    
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      setDateError('Ngày sinh không hợp lệ');
      return;
    }
    
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const dayDiff = today.getDate() - date.getDate();
    
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      actualAge--;
    }
    
    if (actualAge < 18) {
      setDateError(`Bạn phải từ 18 tuổi trở lên. Tuổi hiện tại: ${actualAge} tuổi`);
      return;
    }
    
    const formatted = `${tempYear}-${tempMonth.padStart(2, '0')}-${tempDay.padStart(2, '0')}`;
    setDateOfBirth(formatted);
    setShowDatePicker(false);
    setDateError('');
  }

  async function handleUpdateProfile() {
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      showError('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10-11 số, bắt đầu bằng 0)', 'Lỗi');
      return;
    }

    try {
      setUpdatingProfile(true);
      await updateProfile(phoneNumber, address, dateOfBirth);
      showSuccess('Cập nhật thông tin thành công', 'Thành công');
      setEditingProfile(false);
      await loadProfile();
    } catch (e: any) {
      showError(e.message || 'Không thể cập nhật thông tin', 'Lỗi');
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function handleSendOtp() {
    if (!newContactEmail.trim() || !newContactEmail.includes('@')) {
      showError('Vui lòng nhập email hợp lệ', 'Lỗi');
      return;
    }
    try {
      setSendingOtp(true);
      await sendOtpForContactEmail(newContactEmail);
      setOtpSent(true);
      showSuccess('Mã OTP đã được gửi đến email của bạn', 'Thành công');
    } catch (e: any) {
      showError(e.message || 'Không thể gửi OTP', 'Lỗi');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleUpdateContactEmail() {
    if (!otp.trim()) {
      showError('Vui lòng nhập mã OTP', 'Lỗi');
      return;
    }
    try {
      setUpdatingEmail(true);
      await updateContactEmail(newContactEmail, otp);
      showSuccess('Cập nhật email liên hệ thành công', 'Thành công');
      setShowEmailModal(false);
      setNewContactEmail('');
      setOtp('');
      setOtpSent(false);
      await loadProfile();
    } catch (e: any) {
      showError(e.message || 'Không thể cập nhật email', 'Lỗi');
    } finally {
      setUpdatingEmail(false);
    }
  }

  function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
      <View style={styles.infoItem}>
        <View style={styles.infoIconWrap}>
          <Ionicons name={icon as any} size={18} color="#10b981" />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <AppShell title="Hồ sơ" subtitle="Thông tin cá nhân">
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Đang tải thông tin...</Text>
          </View>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title="Hồ sơ" subtitle="Quản lý thông tin cá nhân">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Profile Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            </View>
          </View>
          <Text style={styles.userName}>{profile?.fullName ?? 'N/A'}</Text>
          <Text style={styles.userEmail}>{profile?.email ?? 'N/A'}</Text>
          <View style={styles.roleChip}>
            <Ionicons name="shield-checkmark" size={14} color="#10b981" />
            <Text style={styles.roleText}>{profile?.roleName || 'Người dùng'}</Text>
          </View>
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          
          {editingProfile ? (
            <View style={[styles.editCard, { borderRadius: infoCardBorderRadius, padding: sz(20) }]}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số điện thoại</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={18} color="#64748b" />
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 0123456789"
                    placeholderTextColor="#64748b"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    maxLength={11}
                  />
                </View>
                {phoneNumber && !validatePhoneNumber(phoneNumber) && (
                  <Text style={styles.errorText}>Số điện thoại không hợp lệ (10-11 số)</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngày sinh</Text>
                <TouchableOpacity
                  style={styles.inputWrapper}
                  onPress={() => {
                    if (dateOfBirth) {
                      const parts = dateOfBirth.split('-');
                      if (parts.length === 3) {
                        setTempYear(parts[0]);
                        setTempMonth(parts[1]);
                        setTempDay(parts[2]);
                      }
                    } else {
                      const now = new Date();
                      setTempYear(String(now.getFullYear() - 25));
                      setTempMonth(String(now.getMonth() + 1));
                      setTempDay(String(now.getDate()));
                    }
                    setDateError('');
                    setShowDatePicker(true);
                  }}
                >
                  <Ionicons name="calendar-outline" size={18} color="#64748b" />
                  <Text style={[styles.input, { paddingVertical: 0 }]}>
                    {dateOfBirth || 'Chọn ngày sinh'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Địa chỉ</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={18} color="#64748b" />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Nhập địa chỉ"
                    placeholderTextColor="#64748b"
                    value={address}
                    onChangeText={setAddress}
                    multiline
                  />
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setEditingProfile(false);
                    setPhoneNumber(profile?.phoneNumber || '');
                    setAddress(profile?.address || '');
                    setDateOfBirth(profile?.dateOfBirth || '');
                  }}
                >
                  <Ionicons name="close" size={18} color="#94a3b8" />
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, updatingProfile && styles.btnDisabled]}
                  onPress={handleUpdateProfile}
                  disabled={updatingProfile}
                >
                  {updatingProfile ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.saveBtnText}>Lưu</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.infoCard, { borderRadius: infoCardBorderRadius, padding: infoCardPadding }]}>
              <InfoItem 
                icon="call-outline" 
                label="Số điện thoại" 
                value={profile?.phoneNumber || 'Chưa cập nhật'}
              />
              <InfoItem 
                icon="calendar-outline" 
                label="Ngày sinh" 
                value={profile?.dateOfBirth || 'Chưa cập nhật'}
              />
              <InfoItem 
                icon="location-outline" 
                label="Địa chỉ" 
                value={profile?.address || 'Chưa cập nhật'}
              />
              <TouchableOpacity 
                style={styles.editBtn}
                onPress={() => setEditingProfile(true)}
              >
                <Ionicons name="create-outline" size={18} color="#10b981" />
                <Text style={styles.editBtnText}>Chỉnh sửa thông tin</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liên hệ</Text>
          <View style={[styles.infoCard, { borderRadius: infoCardBorderRadius, padding: infoCardPadding }]}>
            <InfoItem 
              icon="mail-outline" 
              label="Email liên hệ" 
              value={profile?.contactEmail || 'Chưa cập nhật'}
            />
            <TouchableOpacity 
              style={styles.editBtn}
              onPress={() => setShowEmailModal(true)}
            >
              <Ionicons name="create-outline" size={18} color="#10b981" />
              <Text style={styles.editBtnText}>Cập nhật email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Organization Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isVi ? 'Tổ chức' : 'Organization'}</Text>
          <View style={[styles.infoCard, { borderRadius: infoCardBorderRadius, padding: infoCardPadding }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/admin/organization-settings')}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="business-outline" size={20} color="#10b981" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{isVi ? 'Cài đặt tổ chức' : 'Organization Settings'}</Text>
                <Text style={styles.menuSubtitle}>{isVi ? 'Logo, địa chỉ, website' : 'Logo, address, website'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isVi ? 'Bảo mật' : 'Security'}</Text>
          <View style={[styles.infoCard, { borderRadius: infoCardBorderRadius, padding: infoCardPadding }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/change-password')}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="key-outline" size={20} color="#10b981" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{isVi ? 'Đổi mật khẩu' : 'Change Password'}</Text>
                <Text style={styles.menuSubtitle}>{isVi ? 'Cập nhật mật khẩu mới' : 'Update your password'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <View style={styles.appInfoIcon}>
            <Ionicons name="sparkles" size={20} color="#10b981" />
          </View>
          <Text style={styles.appName}>AI Chatbot</Text>
          <Text style={styles.appVersion}>Phiên bản 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Contact Email Modal */}
      <Modal
        visible={showEmailModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEmailModal(false);
          setNewContactEmail('');
          setOtp('');
          setOtpSent(false);
        }}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modal}>
            <View style={modalStyles.handleBar} />
            <Text style={modalStyles.title}>Cập nhật email liên hệ</Text>
            
            <View style={modalStyles.inputGroup}>
              <Text style={modalStyles.label}>Email mới</Text>
              <View style={modalStyles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color="#64748b" />
                <TextInput
                  style={modalStyles.input}
                  placeholder="example@email.com"
                  placeholderTextColor="#64748b"
                  value={newContactEmail}
                  onChangeText={setNewContactEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!otpSent}
                />
              </View>
            </View>

            {otpSent && (
              <View style={modalStyles.inputGroup}>
                <Text style={modalStyles.label}>Mã OTP</Text>
                <View style={modalStyles.inputWrapper}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" />
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Nhập mã OTP"
                    placeholderTextColor="#64748b"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            )}

            <View style={modalStyles.buttonRow}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() => {
                  setShowEmailModal(false);
                  setNewContactEmail('');
                  setOtp('');
                  setOtpSent(false);
                }}
              >
                <Text style={modalStyles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              
              {!otpSent ? (
                <TouchableOpacity
                  style={[modalStyles.primaryBtn, sendingOtp && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={sendingOtp}
                >
                  {sendingOtp ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={16} color="#fff" />
                      <Text style={modalStyles.primaryBtnText}>Gửi OTP</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[modalStyles.primaryBtn, updatingEmail && styles.btnDisabled]}
                  onPress={handleUpdateContactEmail}
                  disabled={updatingEmail}
                >
                  {updatingEmail ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={modalStyles.primaryBtnText}>Xác nhận</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modal}>
            <View style={modalStyles.handleBar} />
            <Text style={modalStyles.title}>Chọn ngày sinh</Text>
            
            <View style={modalStyles.dateRow}>
              <View style={modalStyles.dateField}>
                <Text style={modalStyles.label}>Ngày</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="DD"
                  placeholderTextColor="#64748b"
                  value={tempDay}
                  onChangeText={setTempDay}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={modalStyles.dateField}>
                <Text style={modalStyles.label}>Tháng</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="MM"
                  placeholderTextColor="#64748b"
                  value={tempMonth}
                  onChangeText={setTempMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={[modalStyles.dateField, { flex: 1.5 }]}>
                <Text style={modalStyles.label}>Năm</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="YYYY"
                  placeholderTextColor="#64748b"
                  value={tempYear}
                  onChangeText={setTempYear}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>

            {dateError ? (
              <View style={modalStyles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#f87171" />
                <Text style={modalStyles.errorText}>{dateError}</Text>
              </View>
            ) : null}

            <View style={modalStyles.buttonRow}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() => {
                  setShowDatePicker(false);
                  setDateError('');
                }}
              >
                <Text style={modalStyles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.primaryBtn}
                onPress={handleDateConfirm}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={modalStyles.primaryBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}
