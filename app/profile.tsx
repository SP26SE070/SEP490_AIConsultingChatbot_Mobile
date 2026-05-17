import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView,
  Alert, ScrollView, Modal, Platform
} from 'react-native';
import { router } from 'expo-router';
import { getProfile, changePassword, updateProfile, sendOtpForContactEmail, updateContactEmail } from '../lib/api/profile';
import { clearAuth } from '../lib/auth-store';

export default function ProfileScreen() {
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

  // Change Password
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      
      // Parse date for picker
      if (data.dateOfBirth) {
        const parts = data.dateOfBirth.split('-');
        if (parts.length === 3) {
          setTempYear(parts[0]);
          setTempMonth(parts[1]);
          setTempDay(parts[2]);
        }
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải thông tin cá nhân');
    } finally {
      setLoading(false);
    }
  }

  function validatePhoneNumber(phone: string): boolean {
    // Vietnamese phone: 10-11 digits, starts with 0
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
    
    // Check valid date
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return false;
    }
    
    // Check age >= 18
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const dayDiff = today.getDate() - date.getDate();
    
    // Calculate exact age
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      actualAge--;
    }
    
    return actualAge >= 18;
  }

  function handleDateConfirm() {
    setDateError(''); // Clear previous errors
    
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
    
    // Check valid date
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      setDateError('Ngày sinh không hợp lệ (ví dụ: không có ngày 31/02)');
      return;
    }
    
    // Check age >= 18
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
    // Validate phone number
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10-11 số, bắt đầu bằng 0)');
      return;
    }

    try {
      setUpdatingProfile(true);
      await updateProfile(phoneNumber, address, dateOfBirth);
      Alert.alert('Thành công', 'Cập nhật thông tin thành công');
      setEditingProfile(false);
      await loadProfile();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể cập nhật thông tin');
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function handleSendOtp() {
    if (!newContactEmail.trim() || !newContactEmail.includes('@')) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hợp lệ');
      return;
    }
    try {
      setSendingOtp(true);
      await sendOtpForContactEmail(newContactEmail);
      setOtpSent(true);
      Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể gửi OTP');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleUpdateContactEmail() {
    if (!otp.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP');
      return;
    }
    try {
      setUpdatingEmail(true);
      await updateContactEmail(newContactEmail, otp);
      Alert.alert('Thành công', 'Cập nhật email liên hệ thành công');
      setShowEmailModal(false);
      setNewContactEmail('');
      setOtp('');
      setOtpSent(false);
      await loadProfile();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể cập nhật email');
    } finally {
      setUpdatingEmail(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    try {
      setChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể thay đổi mật khẩu');
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleLogout() {
    await clearAuth();
    router.replace('/login');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Info */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.fullName ?? 'N/A'}</Text>
          <Text style={styles.email}>{profile?.email ?? 'N/A'}</Text>
        </View>

        {/* Profile Information */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            {!editingProfile && (
              <TouchableOpacity onPress={() => setEditingProfile(true)}>
                <Text style={{ color: '#22c55e', fontSize: 13 }}>Chỉnh sửa</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {editingProfile ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  placeholder="VD: 0123456789"
                  placeholderTextColor="#64748b"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
                {phoneNumber && !validatePhoneNumber(phoneNumber) && (
                  <Text style={styles.errorText}>Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)</Text>
                )}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngày sinh</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => {
                    // Initialize temp values from current date
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
                  <Text style={styles.dateButtonText}>
                    {dateOfBirth || 'Chọn ngày sinh'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Địa chỉ</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập địa chỉ"
                  placeholderTextColor="#64748b"
                  value={address}
                  onChangeText={setAddress}
                  multiline
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.changeBtn, { flex: 1, backgroundColor: '#64748b' }]}
                  onPress={() => {
                    setEditingProfile(false);
                    setPhoneNumber(profile?.phoneNumber || '');
                    setAddress(profile?.address || '');
                    setDateOfBirth(profile?.dateOfBirth || '');
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.changeBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.changeBtn, { flex: 1 }, updatingProfile && styles.btnDisabled]}
                  onPress={handleUpdateProfile}
                  disabled={updatingProfile}
                >
                  {updatingProfile
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.changeBtnText}>Lưu</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <InfoRow label="Số điện thoại" value={profile?.phoneNumber} />
              <InfoRow label="Ngày sinh" value={profile?.dateOfBirth} />
              <InfoRow label="Địa chỉ" value={profile?.address} />
              <InfoRow label="Vai trò" value={profile?.roleName} />
            </>
          )}
        </View>

        {/* Contact Email */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Email liên hệ</Text>
            <TouchableOpacity onPress={() => setShowEmailModal(true)}>
              <Text style={{ color: '#22c55e', fontSize: 13 }}>Cập nhật</Text>
            </TouchableOpacity>
          </View>
          <InfoRow label="Email" value={profile?.contactEmail} />
        </View>

        {/* Change Password */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu hiện tại"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Mật khẩu mới"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Xác nhận mật khẩu mới"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity
            style={[styles.changeBtn, changingPassword && styles.btnDisabled]}
            onPress={handleChangePassword}
            disabled={changingPassword}
          >
            {changingPassword
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.changeBtnText}>Đổi mật khẩu</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Đăng xuất</Text>
        </TouchableOpacity>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập nhật email liên hệ</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email mới</Text>
              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor="#64748b"
                value={newContactEmail}
                onChangeText={setNewContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!otpSent}
              />
            </View>

            {otpSent && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mã OTP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mã OTP"
                  placeholderTextColor="#64748b"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.changeBtn, { flex: 1, backgroundColor: '#64748b' }]}
                onPress={() => {
                  setShowEmailModal(false);
                  setNewContactEmail('');
                  setOtp('');
                  setOtpSent(false);
                }}
              >
                <Text style={styles.changeBtnText}>Hủy</Text>
              </TouchableOpacity>
              
              {!otpSent ? (
                <TouchableOpacity
                  style={[styles.changeBtn, { flex: 1 }, sendingOtp && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={sendingOtp}
                >
                  {sendingOtp
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.changeBtnText}>Gửi OTP</Text>
                  }
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.changeBtn, { flex: 1 }, updatingEmail && styles.btnDisabled]}
                  onPress={handleUpdateContactEmail}
                  disabled={updatingEmail}
                >
                  {updatingEmail
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.changeBtnText}>Xác nhận</Text>
                  }
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn ngày sinh</Text>
            
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Ngày</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD"
                  placeholderTextColor="#64748b"
                  value={tempDay}
                  onChangeText={setTempDay}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Tháng</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM"
                  placeholderTextColor="#64748b"
                  value={tempMonth}
                  onChangeText={setTempMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.inputLabel}>Năm</Text>
                <TextInput
                  style={styles.input}
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
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{dateError}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.changeBtn, { flex: 1, backgroundColor: '#64748b' }]}
                onPress={() => {
                  setShowDatePicker(false);
                  setDateError('');
                }}
              >
                <Text style={styles.changeBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.changeBtn, { flex: 1 }]}
                onPress={handleDateConfirm}
              >
                <Text style={styles.changeBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#f1f5f9' },
  backText: { color: '#22c55e', fontSize: 14, width: 80 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  name: { color: '#f1f5f9', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  email: { color: '#64748b', fontSize: 13 },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: { color: '#94a3b8', fontSize: 13 },
  infoValue: { color: '#f1f5f9', fontSize: 13, textAlign: 'right', flex: 1 },
  sectionTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    color: '#f1f5f9',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  changeBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  changeBtnText: { color: '#fff', fontWeight: '600' },
  logoutBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  logoutBtnText: { color: '#fff', fontWeight: '600' },
  inputGroup: { gap: 6 },
  inputLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  dateButton: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dateButtonText: {
    color: '#f1f5f9',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
});
