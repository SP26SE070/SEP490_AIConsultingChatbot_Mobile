import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView, Image, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as documentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { useNotification } from '../../lib/notification';
import {
  getTenantInfo, updateTenantProfile,
  uploadTenantLogo, deleteTenantLogo,
  type TenantInfoResponse, type UpdateTenantProfileRequest
} from '../../lib/api/tenant-settings';
import { useResponsive } from '../../lib/useResponsive';

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

export default function OrganizationSettingsScreen() {
  const { width, sz, fs } = useResponsive();
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const t = translations[language];
  const { showSuccess, showError } = useNotification();

  // Responsive values
  const isSmall = width < 375;
  const contentPadding = sz(16);
  const contentPaddingBottom = sz(40);
  const contentGap = sz(16);
  const cardPadding = sz(20);
  const cardRadius = sz(16);
  const cardHeaderGap = sz(12);
  const cardHeaderMarginB = sz(20);
  const cardIconSize = sz(44);
  const cardIconRadius = sz(12);
  const cardTitleSize = fs(16);
  const cardSubtitleSize = fs(12);
  const editIconSize = sz(36);
  const editIconRadius = sz(10);
  const cancelIconSize = sz(36);
  const saveIconSize = sz(36);
  const fieldRowMarginB = sz(16);
  const fieldLabelSize = fs(12);
  const fieldLabelUppercase = true;
  const fieldLabelMarginB = sz(6);
  const readOnlyFieldPaddingH = sz(14);
  const readOnlyFieldPaddingV = sz(12);
  const readOnlyFieldRadius = sz(10);
  const readOnlyValueSize = fs(15);
  const inputFieldPaddingH = sz(14);
  const inputFieldPaddingV = sz(12);
  const inputFieldRadius = sz(10);
  const inputFieldFontSize = fs(15);
  const inputFieldMinHeight = sz(44);
  const pickerFieldPaddingH = sz(14);
  const pickerFieldPaddingV = sz(12);
  const pickerFieldRadius = sz(10);
  const pickerFieldTextSize = fs(15);
  
  // Logo
  const logoPreviewSize = sz(120);
  const logoPreviewRadius = sz(16);
  const logoActionsGap = sz(12);
  const logoActionPaddingV = sz(10);
  const logoActionPaddingH = sz(16);
  const logoActionRadius = sz(10);
  const logoActionTextSize = fs(13);
  const selectedFileNameSize = fs(13);
  const logoUploadZonePaddingV = sz(40);
  const logoUploadZoneRadius = sz(14);
  const logoUploadZoneGap = sz(8);
  const uploadIconWrapSize = sz(64);
  const uploadIconWrapRadius = sz(32);
  const uploadTextSize = fs(15);
  const uploadHintSize = fs(12);
  
  // Image Picker Modal
  const pickerModalPadding = sz(24);
  const pickerModalRadius = sz(20);
  const handleBarSize = sz(40);
  const handleBarHeight = sz(4);
  const handleBarRadius = sz(2);
  const pickerTitleSize = fs(18);
  const pickerTitleMarginB = sz(20);
  const pickerOptionPaddingV = sz(14);
  const pickerOptionPaddingH = sz(12);
  const pickerOptionRadius = sz(12);
  const pickerOptionMarginB = sz(8);
  const pickerOptionIconSize = sz(44);
  const pickerOptionIconRadius = sz(12);
  const pickerOptionTitleSize = fs(15);
  const pickerOptionSubtitleSize = fs(12);
  const pickerCancelPaddingV = sz(14);
  const pickerCancelRadius = sz(12);
  const pickerCancelTextSize = fs(15);

  // Image Picker Modal
  const imgPickerOverlayPaddingH = sz(24);
  const imgPickerModalPadding = sz(24);
  const imgPickerModalRadius = sz(20);
  const imgPickerModalMaxWidth = sz(340);
  const imgPickerHandleBarWidth = sz(40);
  const imgPickerHandleBarHeight = sz(4);
  const imgPickerHandleBarRadius = sz(2);
  const imgPickerHandleBarMarginB = sz(16);
  const imgPickerTitleSize = fs(18);
  const imgPickerTitleMarginB = sz(20);
  const imgPickerOptionPaddingV = sz(14);
  const imgPickerOptionPaddingH = sz(12);
  const imgPickerOptionRadius = sz(12);
  const imgPickerOptionMarginB = sz(8);
  const imgPickerOptionIconSize = sz(44);
  const imgPickerOptionIconRadius = sz(12);
  const imgPickerOptionTitleSize = fs(15);
  const imgPickerOptionSubtitleSize = fs(12);
  const imgPickerCancelPaddingV = sz(14);
  const imgPickerCancelRadius = sz(12);
  const imgPickerCancelMarginT = sz(8);

  // Picker Modal (Company Size)
  const sizePickerModalRadius = sz(24);
  const sizePickerModalPadding = sz(20);
  const sizePickerModalHeaderPadding = sz(20);
  const sizePickerModalTitleSize = fs(18);
  const sizePickerOptionPaddingV = sz(14);
  const sizePickerOptionPaddingH = sz(16);
  const sizePickerOptionRadius = sz(12);
  const sizePickerOptionTextSize = fs(15);

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
        <View style={[styles.centered, { gap: sz(16) }]}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={[styles.loadingText, { fontSize: fs(15) }]}>{isVi ? 'Đang tải...' : 'Loading...'}</Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={isVi ? 'Cài đặt tổ chức' : 'Organization Settings'}>
      <ScrollView contentContainerStyle={[styles.content, { padding: contentPadding, paddingBottom: contentPaddingBottom, gap: contentGap }]} showsVerticalScrollIndicator={false}>

        {/* Organization Info Card */}
        <View style={[styles.card, { padding: cardPadding, borderRadius: cardRadius }]}>
          <View style={[styles.cardHeader, { gap: cardHeaderGap, marginBottom: cardHeaderMarginB }]}>
            <View style={[styles.cardIconWrap, { width: cardIconSize, height: cardIconSize, borderRadius: cardIconRadius }]}>
              <Ionicons name="business" size={sz(20)} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { fontSize: cardTitleSize }]}>{isVi ? 'Thông tin tổ chức' : 'Organization Information'}</Text>
              <Text style={[styles.cardSubtitle, { fontSize: cardSubtitleSize }]}>{isVi ? 'Xem và chỉnh sửa thông tin tổ chức' : 'View and edit organization info'}</Text>
            </View>
            {!isEditing ? (
              <TouchableOpacity style={[styles.editIconBtn, { width: editIconSize, height: editIconSize, borderRadius: editIconRadius }]} onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={sz(20)} color="#10b981" />
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', gap: sz(8) }}>
                <TouchableOpacity
                  style={[styles.cancelIconBtn, { width: cancelIconSize, height: cancelIconSize, borderRadius: editIconRadius }]}
                  onPress={() => {
                    setIsEditing(false);
                    if (tenant) {
                      setAddress(tenant.address || '');
                      setWebsite(tenant.website || '');
                      setCompanySize(tenant.companySize || '');
                    }
                  }}
                >
                  <Ionicons name="close" size={sz(20)} color="#94a3b8" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveIconBtn, { width: saveIconSize, height: saveIconSize, borderRadius: editIconRadius }]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark" size={sz(20)} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Org Name (read-only) */}
          <View style={[styles.fieldRow, { marginBottom: fieldRowMarginB }]}>
            <Text style={[styles.fieldLabel, { fontSize: fieldLabelSize, marginBottom: fieldLabelMarginB }]}>{isVi ? 'Tên tổ chức' : 'Organization Name'}</Text>
            <View style={[styles.readOnlyField, { paddingHorizontal: readOnlyFieldPaddingH, paddingVertical: readOnlyFieldPaddingV, borderRadius: readOnlyFieldRadius }]}>
              <Text style={[styles.readOnlyValue, { fontSize: readOnlyValueSize }]}>{tenant?.name || '-'}</Text>
            </View>
          </View>

          {/* Address */}
          <View style={[styles.fieldRow, { marginBottom: fieldRowMarginB }]}>
            <Text style={[styles.fieldLabel, { fontSize: fieldLabelSize, marginBottom: fieldLabelMarginB }]}>{isVi ? 'Địa chỉ' : 'Address'}</Text>
            {isEditing ? (
              <TextInput
                style={[styles.inputField, { paddingHorizontal: inputFieldPaddingH, paddingVertical: inputFieldPaddingV, borderRadius: inputFieldRadius, fontSize: inputFieldFontSize }]}
                value={address}
                onChangeText={setAddress}
                placeholder={isVi ? 'Nhập địa chỉ' : 'Enter address'}
                placeholderTextColor="#64748b"
                multiline
              />
            ) : (
              <View style={[styles.readOnlyField, { paddingHorizontal: readOnlyFieldPaddingH, paddingVertical: readOnlyFieldPaddingV, borderRadius: readOnlyFieldRadius }]}>
                <Text style={[styles.readOnlyValue, { fontSize: readOnlyValueSize }]}>{tenant?.address || '-'}</Text>
              </View>
            )}
          </View>

          {/* Website */}
          <View style={[styles.fieldRow, { marginBottom: fieldRowMarginB }]}>
            <Text style={[styles.fieldLabel, { fontSize: fieldLabelSize, marginBottom: fieldLabelMarginB }]}>{isVi ? 'Website' : 'Website'}</Text>
            {isEditing ? (
              <TextInput
                style={[styles.inputField, { paddingHorizontal: inputFieldPaddingH, paddingVertical: inputFieldPaddingV, borderRadius: inputFieldRadius, fontSize: inputFieldFontSize }]}
                value={website}
                onChangeText={setWebsite}
                placeholder={isVi ? 'https://example.com' : 'https://example.com'}
                placeholderTextColor="#64748b"
                keyboardType="url"
                autoCapitalize="none"
              />
            ) : (
              <View style={[styles.readOnlyField, { paddingHorizontal: readOnlyFieldPaddingH, paddingVertical: readOnlyFieldPaddingV, borderRadius: readOnlyFieldRadius }]}>
                <Text style={[styles.readOnlyValue, { fontSize: readOnlyValueSize }, tenant?.website ? styles.linkValue : null]}>
                  {tenant?.website || '-'}
                </Text>
              </View>
            )}
          </View>

          {/* Company Size */}
          <View style={[styles.fieldRow, { marginBottom: sz(0) }]}>
            <Text style={[styles.fieldLabel, { fontSize: fieldLabelSize, marginBottom: fieldLabelMarginB }]}>{isVi ? 'Quy mô công ty' : 'Company Size'}</Text>
            {isEditing ? (
              <TouchableOpacity style={[styles.pickerField, { paddingHorizontal: pickerFieldPaddingH, paddingVertical: pickerFieldPaddingV, borderRadius: pickerFieldRadius }]} onPress={() => setShowSizePicker(true)}>
                <Text style={[styles.pickerFieldText, { fontSize: pickerFieldTextSize }, !companySize && styles.pickerPlaceholder]}>
                  {companySize ? getSizeLabel(companySize) : (isVi ? 'Chọn quy mô' : 'Select size')}
                </Text>
                <Ionicons name="chevron-down" size={sz(18)} color="#64748b" />
              </TouchableOpacity>
            ) : (
              <View style={[styles.readOnlyField, { paddingHorizontal: readOnlyFieldPaddingH, paddingVertical: readOnlyFieldPaddingV, borderRadius: readOnlyFieldRadius }]}>
                <Text style={[styles.readOnlyValue, { fontSize: readOnlyValueSize }]}>
                  {tenant?.companySize ? getSizeLabel(tenant.companySize) : '-'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Logo Card */}
        <View style={[styles.card, { padding: cardPadding, borderRadius: cardRadius }]}>
          <View style={[styles.cardHeader, { gap: cardHeaderGap, marginBottom: cardHeaderMarginB }]}>
            <View style={[styles.cardIconWrap, { width: cardIconSize, height: cardIconSize, borderRadius: cardIconRadius, backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="image" size={sz(20)} color="#a855f7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { fontSize: cardTitleSize }]}>{isVi ? 'Logo tổ chức' : 'Organization Logo'}</Text>
              <Text style={[styles.cardSubtitle, { fontSize: cardSubtitleSize }]}>
                {isVi ? 'Tải lên logo (PNG/JPG, tối đa 2MB)' : 'Upload logo (PNG/JPG, max 2MB)'}
              </Text>
            </View>
          </View>

          {/* Current Logo */}
          {logoPreview && !selectedLogo ? (
            <View style={[styles.logoSection, { gap: cardHeaderGap }]}>
              <View style={[styles.logoPreviewWrap, { width: logoPreviewSize, height: logoPreviewSize, borderRadius: logoPreviewRadius }]}>
                <Image source={{ uri: logoPreview }} style={styles.logoPreview} resizeMode="contain" />
              </View>
              <View style={[styles.logoActions, { gap: cardHeaderGap }]}>
                <TouchableOpacity
                  style={[styles.logoActionBtn, { paddingVertical: logoActionPaddingV, paddingHorizontal: logoActionPaddingH, borderRadius: logoActionBtnRadius }]}
                  onPress={handlePickLogo}
                  disabled={uploadingLogo || deletingLogo}
                >
                  <Ionicons name="cloud-upload-outline" size={sz(18)} color="#10b981" />
                  <Text style={[styles.logoActionText, { fontSize: logoActionTextSize }]}>{isVi ? 'Thay đổi' : 'Change'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logoActionBtn, styles.logoDeleteBtn, { paddingVertical: logoActionPaddingV, paddingHorizontal: logoActionPaddingH, borderRadius: logoActionBtnRadius }]}
                  onPress={handleDeleteLogo}
                  disabled={deletingLogo || uploadingLogo}
                >
                  {deletingLogo ? (
                    <ActivityIndicator size="small" color="#f87171" />
                  ) : (
                    <Ionicons name="trash-outline" size={sz(18)} color="#f87171" />
                  )}
                  <Text style={[styles.logoDeleteText, { fontSize: logoActionTextSize }]}>{isVi ? 'Xóa' : 'Delete'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : selectedLogo ? (
            <View style={[styles.logoSection, { gap: cardHeaderGap }]}>
              <View style={[styles.logoPreviewWrap, { width: logoPreviewSize, height: logoPreviewSize, borderRadius: logoPreviewRadius }]}>
                <Image source={{ uri: logoPreview || '' }} style={styles.logoPreview} resizeMode="contain" />
              </View>
              <Text style={[styles.selectedFileName, { fontSize: selectedFileNameSize }]}>{selectedLogo.name}</Text>
              <View style={[styles.logoActions, { gap: cardHeaderGap }]}>
                <TouchableOpacity
                  style={[styles.logoActionBtn, { paddingVertical: logoActionPaddingV, paddingHorizontal: logoActionPaddingH, borderRadius: logoActionBtnRadius }]}
                  onPress={() => {
                    setSelectedLogo(null);
                    setLogoPreview(tenant?.additionalLogoUrl || tenant?.logoUrl || null);
                  }}
                  disabled={uploadingLogo}
                >
                  <Ionicons name="close-circle-outline" size={sz(18)} color="#94a3b8" />
                  <Text style={[styles.logoActionText, { fontSize: logoActionTextSize }]}>{isVi ? 'Hủy' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logoUploadBtn, { paddingVertical: logoActionPaddingV, paddingHorizontal: logoActionPaddingH, borderRadius: logoActionBtnRadius }, uploadingLogo && styles.btnDisabled]}
                  onPress={handleUploadLogo}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-done" size={sz(18)} color="#fff" />
                      <Text style={[styles.logoUploadText, { fontSize: logoActionTextSize }]}>{isVi ? 'Tải lên' : 'Upload'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.logoUploadZone, { paddingVertical: logoUploadZonePaddingV, borderRadius: logoUploadZoneRadius, gap: logoUploadZoneGap }]} onPress={handlePickLogo}>
              <View style={[styles.uploadIconWrap, { width: uploadIconWrapSize, height: uploadIconWrapSize, borderRadius: uploadIconWrapRadius }]}>
                <Ionicons name="cloud-upload-outline" size={sz(32)} color="#10b981" />
              </View>
              <Text style={[styles.uploadText, { fontSize: uploadTextSize }]}>{isVi ? 'Tải logo lên' : 'Upload Logo'}</Text>
              <Text style={[styles.uploadHint, { fontSize: uploadHintSize }]}>{isVi ? 'PNG hoặc JPG (tối đa 2MB)' : 'PNG or JPG (max 2MB)'}</Text>
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
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: imgPickerOverlayPaddingH }}
          activeOpacity={1}
          onPress={() => setShowImageSourcePicker(false)}
        >
          <View style={{ backgroundColor: '#1e293b', borderRadius: imgPickerModalRadius, padding: imgPickerModalPadding, width: '100%', maxWidth: imgPickerModalMaxWidth }}>
            <View style={{ width: imgPickerHandleBarWidth, height: imgPickerHandleBarHeight, backgroundColor: '#475569', borderRadius: imgPickerHandleBarRadius, alignSelf: 'center', marginBottom: imgPickerHandleBarMarginB }} />

            <Text style={{ fontSize: imgPickerTitleSize, fontWeight: '700', color: '#f1f5f9', textAlign: 'center', marginBottom: imgPickerTitleMarginB }}>{isVi ? 'Chọn nguồn hình ảnh' : 'Select Image Source'}</Text>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: imgPickerOptionPaddingV, paddingHorizontal: imgPickerOptionPaddingH, borderRadius: imgPickerOptionRadius, marginBottom: imgPickerOptionMarginB, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' }}
              onPress={() => { setShowImageSourcePicker(false); handleCameraCapture(); }}
            >
              <View style={{ width: imgPickerOptionIconSize, height: imgPickerOptionIconSize, borderRadius: imgPickerOptionIconRadius, alignItems: 'center', justifyContent: 'center', marginRight: sz(12), backgroundColor: 'rgba(59, 130, 246, 0.15)' }}>
                <Ionicons name="camera" size={22} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: imgPickerOptionTitleSize, fontWeight: '600', color: '#f1f5f9', marginBottom: sz(2) }}>{isVi ? 'Máy ảnh' : 'Camera'}</Text>
                <Text style={{ fontSize: imgPickerOptionSubtitleSize, color: '#94a3b8' }}>{isVi ? 'Chụp ảnh mới' : 'Take a new photo'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: imgPickerOptionPaddingV, paddingHorizontal: imgPickerOptionPaddingH, borderRadius: imgPickerOptionRadius, marginBottom: imgPickerOptionMarginB, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' }}
              onPress={() => { setShowImageSourcePicker(false); handlePickFromGallery(); }}
            >
              <View style={{ width: imgPickerOptionIconSize, height: imgPickerOptionIconSize, borderRadius: imgPickerOptionIconRadius, alignItems: 'center', justifyContent: 'center', marginRight: sz(12), backgroundColor: 'rgba(168, 85, 247, 0.15)' }}>
                <Ionicons name="images" size={22} color="#a855f7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: imgPickerOptionTitleSize, fontWeight: '600', color: '#f1f5f9', marginBottom: sz(2) }}>{isVi ? 'Thư viện ảnh' : 'Photo Library'}</Text>
                <Text style={{ fontSize: imgPickerOptionSubtitleSize, color: '#94a3b8' }}>{isVi ? 'Chọn từ thư viện' : 'Choose from gallery'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: imgPickerOptionPaddingV, paddingHorizontal: imgPickerOptionPaddingH, borderRadius: imgPickerOptionRadius, marginBottom: imgPickerOptionMarginB, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' }}
              onPress={() => { setShowImageSourcePicker(false); handlePickFromFiles(); }}
            >
              <View style={{ width: imgPickerOptionIconSize, height: imgPickerOptionIconSize, borderRadius: imgPickerOptionIconRadius, alignItems: 'center', justifyContent: 'center', marginRight: sz(12), backgroundColor: 'rgba(234, 88, 12, 0.15)' }}>
                <Ionicons name="folder" size={22} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: imgPickerOptionTitleSize, fontWeight: '600', color: '#f1f5f9', marginBottom: sz(2) }}>{isVi ? 'Tệp' : 'Files'}</Text>
                <Text style={{ fontSize: imgPickerOptionSubtitleSize, color: '#94a3b8' }}>{isVi ? 'Chọn từ iCloud...' : 'Choose from iCloud...'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: imgPickerCancelMarginT, paddingVertical: imgPickerCancelPaddingV, borderRadius: imgPickerCancelRadius, backgroundColor: '#334155', alignItems: 'center' }}
              onPress={() => setShowImageSourcePicker(false)}
            >
              <Text style={{ fontSize: pickerCancelTextSize, fontWeight: '600', color: '#94a3b8' }}>{isVi ? 'Hủy' : 'Cancel'}</Text>
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

    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8' },
  content: { flexGrow: 1 },

  card: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardIconWrap: { backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontWeight: '700', color: '#f1f5f9' },
  cardSubtitle: { color: '#64748b' },

  editIconBtn: { backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center' },
  cancelIconBtn: { backgroundColor: 'rgba(148, 163, 184, 0.15)', alignItems: 'center', justifyContent: 'center' },
  saveIconBtn: { backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },

  fieldRow: {},
  fieldLabel: { fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  readOnlyField: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  readOnlyValue: { color: '#f1f5f9' },
  linkValue: { color: '#3b82f6' },
  inputField: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#10b981', color: '#f1f5f9' },
  pickerField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#10b981' },
  pickerFieldText: { color: '#f1f5f9', flex: 1 },
  pickerPlaceholder: { color: '#64748b' },

  logoSection: { alignItems: 'center' },
  logoPreviewWrap: { backgroundColor: '#0f172a', borderWidth: 2, borderColor: '#334155', overflow: 'hidden' },
  logoPreview: { width: '100%', height: '100%' },
  selectedFileName: { color: '#94a3b8' },
  logoActions: { flexDirection: 'row' },
  logoActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  logoActionText: { color: '#10b981', fontWeight: '600' },
  logoDeleteBtn: { backgroundColor: 'rgba(248, 113, 113, 0.1)', borderColor: 'rgba(248, 113, 113, 0.3)' },
  logoDeleteText: { color: '#f87171', fontWeight: '600' },
  logoUploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981' },
  logoUploadText: { color: '#fff', fontWeight: '600' },
  logoUploadZone: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#334155' },
  uploadIconWrap: { backgroundColor: 'rgba(16, 185, 129, 0.15)', alignItems: 'center', justifyContent: 'center' },
  uploadText: { fontWeight: '600', color: '#10b981' },
  uploadHint: { color: '#64748b' },
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
