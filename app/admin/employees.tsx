import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl, Modal, ScrollView, Switch, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { getAccessToken } from '../../lib/auth-store';

interface Employee {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  departmentName?: string;
  roles: string[];
  roleId?: number;
  permissions: string[];
  directPermissions?: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  lastLoginAt?: string;
}

interface Role {
  id: number;
  name: string;
  permissions: string[];
}

const STATUS_CONFIG = {
  ACTIVE: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', labelVi: 'Hoạt động', labelEn: 'Active' },
  INACTIVE: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', labelVi: 'Tạm ngưng', labelEn: 'Inactive' },
};

const PERMISSIONS_LIST = [
  { code: 'DOCUMENT_READ', icon: 'document-text', labelVi: 'Xem tài liệu', labelEn: 'View Documents' },
  { code: 'DOCUMENT_WRITE', icon: 'create', labelVi: 'Upload/Sửa tài liệu', labelEn: 'Upload/Edit Documents' },
  { code: 'DOCUMENT_DELETE', icon: 'trash', labelVi: 'Xóa tài liệu', labelEn: 'Delete Documents' },
  { code: 'DOCUMENT_ALL', icon: 'folder', labelVi: 'Tất cả quyền tài liệu', labelEn: 'All Document Permissions' },
  { code: 'ANALYTICS_VIEW', icon: 'analytics', labelVi: 'Xem thống kê', labelEn: 'View Analytics' },
  { code: 'USER_READ', icon: 'people', labelVi: 'Xem danh sách nhân viên', labelEn: 'View Users' },
];

const DEFAULT_PERMISSIONS = [
  'CHAT', 'VIEW_HISTORY'
];

