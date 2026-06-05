import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Image, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as documentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { GoogleDrivePicker } from '../../components/GoogleDrivePicker';
import { useLanguageStore, translations } from '../../lib/language-store';
import { useNotification } from '../../lib/notification';
import {
  getTenantInfo, updateTenantProfile,
  uploadTenantLogo, deleteTenantLogo,
  type TenantInfoResponse, type UpdateTenantProfileRequest
} from '../../lib/api/tenant-settings';

const COMPANY_SIZES_VI = [
  'Dưới 10 nhân viên',
  '10-50 nhân viên',
  '51-200 nhân viên',
  '201-500 nhân viên',
  '501-1000 nhân viên',
  'Trên 1000 nhân viên',
];

const COMPANY_SIZES_EN = [
  'Under 10 employees',
  '10-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  'Over 1000 employees',
];

const COMPANY_SIZES_VALUES = [
  'UNDER_10',
  '10_TO_50',
  '51_TO_200',
  '201_TO_500',
  '501_TO_1000',
  'OVER_1000',
];

const imagePickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
});

export default function OrganizationSettingsScreen() {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const t = translations[language];
  const { showSuccess, showError } = useNotification();

  const [tenant, setTenant] = useState<TenantInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);

  // Editable fields
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Logo
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<{ uri: string; name: string; type: string } | null>(null);

  // Image Source Picker Modal
  const [showImageSourcePicker, setShowImageSourcePicker] = useState(false);
  const [showGoogleDrivePicker, setShowGoogleDrivePicker] = useState(false);

  // Size picker
  const [showSizePicker, setShowSizePicker] = useState(false);

  useEffect(() => {
    loadTenant();
  }, []);

  async function loadTenant() {
    setLoading(true);
    try {
      const data = await getTenantInfo();
      setTenant(data);
      setAddress(data.address || '');
      setWebsite(data.website || '');
      setCompanySize(data.companySize || '');
      if (data.additionalLogoUrl) {
        setLogoPreview(data.additionalLogoUrl);
      } else if (data.logoUrl) {
        setLogoPreview(data.logoUrl);
      }
    } catch (e: any) {
      showError(e.message || (isVi ? 'Không thể tải thông tin tổ chức' : 'Failed to load organization info'), isVi ? 'Lỗi' : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCameraCapture() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showError(isVi ? 'Cần cấp quyền camera để chụp ảnh' : 'Camera permission is required', isVi ? 'Lỗi' : 'Error');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedLogo({ uri: asset.uri, name: `camera_${Date.now()}.jpg`, type: asset.mimeType || 'image/jpeg' });
      setLogoPreview(asset.uri);
    }
  }

  async function handlePickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError(isVi ? 'Cần cấp quyền thư viện ảnh' : 'Media library permission is required', isVi ? 'Lỗi' : 'Error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedLogo({ uri: asset.uri, name: asset.fileName || `gallery_${Date.now()}.jpg`, type: asset.mimeType || 'image/jpeg' });
      setLogoPreview(asset.uri);
    }
  }

  async function handlePickFromFiles() {
    try {
      const result = await documentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedLogo({ uri: asset.uri, name: asset.name || `file_${Date.now()}.png`, type: asset.mimeType || 'image/png' });
        setLogoPreview(asset.uri);
      }
    } catch (error) {
      showError(isVi ? 'Không thể chọn tệp' : 'Cannot select file', isVi ? 'Lỗi' : 'Error');
    }
  }

  function handlePickLogo() {
    setShowImageSourcePicker(true);
  }

  async function handleUploadLogo() {
    if (!selectedLogo) return;
    setUploadingLogo(true);
    try {
      await uploadTenantLogo(selectedLogo.uri, selectedLogo.name, selectedLogo.type);
      showSuccess(isVi ? 'Tải logo lên thành công' : 'Logo uploaded successfully', isVi ? 'Thành công' : 'Success');
      setSelectedLogo(null);
      await loadTenant();
    } catch (e: any) {
      showError(e.message || (isVi ? 'Tải logo thất bại' : 'Failed to upload logo'), isVi ? 'Lỗi' : 'Error');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleDeleteLogo() {
    setDeletingLogo(true);
    try {
      await deleteTenantLogo();
      showSuccess(isVi ? 'Xóa logo thành công' : 'Logo deleted successfully', isVi ? 'Thành công' : 'Success');
      setLogoPreview(null);
      await loadTenant();
    } catch (e: any) {
      showError(e.message || (isVi ? 'Xóa logo thất bại' : 'Failed to delete logo'), isVi ? 'Lỗi' : 'Error');
    } finally {
      setDeletingLogo(false);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const data: UpdateTenantProfileRequest = {};
      if (address !== (tenant?.address || '')) data.address = address;
      if (website !== (tenant?.website || '')) data.website = website;
      if (companySize !== (tenant?.companySize || '')) data.companySize = companySize;

      if (Object.keys(data).length === 0) {
        setIsEditing(false);
        return;
      }

      await updateTenantProfile(data);
      showSuccess(isVi ? 'Cập nhật thông tin thành công' : 'Profile updated successfully', isVi ? 'Thành công' : 'Success');
      setIsEditing(false);
      await loadTenant();
    } catch (e: any) {
      showError(e.message || (isVi ? 'Cập nhật thất bại' : 'Failed to update'), isVi ? 'Lỗi' : 'Error');
    } finally {
      setSavingProfile(false);
    }
  }

  function getSizeLabel(value: string): string {
    const idx = COMPANY_SIZES_VALUES.indexOf(value);
    if (idx >= 0) return isVi ? COMPANY_SIZES_VI[idx] : COMPANY_SIZES_EN[idx];
    return value;
  }

  function getCurrentSizeOptions() {
    return isVi
      ? COMPANY_SIZES_VI.map((label, i) => ({ label, value: COMPANY_SIZES_VALUES[i] }))
      : COMPANY_SIZES_EN.map((label, i) => ({ label, value: COMPANY_SIZES_VALUES[i] }));
  }

  if (loading) {
    return (
      <AppShell title={isVi ? 'Cài đặt tổ chức' : 'Organization Settings'}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>{isVi ? 'Đang tải...' : 'Loading...'}</Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={isVi ? 'Cài đặt tổ chức' : 'Organization Settings'}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Organization Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="business" size={20} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{isVi ? 'Thông tin tổ chức' : 'Organization Information'}</Text>
              <Text style={styles.cardSubtitle}>{isVi ? 'Xem và chỉnh sửa thông tin tổ chức' : 'View and edit organization info'}</Text>
            </View>
            {!isEditing ? (
              <TouchableOpacity style={styles.editIconBtn} onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={20} color="#10b981" />
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={styles.cancelIconBtn}
                  onPress={() => {
                    setIsEditing(false);
                    if (tenant) {
                      setAddress(tenant.address || '');
                      setWebsite(tenant.website || '');
                      setCompanySize(tenant.companySize || '');
                    }
                  }}
                >
                  <Ionicons name="close" size={20} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveIconBtn}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Org Name (read-only) */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{isVi ? 'Tên tổ chức' : 'Organization Name'}</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyValue}>{tenant?.name || '-'}</Text>
            </View>
          </View>

          {/* Address */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{isVi ? 'Địa chỉ' : 'Address'}</Text>
            {isEditing ? (
              <TextInput
                style={styles.inputField}
                value={address}
                onChangeText={setAddress}
                placeholder={isVi ? 'Nhập địa chỉ' : 'Enter address'}
                placeholderTextColor="#64748b"
                multiline
              />
            ) : (
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyValue}>{tenant?.address || '-'}</Text>
              </View>
            )}
          </View>

          {/* Website */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{isVi ? 'Website' : 'Website'}</Text>
            {isEditing ? (
              <TextInput
                style={styles.inputField}
                value={website}
                onChangeText={setWebsite}
                placeholder={isVi ? 'https://example.com' : 'https://example.com'}
                placeholderTextColor="#64748b"
                keyboardType="url"
                autoCapitalize="none"
              />
            ) : (
              <View style={styles.readOnlyField}>
                <Text style={[styles.readOnlyValue, tenant?.website ? styles.linkValue : null]}>
                  {tenant?.website || '-'}
                </Text>
              </View>
            )}
          </View>

          {/* Company Size */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{isVi ? 'Quy mô công ty' : 'Company Size'}</Text>
            {isEditing ? (
              <TouchableOpacity style={styles.pickerField} onPress={() => setShowSizePicker(true)}>
                <Text style={[styles.pickerFieldText, !companySize && styles.pickerPlaceholder]}>
                  {companySize ? getSizeLabel(companySize) : (isVi ? 'Chọn quy mô' : 'Select size')}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748b" />
              </TouchableOpacity>
            ) : (
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyValue}>
                  {tenant?.companySize ? getSizeLabel(tenant.companySize) : '-'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Logo Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="image" size={20} color="#a855f7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{isVi ? 'Logo tổ chức' : 'Organization Logo'}</Text>
              <Text style={styles.cardSubtitle}>
                {isVi ? 'Tải lên logo (PNG/JPG, tối đa 2MB)' : 'Upload logo (PNG/JPG, max 2MB)'}
              </Text>
            </View>
          </View>

          {/* Current Logo */}
          {logoPreview && !selectedLogo ? (
            <View style={styles.logoSection}>
              <View style={styles.logoPreviewWrap}>
                <Image source={{ uri: logoPreview }} style={styles.logoPreview} resizeMode="contain" />
              </View>
              <View style={styles.logoActions}>
                <TouchableOpacity
                  style={styles.logoActionBtn}
                  onPress={handlePickLogo}
                  disabled={uploadingLogo || deletingLogo}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#10b981" />
                  <Text style={styles.logoActionText}>{isVi ? 'Thay đổi' : 'Change'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logoActionBtn, styles.logoDeleteBtn]}
                  onPress={handleDeleteLogo}
                  disabled={deletingLogo || uploadingLogo}
                >
                  {deletingLogo ? (
                    <ActivityIndicator size="small" color="#f87171" />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color="#f87171" />
                  )}
                  <Text style={styles.logoDeleteText}>{isVi ? 'Xóa' : 'Delete'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : selectedLogo ? (
            <View style={styles.logoSection}>
              <View style={styles.logoPreviewWrap}>
                <Image source={{ uri: logoPreview || '' }} style={styles.logoPreview} resizeMode="contain" />
              </View>
              <Text style={styles.selectedFileName}>{selectedLogo.name}</Text>
              <View style={styles.logoActions}>
                <TouchableOpacity
                  style={styles.logoActionBtn}
                  onPress={() => {
                    setSelectedLogo(null);
                    setLogoPreview(tenant?.additionalLogoUrl || tenant?.logoUrl || null);
                  }}
                  disabled={uploadingLogo}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#94a3b8" />
                  <Text style={styles.logoActionText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logoUploadBtn, uploadingLogo && styles.btnDisabled]}
                  onPress={handleUploadLogo}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-done" size={18} color="#fff" />
                      <Text style={styles.logoUploadText}>{isVi ? 'Tải lên' : 'Upload'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.logoUploadZone} onPress={handlePickLogo}>
              <View style={styles.uploadIconWrap}>
                <Ionicons name="cloud-upload-outline" size={32} color="#10b981" />
              </View>
              <Text style={styles.uploadText}>{isVi ? 'Tải logo lên' : 'Upload Logo'}</Text>
              <Text style={styles.uploadHint}>{isVi ? 'PNG hoặc JPG (tối đa 2MB)' : 'PNG or JPG (max 2MB)'}</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>

      {/* Image Source Picker Modal */}
      <Modal
        visible={showImageSourcePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageSourcePicker(false)}
      >
        <TouchableOpacity
          style={imagePickerStyles.overlay}
          activeOpacity={1}
          onPress={() => setShowImageSourcePicker(false)}
        >
          <View style={imagePickerStyles.modal}>
            <View style={imagePickerStyles.handleBar} />

            <Text style={imagePickerStyles.title}>{isVi ? 'Chọn nguồn hình ảnh' : 'Select Image Source'}</Text>

            <TouchableOpacity
              style={imagePickerStyles.option}
              onPress={() => {
                setShowImageSourcePicker(false);
                handleCameraCapture();
              }}
            >
              <View style={[imagePickerStyles.optionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="camera" size={22} color="#3b82f6" />
              </View>
              <View style={imagePickerStyles.optionTextContainer}>
                <Text style={imagePickerStyles.optionTitle}>{isVi ? 'Máy ảnh' : 'Camera'}</Text>
                <Text style={imagePickerStyles.optionSubtitle}>{isVi ? 'Chụp ảnh mới' : 'Take a new photo'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={imagePickerStyles.option}
              onPress={() => {
                setShowImageSourcePicker(false);
                handlePickFromGallery();
              }}
            >
              <View style={[imagePickerStyles.optionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                <Ionicons name="images" size={22} color="#a855f7" />
              </View>
              <View style={imagePickerStyles.optionTextContainer}>
                <Text style={imagePickerStyles.optionTitle}>{isVi ? 'Thư viện ảnh' : 'Photo Library'}</Text>
                <Text style={imagePickerStyles.optionSubtitle}>{isVi ? 'Chọn từ thư viện' : 'Choose from gallery'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={imagePickerStyles.option}
              onPress={() => {
                setShowImageSourcePicker(false);
                handlePickFromFiles();
              }}
            >
              <View style={[imagePickerStyles.optionIcon, { backgroundColor: 'rgba(234, 88, 12, 0.15)' }]}>
                <Ionicons name="folder" size={22} color="#ea580c" />
              </View>
              <View style={imagePickerStyles.optionTextContainer}>
                <Text style={imagePickerStyles.optionTitle}>{isVi ? 'Tệp' : 'Files'}</Text>
                <Text style={imagePickerStyles.optionSubtitle}>{isVi ? 'Chọn từ iCloud...' : 'Choose from iCloud...'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={imagePickerStyles.option}
              onPress={() => {
                setShowImageSourcePicker(false);
                setShowGoogleDrivePicker(true);
              }}
            >
              <View style={[imagePickerStyles.optionIcon, { backgroundColor: 'rgba(66, 133, 244, 0.15)' }]}>
                <Ionicons name="logo-google" size={22} color="#4285f4" />
              </View>
              <View style={imagePickerStyles.optionTextContainer}>
                <Text style={imagePickerStyles.optionTitle}>{isVi ? 'Google Drive' : 'Google Drive'}</Text>
                <Text style={imagePickerStyles.optionSubtitle}>{isVi ? 'Đăng nhập để chọn ảnh' : 'Sign in to select image'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={imagePickerStyles.cancelBtn}
              onPress={() => setShowImageSourcePicker(false)}
            >
              <Text style={imagePickerStyles.cancelBtnText}>{isVi ? 'Hủy' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Company Size Picker Modal */}
      {showSizePicker && (
        <View style={pickerStyles.overlay}>
          <View style={pickerStyles.modal}>
            <View style={pickerStyles.modalHeader}>
              <Text style={pickerStyles.modalTitle}>{isVi ? 'Chọn quy mô công ty' : 'Select Company Size'}</Text>
              <TouchableOpacity onPress={() => setShowSizePicker(false)}>
                <Ionicons name="close" size={22} color="#f1f5f9" />
              </TouchableOpacity>
            </View>
            <ScrollView style={pickerStyles.optionsList}>
              {getCurrentSizeOptions().map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[pickerStyles.option, companySize === opt.value && pickerStyles.optionSelected]}
                  onPress={() => {
                    setCompanySize(opt.value);
                    setShowSizePicker(false);
                  }}
                >
                  <Text style={[pickerStyles.optionText, companySize === opt.value && pickerStyles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                  {companySize === opt.value && <Ionicons name="checkmark" size={18} color="#10b981" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Google Drive Picker Modal */}
      <GoogleDrivePicker
        visible={showGoogleDrivePicker}
        onClose={() => setShowGoogleDrivePicker(false)}
        onFileSelected={(file) => {
          setSelectedLogo({ uri: file.uri, name: file.name, type: file.type });
          setLogoPreview(file.uri);
          setShowGoogleDrivePicker(false);
        }}
        isVi={isVi}
        isImageOnly={true}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#94a3b8', fontSize: 15 },
  content: { padding: 16, paddingBottom: 40, gap: 16 },

  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  cardSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },

  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fieldRow: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  readOnlyField: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  readOnlyValue: { fontSize: 15, color: '#f1f5f9' },
  linkValue: { color: '#3b82f6' },
  inputField: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#10b981',
    minHeight: 44,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    minHeight: 44,
  },
  pickerFieldText: { fontSize: 15, color: '#f1f5f9', flex: 1 },
  pickerPlaceholder: { color: '#64748b' },

  // Logo
  logoSection: { alignItems: 'center', gap: 12 },
  logoPreviewWrap: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  logoPreview: { width: '100%', height: '100%' },
  selectedFileName: { fontSize: 13, color: '#94a3b8' },
  logoActions: { flexDirection: 'row', gap: 12 },
  logoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  logoActionText: { fontSize: 13, color: '#10b981', fontWeight: '600' },
  logoDeleteBtn: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  logoDeleteText: { fontSize: 13, color: '#f87171', fontWeight: '600' },
  logoUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#10b981',
  },
  logoUploadText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  logoUploadZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#334155',
    gap: 8,
  },
  uploadIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadText: { fontSize: 15, fontWeight: '600', color: '#10b981' },
  uploadHint: { fontSize: 12, color: '#64748b' },
  btnDisabled: { opacity: 0.6 },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  optionsList: { padding: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  optionSelected: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  optionText: { fontSize: 15, color: '#f1f5f9' },
  optionTextSelected: { color: '#10b981', fontWeight: '600' },
});
