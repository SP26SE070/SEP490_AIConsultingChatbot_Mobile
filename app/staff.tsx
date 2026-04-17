import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView,
  Alert, TextInput, Modal, RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { getTenants, approveTenant, rejectTenant } from '../lib/api/staff';
import { clearAuth } from '../lib/auth-store';

interface Tenant {
  id: string;
  name: string;
  contactEmail: string;
  status: string;
  requestedAt: string;
  representativeName?: string;
  requestMessage?: string;
}

type FilterStatus = 'ALL' | 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

export default function StaffScreen() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    loadTenants();
  }, [filter]);

  async function loadTenants() {
    try {
      setLoading(true);
      const data = await getTenants(filter === 'ALL' ? undefined : filter);
      const allTenants = Array.isArray(data) ? data : (data.content ?? data.data ?? []);
      const filtered = filter === 'ALL'
        ? allTenants
        : allTenants.filter((t: any) => t.status === filter);
      setTenants(filtered);
    } catch (e: any) {
      Alert.alert('Lỗi', 'Không thể tải danh sách tổ chức');
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadTenants();
    setRefreshing(false);
  }

  async function handleApprove(tenant: Tenant) {
    Alert.alert(
      'Phê duyệt',
      `Phê duyệt tổ chức "${tenant.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Phê duyệt',
          onPress: async () => {
            try {
              await approveTenant(tenant.id);
              Alert.alert('Thành công', 'Tổ chức đã được phê duyệt');
              loadTenants();
            } catch (e: any) {
              Alert.alert('Lỗi', e.message || 'Không thể phê duyệt');
            }
          }
        }
      ]
    );
  }

  function handleRejectPress(tenant: Tenant) {
    setSelectedTenant(tenant);
    setRejectReason('');
    setRejectModal(true);
  }

  async function handleRejectConfirm() {
    if (!selectedTenant) return;
    if (!rejectReason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      await rejectTenant(selectedTenant.id, rejectReason.trim());
      setRejectModal(false);
      Alert.alert('Thành công', 'Tổ chức đã bị từ chối');
      loadTenants();
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể từ chối');
    }
  }

  async function handleLogout() {
    await clearAuth();
    router.replace('/login');
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'ACTIVE': return '#22c55e';
      case 'REJECTED': return '#ef4444';
      case 'SUSPENDED': return '#6366f1';
      default: return '#64748b';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'PENDING': return 'Chờ duyệt';
      case 'ACTIVE': return 'Hoạt động';
      case 'REJECTED': return 'Từ chối';
      case 'SUSPENDED': return 'Tạm ngưng';
      default: return status;
    }
  }

  const filters: FilterStatus[] = ['PENDING', 'ACTIVE', 'REJECTED', 'ALL'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý tổ chức</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? 'Tất cả' : getStatusLabel(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(item, index) => item.id ?? index.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Không có tổ chức nào</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.tenantName} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.tenantEmail}>{item.contactEmail}</Text>
              {item.representativeName && (
                <Text style={styles.tenantRep}>Đại diện: {item.representativeName}</Text>
              )}
              {item.requestMessage && (
                <Text style={styles.tenantMessage} numberOfLines={2}>
                  {item.requestMessage}
                </Text>
              )}
              {item.status === 'PENDING' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApprove(item)}
                  >
                    <Text style={styles.actionBtnText}>✓ Phê duyệt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleRejectPress(item)}
                  >
                    <Text style={styles.actionBtnText}>✕ Từ chối</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Reject Modal */}
      <Modal visible={rejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lý do từ chối</Text>
            <Text style={styles.modalSubtitle}>{selectedTenant?.name}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nhập lý do từ chối..."
              placeholderTextColor="#64748b"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setRejectModal(false)}
              >
                <Text style={styles.modalBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={handleRejectConfirm}
              >
                <Text style={styles.modalBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#f1f5f9' },
  logoutText: { color: '#ef4444', fontSize: 14 },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  filterTabActive: { backgroundColor: '#22c55e' },
  filterText: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#64748b', fontSize: 15, textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tenantName: { color: '#f1f5f9', fontSize: 15, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  tenantEmail: { color: '#64748b', fontSize: 13, marginBottom: 4 },
  tenantRep: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  tenantMessage: { color: '#475569', fontSize: 12, marginBottom: 8, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  approveBtn: { backgroundColor: '#22c55e' },
  rejectBtn: { backgroundColor: '#ef4444' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalSubtitle: { color: '#64748b', fontSize: 14, marginBottom: 16 },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    color: '#f1f5f9',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#334155' },
  confirmBtn: { backgroundColor: '#ef4444' },
  modalBtnText: { color: '#fff', fontWeight: '600' },
});