export default function AdminEmployeesScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', departmentName: '' });
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);

  const API_BASE = 'http://10.0.2.2:8080/api/v1';

  async function fetchEmployees() {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/tenant-admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEmployees(data.content || data || []);
    } catch (e) {
      console.warn('Failed to fetch employees:', e);
      setEmployees([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchRoles() {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/tenant-admin/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(data.content || data || []);
      }
    } catch (e) {
      console.warn('Failed to fetch roles:', e);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
      fetchRoles();
    }, [])
  );

  function openDetail(employee: Employee) {
    setSelectedEmployee(employee);
    setSelectedRoleId(employee.roleId || null);
    
    // Get role permissions
    if (employee.roleId) {
      const userRole = roles.find(r => r.id === employee.roleId);
      setRolePermissions(userRole?.permissions || []);
    } else {
      setRolePermissions([]);
    }
    
    // Combine role permissions with direct permissions
    const rolePerms = employee.roleId 
      ? (roles.find(r => r.id === employee.roleId)?.permissions || [])
      : [];
    const directPerms = employee.directPermissions || [];
    const allPerms = [...new Set([...rolePerms, ...directPerms])];
    setUserPermissions(allPerms);
    
    setDetailModalOpen(true);
  }

  function openEdit(employee: Employee) {
    setSelectedEmployee(employee);
    setEditForm({
      fullName: employee.fullName || '',
      phone: employee.phone || '',
      departmentName: employee.departmentName || '',
    });
    setEditModalOpen(true);
  }

  async function saveEdit() {
    if (!selectedEmployee) return;
    
    setProcessing(true);
    try {
      const token = await getAccessToken();
      await fetch(`${API_BASE}/tenant-admin/users/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });
      
      setEditModalOpen(false);
      Alert.alert(t.success, language === 'vi' ? 'Cập nhật thành công' : 'Update successful');
      fetchEmployees();
    } catch (e) {
      Alert.alert(t.error, language === 'vi' ? 'Không thể cập nhật' : 'Cannot update');
    } finally {
      setProcessing(false);
    }
  }

  function isRolePermission(permissionCode: string): boolean {
    return rolePermissions.includes(permissionCode);
  }

  function isDirectPermission(permissionCode: string): boolean {
    return userPermissions.includes(permissionCode) && !rolePermissions.includes(permissionCode);
  }

  function togglePermission(permissionCode: string) {
    // Don't allow toggling role permissions
    if (isRolePermission(permissionCode)) {
      Alert.alert(
        language === 'vi' ? 'Không thể thay đổi' : 'Cannot change',
        language === 'vi' 
          ? 'Quyền này được quy định bởi vai trò và không thể thay đổi'
          : 'This permission is defined by the role and cannot be changed'
      );
      return;
    }
    
    // Toggle direct permission
    const directPerms = userPermissions.filter(p => !rolePermissions.includes(p));
    const newDirectPerms = directPerms.includes(permissionCode)
      ? directPerms.filter(p => p !== permissionCode)
      : [...directPerms, permissionCode];
    
    const newPermissions = [...rolePermissions, ...newDirectPerms];
    setUserPermissions(newPermissions);
    
    // Send to API
    fetch(`${API_BASE}/tenant-admin/users/${selectedEmployee?.id}/permissions`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ permissions: newDirectPerms }),
    }).catch(() => {
      Alert.alert(t.error, language === 'vi' ? 'Không thể cập nhật quyền' : 'Cannot update permissions');
    });
  }

  async function toggleStatus(employee: Employee) {
    const action = employee.status === 'ACTIVE' ? 'deactivate' : 'activate';
    const confirmMsg = employee.status === 'ACTIVE'
      ? (language === 'vi' ? 'Bạn có chắc muốn ngừng kích hoạt nhân viên này?' : 'Are you sure you want to deactivate this employee?')
      : (language === 'vi' ? 'Bạn có chắc muốn kích hoạt nhân viên này?' : 'Are you sure you want to activate this employee?');

    Alert.alert(
      language === 'vi' ? 'Xác nhận' : 'Confirm',
      confirmMsg,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'vi' ? 'Xác nhận' : 'Confirm',
          onPress: async () => {
            setProcessing(true);
            try {
              const token = await getAccessToken();
              await fetch(`${API_BASE}/tenant-admin/users/${employee.id}/${action}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchEmployees();
              if (detailModalOpen) setDetailModalOpen(false);
            } catch (e) {
              Alert.alert(t.error, language === 'vi' ? 'Đã xảy ra lỗi' : 'An error occurred');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  }

  async function resetPassword(employee: Employee) {
    Alert.alert(
      language === 'vi' ? 'Đặt lại mật khẩu' : 'Reset Password',
      language === 'vi' ? 'Email đặt lại mật khẩu sẽ được gửi đến nhân viên này?' : 'A password reset email will be sent to this employee?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'vi' ? 'Gửi email' : 'Send Email',
          onPress: async () => {
            try {
              const token = await getAccessToken();
              await fetch(`${API_BASE}/tenant-admin/users/${employee.id}/reset-password`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert(t.success, language === 'vi' ? 'Đã gửi email đặt lại mật khẩu' : 'Password reset email sent');
            } catch (e) {
              Alert.alert(t.error, language === 'vi' ? 'Không thể gửi email' : 'Cannot send email');
            }
          },
        },
      ]
    );
  }

  function onRefresh() {
    setRefreshing(true);
    fetchEmployees();
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function getRoleLabel(role: string) {
    return role.replace(/_/g, ' ').toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function getStatusInfo(status: string) {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.ACTIVE;
  }

  function getPermissionLabel(code: string) {
    const perm = PERMISSIONS_LIST.find(p => p.code === code);
    if (perm) return language === 'vi' ? perm.labelVi : perm.labelEn;
    return code;
  }

  function getPermissionIcon(code: string) {
    const perm = PERMISSIONS_LIST.find(p => p.code === code);
    return perm?.icon || 'key';
  }

  const activeCount = employees.filter(e => e.status === 'ACTIVE').length;

  if (loading) {
    return (
      <AppShell title={language === 'vi' ? 'Quản lý nhân viên' : 'Employee Management'}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>{t.loading}</Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={language === 'vi' ? 'Quản lý nhân viên' : 'Employee Management'}>
      {/* Summary Stats */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(34, 197, 94, 0.08)' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
            <Ionicons name="people" size={18} color="#22c55e" />
          </View>
          <Text style={styles.summaryValue}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>{language === 'vi' ? 'Hoạt động' : 'Active'}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(148, 163, 184, 0.08)' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
            <Ionicons name="people-outline" size={18} color="#94a3b8" />
          </View>
          <Text style={styles.summaryValue}>{employees.length}</Text>
          <Text style={styles.summaryLabel}>{language === 'vi' ? 'Tổng cộng' : 'Total'}</Text>
        </View>
      </View>

      {/* Employee List */}
      <FlatList
        data={employees}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people-outline" size={40} color="#10b981" />
            </View>
            <Text style={styles.emptyTitle}>
              {language === 'vi' ? 'Chưa có nhân viên nào' : 'No employees yet'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusInfo = getStatusInfo(item.status);

          return (
            <TouchableOpacity 
              style={styles.employeeCard} 
              onPress={() => openDetail(item)}
              activeOpacity={0.75}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <View style={[styles.avatar, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.avatarText, { color: statusInfo.color }]}>
                      {item.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.fullName}</Text>
                    <Text style={styles.cardEmail} numberOfLines={1}>{item.email}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                    {language === 'vi' ? statusInfo.labelVi : statusInfo.labelEn}
                  </Text>
                </View>
              </View>

              <View style={styles.cardRoles}>
                {item.roles?.map(role => (
                  <View key={role} style={styles.roleBadge}>
                    <Ionicons name="shield-checkmark-outline" size={10} color="#10b981" />
                    <Text style={styles.roleBadgeText}>{getRoleLabel(role)}</Text>
                  </View>
                ))}
                {item.departmentName && (
                  <View style={[styles.roleBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                    <Ionicons name="business-outline" size={10} color="#3b82f6" />
                    <Text style={[styles.roleBadgeText, { color: '#3b82f6' }]}>{item.departmentName}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.viewDetailText}>
                  {language === 'vi' ? 'Xem chi tiết' : 'View details'}
                </Text>
                <Ionicons name="chevron-forward" size={15} color="#10b981" />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Detail Modal */}
      <Modal
        visible={detailModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailModalOpen(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>
              {language === 'vi' ? 'Chi tiết nhân viên' : 'Employee Details'}
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => { setDetailModalOpen(false); openEdit(selectedEmployee!); }} style={styles.headerBtn}>
                <Ionicons name="create-outline" size={22} color="#10b981" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDetailModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#f1f5f9" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            {selectedEmployee && (
              <>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                  <View style={[styles.profileAvatar, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Text style={styles.profileAvatarText}>
                      {selectedEmployee.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={styles.profileName}>{selectedEmployee.fullName}</Text>
                  <Text style={styles.profileEmail}>{selectedEmployee.email}</Text>
                  
                  <View style={styles.profileMeta}>
                    {selectedEmployee.departmentName && (
                      <View style={styles.metaItem}>
                        <Ionicons name="business-outline" size={14} color="#64748b" />
                        <Text style={styles.metaText}>{selectedEmployee.departmentName}</Text>
                      </View>
                    )}
                    {selectedEmployee.phone && (
                      <View style={styles.metaItem}>
                        <Ionicons name="call-outline" size={14} color="#64748b" />
                        <Text style={styles.metaText}>{selectedEmployee.phone}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.profileRoles}>
                    {selectedEmployee.roles?.map(role => (
                      <View key={role} style={styles.profileRoleBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#10b981" />
                        <Text style={styles.profileRoleText}>{getRoleLabel(role)}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.profileStatus}>
                    {(() => {
                      const info = getStatusInfo(selectedEmployee.status);
                      return (
                        <View style={[styles.statusBadgeLarge, { backgroundColor: info.bg }]}>
                          <Ionicons name={selectedEmployee.status === 'ACTIVE' ? 'checkmark-circle' : 'pause-circle'} size={16} color={info.color} />
                          <Text style={[styles.statusBadgeText, { color: info.color }]}>
                            {language === 'vi' ? info.labelVi : info.labelEn}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                </View>

                {/* Info Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="information-circle-outline" size={16} color="#10b981" />
                    {language === 'vi' ? ' Thông tin' : ' Information'}
                  </Text>
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{language === 'vi' ? 'Ngày tạo' : 'Created At'}</Text>
                      <Text style={styles.infoValue}>{formatDate(selectedEmployee.createdAt)}</Text>
                    </View>
                    {selectedEmployee.lastLoginAt && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{language === 'vi' ? 'Đăng nhập cuối' : 'Last Login'}</Text>
                        <Text style={styles.infoValue}>{formatDate(selectedEmployee.lastLoginAt)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Permissions Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="key-outline" size={16} color="#10b981" />
                    {language === 'vi' ? ' Phân quyền' : ' Permissions'}
                  </Text>
                  
                  {/* Role permissions info */}
                  {rolePermissions.length > 0 && (
                    <View style={styles.rolePermInfo}>
                      <Ionicons name="shield-checkmark" size={14} color="#10b981" />
                      <Text style={styles.rolePermInfoText}>
                        {language === 'vi' 
                          ? `Quyền từ vai trò (không thể thay đổi)`
                          : `Role permissions (cannot be changed)`
                        }
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.permissionsList}>
                    {PERMISSIONS_LIST.map(perm => {
                      const isRolePerm = isRolePermission(perm.code);
                      const isDirectPerm = isDirectPermission(perm.code);
                      
                      return (
                        <View 
                          key={perm.code} 
                          style={[
                            styles.permissionRow,
                            isRolePerm && styles.permissionRowFixed
                          ]}
                        >
                          <View style={styles.permissionLeft}>
                            <Ionicons 
                              name={getPermissionIcon(perm.code) as any} 
                              size={18} 
                              color={userPermissions.includes(perm.code) ? '#10b981' : '#64748b'} 
                            />
                            <View style={styles.permissionTextGroup}>
                              <Text style={[styles.permissionLabel, userPermissions.includes(perm.code) && styles.permissionActive]}>
                                {language === 'vi' ? perm.labelVi : perm.labelEn}
                              </Text>
                              {isRolePerm && (
                                <Text style={styles.rolePermBadge}>
                                  {language === 'vi' ? 'Từ vai trò' : 'From role'}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.switchWrapper}>
                            {isRolePerm ? (
                              <View style={[styles.fixedSwitchOn]}>
                                <Ionicons name="checkmark" size={12} color="#fff" />
                              </View>
                            ) : (
                              <Switch
                                value={userPermissions.includes(perm.code)}
                                onValueChange={() => togglePermission(perm.code)}
                                trackColor={{ false: '#334155', true: 'rgba(16, 185, 129, 0.5)' }}
                                thumbColor={userPermissions.includes(perm.code) ? '#10b981' : '#94a3b8'}
                              />
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsSection}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}
                    onPress={() => resetPassword(selectedEmployee)}
                  >
                    <Ionicons name="key-outline" size={20} color="#3b82f6" />
                    <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>
                      {language === 'vi' ? 'Đặt lại mật khẩu' : 'Reset Password'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: selectedEmployee.status === 'ACTIVE' ? 'rgba(248, 113, 113, 0.12)' : 'rgba(34, 197, 94, 0.12)' }]}
                    onPress={() => toggleStatus(selectedEmployee)}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color={selectedEmployee.status === 'ACTIVE' ? '#f87171' : '#22c55e'} />
                    ) : (
                      <>
                        <Ionicons name={selectedEmployee.status === 'ACTIVE' ? 'pause-circle-outline' : 'play-circle-outline'} size={20} color={selectedEmployee.status === 'ACTIVE' ? '#f87171' : '#22c55e'} />
                        <Text style={[styles.actionBtnText, { color: selectedEmployee.status === 'ACTIVE' ? '#f87171' : '#22c55e' }]}>
                          {selectedEmployee.status === 'ACTIVE' 
                            ? (language === 'vi' ? 'Tạm ngưng' : 'Deactivate')
                            : (language === 'vi' ? 'Kích hoạt' : 'Activate')
                          }
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={editModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalOpen(false)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>
              {language === 'vi' ? 'Chỉnh sửa nhân viên' : 'Edit Employee'}
            </Text>
            <TouchableOpacity onPress={() => setEditModalOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#f1f5f9" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            {selectedEmployee && (
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{language === 'vi' ? 'Họ tên' : 'Full Name'}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color="#64748b" />
                    <TextInput
                      style={styles.input}
                      value={editForm.fullName}
                      onChangeText={(text) => setEditForm({ ...editForm, fullName: text })}
                      placeholder={language === 'vi' ? 'Nhập họ tên' : 'Enter full name'}
                      placeholderTextColor="#64748b"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{language === 'vi' ? 'Số điện thoại' : 'Phone'}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={18} color="#64748b" />
                    <TextInput
                      style={styles.input}
                      value={editForm.phone}
                      onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                      placeholder={language === 'vi' ? 'Nhập số điện thoại' : 'Enter phone number'}
                      placeholderTextColor="#64748b"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, processing && styles.saveBtnDisabled]}
                  onPress={saveEdit}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.saveBtnText}>
                        {language === 'vi' ? 'Lưu thay đổi' : 'Save Changes'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#94a3b8', fontSize: 15 },
  
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16 },
  summaryIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
  summaryLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  
  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  
  emptyCard: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.2)' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
  
  employeeCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#f1f5f9' },
  cardEmail: { fontSize: 12, color: '#64748b', marginTop: 3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  
  cardRoles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { fontSize: 11, color: '#10b981', fontWeight: '600' },
  
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  viewDetailText: { fontSize: 13, color: '#10b981', fontWeight: '500' },
  
  // Modal
  modalWrap: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { padding: 4 },
  closeBtn: { padding: 4 },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 16, paddingBottom: 32 },
  
  // Profile Card
  profileCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileAvatarText: { fontSize: 32, fontWeight: '700', color: '#10b981' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  profileMeta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#94a3b8' },
  profileRoles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 12 },
  profileRoleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  profileRoleText: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  profileStatus: { marginTop: 4 },
  statusBadgeLarge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  statusBadgeText: { fontSize: 14, fontWeight: '600' },
  
  // Section
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#10b981', marginBottom: 12 },
  rolePermInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16, 185, 129, 0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 10 },
  rolePermInfoText: { fontSize: 12, color: '#10b981', fontWeight: '500' },
  infoCard: { backgroundColor: '#1e293b', borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: '#334155' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.1)' },
  infoLabel: { fontSize: 13, color: '#64748b' },
  infoValue: { fontSize: 13, color: '#f1f5f9', fontWeight: '500' },
  
  // Permissions
  permissionsList: { backgroundColor: '#1e293b', borderRadius: 14, borderWidth: 1, borderColor: '#334155' },
  permissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.1)' },
  permissionRowFixed: { backgroundColor: 'rgba(16, 185, 129, 0.03)' },
  permissionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  permissionTextGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  permissionLabel: { fontSize: 14, color: '#94a3b8' },
  permissionActive: { color: '#f1f5f9', fontWeight: '500' },
  rolePermBadge: { fontSize: 10, color: '#10b981', fontWeight: '600', backgroundColor: 'rgba(16, 185, 129, 0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  switchWrapper: { flexDirection: 'row', alignItems: 'center' },
  fixedSwitchOn: { width: 42, height: 24, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  lockedBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  
  // Actions
  actionsSection: { gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  
  // Edit Form
  editForm: { gap: 16 },
  inputGroup: { marginBottom: 4 },
  inputLabel: { fontSize: 13, color: '#94a3b8', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#334155' },
  input: { flex: 1, fontSize: 15, color: '#f1f5f9', paddingVertical: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
