import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Modal, ScrollView, Switch, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { getAccessToken, getUserPermissions, getUserRoles, refreshUser } from '../../lib/auth-store';
import { TENANT_ADMIN_BASE } from '../../lib/api/config';
import { useNotification } from '../../lib/notification';
import { useResponsive } from '../../lib/useResponsive';

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
  const { width, sz, fs } = useResponsive();
  const { language } = useLanguageStore();
  const t = translations[language];
  const { showToast, showConfirm, showSuccess, showError } = useNotification();

  // Responsive values
  const isSmall = width < 375;
  const summaryRowPadding = sz(12);
  const summaryCardPaddingV = isSmall ? sz(12) : sz(14);
  const summaryCardPaddingH = sz(8);
  const summaryCardRadius = sz(16);
  const summaryIconSize = sz(36);
  const summaryIconRadius = sz(10);
  const summaryValueSize = isSmall ? fs(20) : fs(22);
  const summaryLabelSize = fs(11);
  const filterRowPaddingH = sz(16);
  const filterRowPaddingB = sz(12);
  const filterBtnPaddingV = sz(8);
  const filterBtnPaddingH = sz(12);
  const filterBtnRadius = sz(20);
  const filterBtnTextSize = fs(12);
  const listPaddingH = sz(16);
  const listPaddingB = sz(20);
  const listGap = sz(12);
  const emptyPaddingV = sz(60);
  const emptyPaddingH = sz(20);
  const emptyIconSize = sz(80);
  const emptyIconRadius = sz(40);
  const emptyTitleSize = isSmall ? fs(16) : fs(17);
  const cardPadding = sz(16);
  const cardRadius = sz(16);
  const cardHeaderMarginB = sz(12);
  const avatarSize = sz(44);
  const avatarRadius = sz(22);
  const avatarTextSize = fs(18);
  const cardLeftGap = sz(12);
  const cardNameSize = fs(15);
  const cardEmailSize = fs(12);
  const cardEmailMarginT = sz(3);
  const statusPillPaddingH = sz(10);
  const statusPillPaddingV = sz(5);
  const statusPillRadius = sz(20);
  const statusPillTextSize = fs(11);
  const cardRolesGap = sz(6);
  const cardRolesMarginB = sz(12);
  const roleBadgePaddingH = sz(10);
  const roleBadgePaddingV = sz(4);
  const roleBadgeRadius = sz(12);
  const roleBadgeTextSize = fs(11);
  const cardFooterPaddingT = sz(10);
  const viewDetailTextSize = fs(13);
  const modalHeaderPaddingH = sz(20);
  const modalHeaderPaddingV = sz(16);
  const modalScrollContentPadding = sz(16);
  const modalScrollContentPaddingB = sz(32);
  const profileCardPadding = sz(20);
  const profileCardRadius = sz(16);
  const profileAvatarSize = sz(80);
  const profileAvatarRadius = sz(40);
  const profileAvatarTextSize = fs(32);
  const profileNameSize = fs(20);
  const profileEmailSize = fs(14);
  const profileEmailMarginB = sz(12);
  const profileMetaGap = sz(12);
  const profileMetaWrapGap = sz(12);
  const profileRolesGap = sz(8);
  const profileRoleBadgePaddingH = sz(12);
  const profileRoleBadgePaddingV = sz(6);
  const profileRoleBadgeRadius = sz(14);
  const profileRoleTextSize = fs(12);
  const statusBadgeLargePaddingH = sz(14);
  const statusBadgeLargePaddingV = sz(8);
  const statusBadgeLargeRadius = sz(20);
  const statusBadgeLargeGap = sz(6);
  const statusBadgeTextSize = fs(14);
  const sectionMarginB = sz(16);
  const sectionTitleSize = fs(14);
  const rolePermInfoPaddingH = sz(12);
  const rolePermInfoPaddingV = sz(8);
  const rolePermInfoRadius = sz(8);
  const rolePermInfoGap = sz(6);
  const rolePermInfoTextSize = fs(12);
  const permissionsListRadius = sz(14);
  const permissionRowPaddingV = sz(12);
  const permissionRowPaddingH = sz(16);
  const permissionRowGap = sz(10);
  const permissionLeftGap = sz(10);
  const permissionLabelSize = fs(14);
  const fixedSwitchSize = sz(42);
  const fixedSwitchRadius = sz(12);
  const actionsSectionGap = sz(10);
  const actionBtnPaddingV = sz(14);
  const actionBtnRadius = sz(12);
  const actionBtnGap = sz(8);
  const actionBtnTextSize = fs(14);
  const editFormGap = sz(16);
  const inputLabelSize = fs(13);
  const inputWrapperPaddingH = sz(14);
  const inputWrapperRadius = sz(12);
  const inputFontSize = fs(15);
  const inputPaddingV = sz(14);
  const saveBtnPaddingV = sz(14);
  const saveBtnRadius = sz(12);
  const saveBtnGap = sz(8);
  const saveBtnTextSize = fs(15);
  const savePermissionsBtnPaddingV = sz(14);
  const savePermissionsBtnRadius = sz(12);
  const savePermissionsBtnMarginT = sz(16);
  
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
  const [pendingPermissions, setPendingPermissions] = useState<string[]>([]); // Chờ lưu
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');

  // Permission guard — only for non-admin
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    getUserRoles().then(roles => {
      if (roles.includes('ROLE_TENANT_ADMIN') || roles.includes('ROLE_SUPER_ADMIN')) {
        setHasAccess(true);
      } else {
        // Refresh permissions from backend in case admin just granted them
        refreshUser().then(() => getUserPermissions()).then(perms => {
          setHasAccess(perms.includes('USER_READ'));
        });
      }
    });
  }, []);

  const TENANT_BASE = TENANT_ADMIN_BASE;

  async function fetchEmployees() {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${TENANT_BASE}/users?status=${statusFilter}`, {
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
      const res = await fetch(`${TENANT_BASE}/roles`, {
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

  async function openDetail(employee: Employee) {
    setSelectedEmployee(employee);
    setSelectedRoleId(employee.roleId || null);
    
    // Ensure roles are loaded first
    if (roles.length === 0) {
      await fetchRoles();
    }
    
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
    // BE returns permissions field (which is direct perms from DB)
    const directPerms = (employee as any).permissions || [];

    // Normalize: if DOCUMENT_ALL present, ensure all children are in allPerms
    // If all children present (but no DOCUMENT_ALL), add DOCUMENT_ALL for UI consistency
    let normalized = [...new Set([...rolePerms, ...directPerms])];
    if (normalized.includes('DOCUMENT_ALL')) {
      // Add children if missing
      DOCUMENT_CHILDREN.forEach(c => { if (!normalized.includes(c)) normalized.push(c); });
    } else {
      // If all 3 children present, add DOCUMENT_ALL for UI
      const hasAllChildren = DOCUMENT_CHILDREN.every(c => normalized.includes(c));
      if (hasAllChildren) normalized.push('DOCUMENT_ALL');
    }

    setUserPermissions(normalized);
    setPendingPermissions(directPerms);
    setHasPendingChanges(false);
    
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
      await fetch(`${TENANT_BASE}/users/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });
      
      setEditModalOpen(false);
      showSuccess(language === 'vi' ? 'Cập nhật thành công' : 'Update successful', t.success);
      fetchEmployees();
    } catch (e) {
      showError(language === 'vi' ? 'Không thể cập nhật' : 'Cannot update', t.error);
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

  const DOCUMENT_CHILDREN = ['DOCUMENT_READ', 'DOCUMENT_WRITE', 'DOCUMENT_DELETE'];

  function togglePermission(permissionCode: string) {
    // Don't allow toggling role permissions (unless it's DOCUMENT_ALL which is always direct)
    if (permissionCode !== 'DOCUMENT_ALL' && isRolePermission(permissionCode)) {
      showError(
        language === 'vi'
          ? 'Quyền này được quy định bởi vai trò và không thể thay đổi'
          : 'This permission is defined by the role and cannot be changed',
        language === 'vi' ? 'Không thể thay đổi' : 'Cannot change'
      );
      return;
    }

    // Handle DOCUMENT_ALL: toggle all 3 document children
    if (permissionCode === 'DOCUMENT_ALL') {
      const hasAll = userPermissions.includes('DOCUMENT_ALL');
      const directPerms = userPermissions.filter(p => !rolePermissions.includes(p) && p !== 'DOCUMENT_ALL');

      if (hasAll) {
        // Uncheck DOCUMENT_ALL + all children from direct perms
        const newDirectPerms = directPerms.filter(p => !DOCUMENT_CHILDREN.includes(p));
        const newPermissions = [...rolePermissions, ...newDirectPerms];
        setUserPermissions(newPermissions);
        setPendingPermissions(newDirectPerms);
      } else {
        // Check DOCUMENT_ALL + all children as direct perms
        const newDirectPerms = [...directPerms, 'DOCUMENT_ALL', ...DOCUMENT_CHILDREN];
        const newPermissions = [...rolePermissions, ...newDirectPerms];
        setUserPermissions(newPermissions);
        setPendingPermissions(newDirectPerms);
      }
      setHasPendingChanges(true);
      return;
    }

    // Toggle individual document permission
    const directPerms = userPermissions.filter(p => !rolePermissions.includes(p) && p !== 'DOCUMENT_ALL');

    let newDirectPerms: string[];
    if (directPerms.includes(permissionCode)) {
      // Uncheck: remove from direct perms (DOCUMENT_ALL will auto-remove if present)
      newDirectPerms = directPerms.filter(p => p !== permissionCode);
    } else {
      // Check: add to direct perms
      newDirectPerms = [...directPerms, permissionCode];
      // If checking last child without DOCUMENT_ALL, auto-check DOCUMENT_ALL
      if (!newDirectPerms.includes('DOCUMENT_ALL')) {
        const allChildrenChecked = DOCUMENT_CHILDREN.every(c =>
          c === permissionCode || newDirectPerms.includes(c)
        );
        if (allChildrenChecked) {
          newDirectPerms.push('DOCUMENT_ALL');
        }
      }
    }

    const newPermissions = [...rolePermissions, ...newDirectPerms];
    setUserPermissions(newPermissions);
    setPendingPermissions(newDirectPerms);
    setHasPendingChanges(true);
  }

  async function savePermissions() {
    if (!selectedEmployee) return;

    const confirmed = await showConfirm({
      title: language === 'vi' ? 'Xác nhận' : 'Confirm',
      message: language === 'vi' ? 'Bạn có chắc muốn lưu thay đổi quyền?' : 'Are you sure you want to save permission changes?',
      confirmText: language === 'vi' ? 'Lưu' : 'Save',
      cancelText: t.cancel,
    });
    if (!confirmed) return;

    setProcessing(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${TENANT_BASE}/users/${selectedEmployee.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: pendingPermissions }),
      });

      if (res.ok) {
        setHasPendingChanges(false);
        setDetailModalOpen(false);
        showSuccess(language === 'vi' ? 'Đã lưu thay đổi quyền' : 'Permission changes saved', t.success);
      } else {
        throw new Error('Failed to update');
      }
    } catch (e) {
      showError(language === 'vi' ? 'Không thể lưu thay đổi quyền' : 'Cannot save permission changes', t.error);
    } finally {
      setProcessing(false);
    }
  }

  async function toggleStatus(employee: Employee) {
    const action = employee.status === 'ACTIVE' ? 'deactivate' : 'activate';
    const confirmMsg = employee.status === 'ACTIVE'
      ? (language === 'vi' ? 'Bạn có chắc muốn ngừng kích hoạt nhân viên này?' : 'Are you sure you want to deactivate this employee?')
      : (language === 'vi' ? 'Bạn có chắc muốn kích hoạt nhân viên này?' : 'Are you sure you want to activate this employee?');

    const confirmed = await showConfirm({
      title: language === 'vi' ? 'Xác nhận' : 'Confirm',
      message: confirmMsg,
      confirmText: language === 'vi' ? 'Xác nhận' : 'Confirm',
      cancelText: t.cancel,
      confirmStyle: 'danger',
    });
    if (!confirmed) return;

    setProcessing(true);
    try {
      const token = await getAccessToken();
      await fetch(`${TENANT_BASE}/users/${employee.id}/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEmployees();
      if (detailModalOpen) setDetailModalOpen(false);
    } catch (e) {
      showError(language === 'vi' ? 'Đã xảy ra lỗi' : 'An error occurred', t.error);
    } finally {
      setProcessing(false);
    }
  }

  async function resetPassword(employee: Employee) {
    const confirmed = await showConfirm({
      title: language === 'vi' ? 'Đặt lại mật khẩu' : 'Reset Password',
      message: language === 'vi' ? 'Email đặt lại mật khẩu sẽ được gửi đến nhân viên này?' : 'A password reset email will be sent to this employee?',
      confirmText: language === 'vi' ? 'Gửi email' : 'Send Email',
      cancelText: t.cancel,
      icon: 'key',
      iconColor: '#f59e0b',
    });
    if (!confirmed) return;

    try {
      const token = await getAccessToken();
      await fetch(`${TENANT_BASE}/users/${employee.id}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      showSuccess(language === 'vi' ? 'Đã gửi email đặt lại mật khẩu' : 'Password reset email sent', t.success);
    } catch (e) {
      showError(language === 'vi' ? 'Không thể gửi email' : 'Cannot send email', t.error);
    }
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

  // Permission denied state
  if (hasAccess === false) {
    return (
      <AppShell title={language === 'vi' ? 'Quản lý nhân viên' : 'Employee Management'}>
        <View style={[styles.centered, { gap: sz(16) }]}>
          <View style={[styles.emptyIconWrap, { width: sz(80), height: sz(80), borderRadius: sz(40) }]}>
            <Ionicons name="shield-outline" size={sz(40)} color="#f59e0b" />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: fs(18) }]}>
            {language === 'vi' ? 'Không có quyền truy cập' : 'Access Denied'}
          </Text>
          <Text style={[styles.cardEmail, { textAlign: 'center', maxWidth: 280 }]}>
            {language === 'vi'
              ? 'Bạn chưa được cấp quyền xem danh sách nhân viên. Vui lòng liên hệ quản trị viên.'
              : 'You do not have permission to view the employee list. Please contact your administrator.'}
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, { paddingHorizontal: sz(20), paddingVertical: sz(12), borderRadius: sz(12) }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={sz(18)} color="#fff" />
            <Text style={[styles.saveBtnText, { fontSize: fs(15) }]}>
              {language === 'vi' ? 'Quay lại' : 'Go Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title={language === 'vi' ? 'Quản lý nhân viên' : 'Employee Management'}>
        <View style={[styles.centered, { gap: sz(16) }]}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={[styles.loadingText, { fontSize: fs(15) }]}>{t.loading}</Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={language === 'vi' ? 'Quản lý nhân viên' : 'Employee Management'}>
      {/* Summary Stats */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(34, 197, 94, 0.08)' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.15)', width: summaryIconSize, height: summaryIconSize, borderRadius: summaryIconRadius }]}>
            <Ionicons name="people" size={sz(18)} color="#22c55e" />
          </View>
          <Text style={[styles.summaryValue, { fontSize: summaryValueSize }]}>{activeCount}</Text>
          <Text style={[styles.summaryLabel, { fontSize: summaryLabelSize }]}>{language === 'vi' ? 'Hoạt động' : 'Active'}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(148, 163, 184, 0.08)' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(148, 163, 184, 0.15)', width: summaryIconSize, height: summaryIconSize, borderRadius: summaryIconRadius }]}>
            <Ionicons name="people-outline" size={sz(18)} color="#94a3b8" />
          </View>
          <Text style={[styles.summaryValue, { fontSize: summaryValueSize }]}>{employees.length}</Text>
          <Text style={[styles.summaryLabel, { fontSize: summaryLabelSize }]}>{language === 'vi' ? 'Tổng cộng' : 'Total'}</Text>
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.filterRow}>
        {(['ACTIVE', 'INACTIVE', 'ALL'] as const).map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterBtn, statusFilter === status && styles.filterBtnActive]}
            onPress={() => {
              setStatusFilter(status);
              fetchEmployees();
            }}
          >
            <Text style={[styles.filterBtnText, statusFilter === status && styles.filterBtnTextActive]}>
              {status === 'ACTIVE' ? (language === 'vi' ? 'Hoạt động' : 'Active') :
               status === 'INACTIVE' ? (language === 'vi' ? 'Tạm ngưng' : 'Inactive') :
               (language === 'vi' ? 'Tất cả' : 'All')}
            </Text>
          </TouchableOpacity>
        ))}
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
              <Ionicons name="people-outline" size={sz(40)} color="#10b981" />
            </View>
            <Text style={[styles.emptyTitle, { fontSize: emptyTitleSize }]}>
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
                  <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarRadius, backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.avatarText, { fontSize: avatarTextSize, color: statusInfo.color }]}>
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
                    <Ionicons name="shield-checkmark-outline" size={sz(10)} color="#10b981" />
                    <Text style={styles.roleBadgeText}>{getRoleLabel(role)}</Text>
                  </View>
                ))}
                {item.departmentName && (
                  <View style={[styles.roleBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                    <Ionicons name="business-outline" size={sz(10)} color="#3b82f6" />
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
            <Text style={[styles.modalHeaderTitle, { fontSize: fs(18) }]}>
              {language === 'vi' ? 'Chi tiết nhân viên' : 'Employee Details'}
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={() => { setDetailModalOpen(false); openEdit(selectedEmployee!); }} style={styles.headerBtn}>
                <Ionicons name="create-outline" size={sz(22)} color="#10b981" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDetailModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={sz(22)} color="#f1f5f9" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            {selectedEmployee && (
              <>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                  <View style={[styles.profileAvatar, { width: profileAvatarSize, height: profileAvatarSize, borderRadius: profileAvatarRadius }]}>
                    <Text style={[styles.profileAvatarText, { fontSize: profileAvatarTextSize }]}>
                      {selectedEmployee.fullName?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={styles.profileName}>{selectedEmployee.fullName}</Text>
                  <Text style={styles.profileEmail}>{selectedEmployee.email}</Text>

                  <View style={styles.profileMeta}>
                    {selectedEmployee.departmentName && (
                      <View style={styles.metaItem}>
                        <Ionicons name="business-outline" size={sz(14)} color="#64748b" />
                        <Text style={styles.metaText}>{selectedEmployee.departmentName}</Text>
                      </View>
                    )}
                    {selectedEmployee.phone && (
                      <View style={styles.metaItem}>
                        <Ionicons name="call-outline" size={sz(14)} color="#64748b" />
                        <Text style={styles.metaText}>{selectedEmployee.phone}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.profileRoles}>
                    {selectedEmployee.roles?.map(role => (
                      <View key={role} style={styles.profileRoleBadge}>
                        <Ionicons name="shield-checkmark" size={sz(12)} color="#10b981" />
                        <Text style={styles.profileRoleText}>{getRoleLabel(role)}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.profileStatus}>
                    {(() => {
                      const info = getStatusInfo(selectedEmployee.status);
                      return (
                        <View style={[styles.statusBadgeLarge, { backgroundColor: info.bg }]}>
                          <Ionicons name={selectedEmployee.status === 'ACTIVE' ? 'checkmark-circle' : 'pause-circle'} size={sz(16)} color={info.color} />
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
                    <Ionicons name="information-circle-outline" size={sz(16)} color="#10b981" />
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

                      return (
                        <View
                          key={perm.code}
                          style={[styles.permissionRow, isRolePerm && styles.permissionRowFixed]}
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
                              <View style={styles.fixedSwitchOn}>
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

                  {hasPendingChanges && (
                    <TouchableOpacity
                      style={styles.savePermissionsBtn}
                      onPress={savePermissions}
                      disabled={processing}
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.savePermissionsBtnText}>
                            {language === 'vi' ? 'Lưu thay đổi quyền' : 'Save Permission Changes'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
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
            <Text style={[styles.modalHeaderTitle, { fontSize: fs(18) }]}>
              {language === 'vi' ? 'Chỉnh sửa nhân viên' : 'Edit Employee'}
            </Text>
            <TouchableOpacity onPress={() => setEditModalOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={sz(22)} color="#f1f5f9" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            {selectedEmployee && (
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{language === 'vi' ? 'Họ tên' : 'Full Name'}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={sz(18)} color="#64748b" />
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
                    <Ionicons name="call-outline" size={sz(18)} color="#64748b" />
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
                      <Ionicons name="checkmark" size={sz(20)} color="#fff" />
                      <Text style={styles.saveBtnText}>{language === 'vi' ? 'Lưu thay đổi' : 'Save Changes'}</Text>
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
  // Loading
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#94a3b8', fontSize: 15 },

  // Summary Row
  summaryRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  summaryIconWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryValue: { fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  summaryLabel: { color: '#94a3b8', fontSize: 11 },

  // Filter Row
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  filterBtnText: { color: '#94a3b8', fontWeight: '500', fontSize: 12 },
  filterBtnTextActive: { color: '#fff', fontWeight: '600' },

  // List
  list: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 20, gap: 12 },

  // Empty Card
  emptyCard: { alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginBottom: 16,
  },
  emptyTitle: { fontWeight: '700', color: '#f1f5f9', fontSize: 17 },

  // Employee Card
  employeeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700' },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontWeight: '600', color: '#f1f5f9', fontSize: 15 },
  cardEmail: { color: '#64748b', fontSize: 12 },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: { fontWeight: '600', fontSize: 11 },

  // Role Badges
  cardRoles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: { color: '#10b981', fontWeight: '600', fontSize: 11 },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
    gap: 4,
  },
  viewDetailText: { color: '#10b981', fontWeight: '500', fontSize: 13 },

  // Modal
  modalWrap: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalHeaderTitle: { fontWeight: '700', color: '#f1f5f9', fontSize: 18 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { padding: 6, borderRadius: 8 },
  closeBtn: { padding: 6, borderRadius: 8 },
  modalScroll: { flex: 1 },
  modalScrollContent: { flexGrow: 1, padding: 16, paddingBottom: 32, gap: 16 },

  // Profile Card
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  profileAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  profileAvatarText: { fontWeight: '700', color: '#10b981' },
  profileName: { fontWeight: '700', color: '#f1f5f9', fontSize: 20, marginBottom: 4 },
  profileEmail: { color: '#64748b', fontSize: 14, marginBottom: 12 },
  profileMeta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#94a3b8', fontSize: 13 },
  profileRoles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  profileRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  profileRoleText: { color: '#10b981', fontWeight: '600', fontSize: 12 },
  profileStatus: { marginTop: 10 },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeText: { fontWeight: '600', fontSize: 14 },

  // Section
  section: { gap: 12 },
  sectionTitle: {
    fontWeight: '700',
    color: '#f1f5f9',
    fontSize: 16,
    marginBottom: 4,
  },
  rolePermInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rolePermInfoText: { color: '#10b981', fontWeight: '500', fontSize: 12 },

  // Info Card
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  infoLabel: { color: '#64748b', fontSize: 13 },
  infoValue: { color: '#f1f5f9', fontWeight: '500', fontSize: 13 },

  // Permissions List
  permissionsList: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  permissionRowFixed: { backgroundColor: 'rgba(16, 185, 129, 0.03)' },
  permissionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  permissionTextGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  permissionLabel: { color: '#94a3b8', fontSize: 14 },
  permissionActive: { color: '#f1f5f9', fontWeight: '500' },
  rolePermBadge: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  switchWrapper: { flexDirection: 'row', alignItems: 'center' },
  fixedSwitchOn: {
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Actions Section
  actionsSection: { gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: { fontWeight: '600', fontSize: 14 },

  // Edit Form
  editForm: { gap: 16 },
  inputGroup: { marginBottom: 4 },
  inputLabel: { color: '#94a3b8', marginBottom: 8, fontSize: 13 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  input: { flex: 1, color: '#f1f5f9', fontSize: 15, paddingVertical: 14 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Save Permissions Button
  savePermissionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  savePermissionsBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
