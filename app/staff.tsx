import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
  Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppShell } from '../components/layout/AppShell';
import { COLORS } from '../lib/theme';
import {
  getEmployees, activateEmployee, deactivateEmployee,
  deleteEmployee, resetEmployeePassword,
  type EmployeeUser
} from '../lib/api/employees';
import { useLanguageStore, translations } from '../lib/language-store';

type FilterStatus = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function StaffScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [employees, setEmployees] = useState<EmployeeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeUser | null>(null);

  useEffect(() => {
    loadEmployees();
  }, [filter]);

  async function loadEmployees() {
    try {
      setLoading(true);
      const status = filter === 'ALL' ? undefined : filter;
      const data = await getEmployees(status);
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.warn('Load employees error:', e);
      if (e?.status === 401) {
        Alert.alert(t.error, t.sessionExpired);
      } else if (e?.status === 403) {
        Alert.alert(t.error, language === 'vi' ? 'Bạn không có quyền xem danh sách nhân viên.' : 'You do not have permission to view employee list.');
      } else {
        Alert.alert(t.error, language === 'vi' ? 'Không thể tải danh sách nhân viên.' : 'Cannot load employee list.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  }

  async function handleActivate(emp: EmployeeUser) {
    Alert.alert(
      t.activate,
      `${language === 'vi' ? 'Kích hoạt tài khoản' : 'Activate account'} "${emp.fullName || emp.email}"?`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.activate,
          onPress: async () => {
            try {
              setActionLoading(emp.id);
              await activateEmployee(emp.id);
              Alert.alert(t.success, language === 'vi' ? 'Tài khoản đã được kích hoạt' : 'Account has been activated');
              loadEmployees();
            } catch (err: any) {
              Alert.alert(t.error, err.message || (language === 'vi' ? 'Không thể kích hoạt' : 'Cannot activate'));
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  }

  async function handleDeactivate(emp: EmployeeUser) {
    Alert.alert(
      t.deactivate,
      `${language === 'vi' ? 'Vô hiệu hóa tài khoản' : 'Deactivate account'} "${emp.fullName || emp.email}"?`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.deactivate,
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(emp.id);
              await deactivateEmployee(emp.id);
              Alert.alert(t.success, language === 'vi' ? 'Tài khoản đã được vô hiệu hóa' : 'Account has been deactivated');
              loadEmployees();
            } catch (err: any) {
              Alert.alert(t.error, err.message || (language === 'vi' ? 'Không thể vô hiệu hóa' : 'Cannot deactivate'));
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  }

  async function handleDelete(emp: EmployeeUser) {
    Alert.alert(
      language === 'vi' ? 'Xóa nhân viên' : 'Delete Employee',
      `${language === 'vi' ? 'Xóa' : 'Delete'} "${emp.fullName || emp.email}"?`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(emp.id);
              await deleteEmployee(emp.id);
              Alert.alert(t.success, language === 'vi' ? 'Nhân viên đã được xóa' : 'Employee has been deleted');
              loadEmployees();
            } catch (err: any) {
              Alert.alert(t.error, err.message || (language === 'vi' ? 'Không thể xóa' : 'Cannot delete'));
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  }

  async function handleResetPassword(emp: EmployeeUser) {
    Alert.alert(
      t.resetPassword,
      `${language === 'vi' ? 'Gửi mật khẩu mới cho' : 'Send new password to'} "${emp.email}"?`,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'vi' ? 'Gửi' : 'Send',
          onPress: async () => {
            try {
              setActionLoading(emp.id);
              await resetEmployeePassword(emp.id);
              Alert.alert(t.success, language === 'vi' ? 'Mật khẩu mới đã được gửi đến email' : 'New password has been sent to email');
            } catch (err: any) {
              Alert.alert(t.error, err.message || (language === 'vi' ? 'Không thể reset mật khẩu' : 'Cannot reset password'));
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  }

  function handleViewDetail(emp: EmployeeUser) {
    setSelectedEmployee(emp);
    setDetailModal(true);
  }

  function getStatusColor(isActive: boolean) {
    return isActive ? '#22c55e' : '#ef4444';
  }

  function getStatusLabel(isActive: boolean) {
    return isActive ? t.active : t.inactive;
  }

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'ACTIVE', label: t.active },
    { key: 'INACTIVE', label: t.inactive },
    { key: 'ALL', label: t.all },
  ];

  const renderEmployee = ({ item }: { item: EmployeeUser }) => {
    const isLoading = actionLoading === item.id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleViewDetail(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.fullName || item.email).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {item.fullName || '—'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
            {item.roleName && (
              <Text style={styles.role}>{item.roleName}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.isActive) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.isActive) }]}>
              {getStatusLabel(item.isActive)}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <>
              {item.isActive ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deactivateBtn]}
                  onPress={() => handleDeactivate(item)}
                >
                  <Ionicons name="pause" size={14} color="#fff" />
                  <Text style={styles.actionText}>{language === 'vi' ? 'Tắt' : 'Off'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.activateBtn]}
                  onPress={() => handleActivate(item)}
                >
                  <Ionicons name="play" size={14} color="#fff" />
                  <Text style={styles.actionText}>{language === 'vi' ? 'Bật' : 'On'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.resetBtn]}
                onPress={() => handleResetPassword(item)}
              >
                <Ionicons name="key" size={14} color="#fff" />
                <Text style={styles.actionText}>{language === 'vi' ? 'Reset' : 'Reset'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash" size={14} color="#fff" />
                <Text style={styles.actionText}>{t.delete}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppShell title={t.manageEmployees} subtitle={t.employeeList}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{employees.length}</Text>
          <Text style={styles.statLabel}>{t.total}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>
            {employees.filter(e => e.isActive).length}
          </Text>
          <Text style={styles.statLabel}>{t.active}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>
            {employees.filter(e => !e.isActive).length}
          </Text>
          <Text style={styles.statLabel}>{t.inactive}</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          renderItem={renderEmployee}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>{t.noEmployees}</Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal visible={detailModal} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>{t.viewDetails}</Text>
              <TouchableOpacity onPress={() => setDetailModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedEmployee && (
              <ScrollView style={modalStyles.body}>
                <View style={modalStyles.avatarLarge}>
                  <Text style={modalStyles.avatarText}>
                    {(selectedEmployee.fullName || selectedEmployee.email).charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={modalStyles.infoRow}>
                  <Ionicons name="person" size={18} color={COLORS.textMuted} />
                  <View>
                    <Text style={modalStyles.infoLabel}>{t.fullName}</Text>
                    <Text style={modalStyles.infoValue}>{selectedEmployee.fullName || '—'}</Text>
                  </View>
                </View>

                <View style={modalStyles.infoRow}>
                  <Ionicons name="mail" size={18} color={COLORS.textMuted} />
                  <View>
                    <Text style={modalStyles.infoLabel}>{t.email || 'Email'}</Text>
                    <Text style={modalStyles.infoValue}>{selectedEmployee.email}</Text>
                  </View>
                </View>

                <View style={modalStyles.infoRow}>
                  <Ionicons name="call" size={18} color={COLORS.textMuted} />
                  <View>
                    <Text style={modalStyles.infoLabel}>{t.phone || 'Phone'}</Text>
                    <Text style={modalStyles.infoValue}>{selectedEmployee.phoneNumber || '—'}</Text>
                  </View>
                </View>

                <View style={modalStyles.infoRow}>
                  <Ionicons name="shield-checkmark" size={18} color={COLORS.textMuted} />
                  <View>
                    <Text style={modalStyles.infoLabel}>{t.role || 'Role'}</Text>
                    <Text style={modalStyles.infoValue}>{selectedEmployee.roleName || '—'}</Text>
                  </View>
                </View>

                <View style={modalStyles.infoRow}>
                  <Ionicons name="business" size={18} color={COLORS.textMuted} />
                  <View>
                    <Text style={modalStyles.infoLabel}>{t.department || 'Department'}</Text>
                    <Text style={modalStyles.infoValue}>{selectedEmployee.departmentName || '—'}</Text>
                  </View>
                </View>

                <View style={modalStyles.infoRow}>
                  <Ionicons name="time" size={18} color={COLORS.textMuted} />
                  <View>
                    <Text style={modalStyles.infoLabel}>{t.createdAt || 'Created At'}</Text>
                    <Text style={modalStyles.infoValue}>
                      {selectedEmployee.createdAt ? new Date(selectedEmployee.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}
                    </Text>
                  </View>
                </View>

                <View style={[modalStyles.infoRow, { marginTop: 8 }]}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedEmployee.isActive) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedEmployee.isActive) }]}>
                      {getStatusLabel(selectedEmployee.isActive)}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.accent },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
  },
  filterTabActive: { backgroundColor: COLORS.accent },
  filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.accent },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  email: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  role: { fontSize: 11, color: COLORS.accent, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activateBtn: { backgroundColor: '#22c55e' },
  deactivateBtn: { backgroundColor: '#f59e0b' },
  resetBtn: { backgroundColor: '#3b82f6' },
  deleteBtn: { backgroundColor: '#ef4444' },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  body: { padding: 20 },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: COLORS.accent },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoLabel: { fontSize: 11, color: COLORS.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
});
