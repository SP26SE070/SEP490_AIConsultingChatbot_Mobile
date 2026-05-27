import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl, Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AppShell } from '../../components/layout/AppShell';
import { useLanguageStore, translations } from '../../lib/language-store';
import { getAccessToken } from '../../lib/auth-store';

interface Tenant {
  id: string;
  name: string;
  address?: string;
  website?: string;
  companySize?: string;
  contactEmail: string;
  representativeName?: string;
  representativePosition?: string;
  representativePhone?: string;
  requestMessage?: string;
  requestedAt?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  reviewedByName?: string;
  approvedByName?: string;
  rejectedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt?: string;
}

const STATUS_CONFIG = {
  PENDING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', labelVi: 'Chờ duyệt', labelEn: 'Pending', icon: 'time-outline' },
  ACTIVE: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)', labelVi: 'Hoạt động', labelEn: 'Active', icon: 'checkmark-circle-outline' },
  SUSPENDED: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)', labelVi: 'Tạm ngưng', labelEn: 'Suspended', icon: 'pause-circle-outline' },
  REJECTED: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', labelVi: 'Từ chối', labelEn: 'Rejected', icon: 'close-circle-outline' },
};

export default function StaffOrganizationsScreen() {
  const { language } = useLanguageStore();
  const t = translations[language];
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const API_BASE = 'http://10.0.2.2:8080/api/v1';

  async function fetchTenants() {
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API_BASE}/staff/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTenants(data.content || data || []);
    } catch (e) {
      console.warn('Failed to fetch tenants:', e);
      setTenants([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchTenants();
    }, [])
  );

  function openDetail(tenant: Tenant) {
    setSelectedTenant(tenant);
    setDetailModalOpen(true);
  }

  async function handleApprove(tenantId: string, closeAfter = false) {
    Alert.alert(
      language === 'vi' ? 'Xác nhận duyệt' : 'Confirm Approval',
      language === 'vi' ? 'Bạn có chắc muốn duyệt tổ chức này?' : 'Are you sure you want to approve this tenant?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'vi' ? 'Duyệt' : 'Approve',
          onPress: async () => {
            setProcessing(tenantId);
            try {
              const token = await getAccessToken();
              const res = await fetch(`${API_BASE}/staff/tenants/${tenantId}/approve`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                if (closeAfter) {
                  setDetailModalOpen(false);
                  setSelectedTenant(null);
                }
                fetchTenants();
              } else {
                Alert.alert(t.error, language === 'vi' ? 'Không thể duyệt tổ chức' : 'Cannot approve tenant');
              }
            } catch (e) {
              Alert.alert(t.error, language === 'vi' ? 'Đã xảy ra lỗi' : 'An error occurred');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  }

  async function handleReject(tenantId: string, closeAfter = false) {
    Alert.alert(
      language === 'vi' ? 'Xác nhận từ chối' : 'Confirm Rejection',
      language === 'vi' ? 'Bạn có chắc muốn từ chối tổ chức này?' : 'Are you sure you want to reject this tenant?',
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: language === 'vi' ? 'Từ chối' : 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessing(tenantId);
            try {
              const token = await getAccessToken();
              const res = await fetch(`${API_BASE}/staff/tenants/${tenantId}/reject`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                if (closeAfter) {
                  setDetailModalOpen(false);
                  setSelectedTenant(null);
                }
                fetchTenants();
              } else {
                Alert.alert(t.error, language === 'vi' ? 'Không thể từ chối tổ chức' : 'Cannot reject tenant');
              }
            } catch (e) {
              Alert.alert(t.error, language === 'vi' ? 'Đã xảy ra lỗi' : 'An error occurred');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  }

  function onRefresh() {
    setRefreshing(true);
    fetchTenants();
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function getStatusInfo(status: string) {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
  }

  const pendingCount = tenants.filter(t => t.status === 'PENDING').length;

  if (loading) {
    return (
      <AppShell title={t.approveTenant} subtitle={language === 'vi' ? 'Quản lý tổ chức' : 'Manage Tenants'}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>{t.loading}</Text>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell title={t.approveTenant} subtitle={language === 'vi' ? 'Quản lý tổ chức' : 'Manage Tenants'}>
      {/* Summary Stats */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
            <Ionicons name="time-outline" size={18} color="#f59e0b" />
          </View>
          <Text style={styles.summaryValue}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>{language === 'vi' ? 'Chờ duyệt' : 'Pending'}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(34, 197, 94, 0.08)' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
          </View>
          <Text style={styles.summaryValue}>{tenants.filter(t => t.status === 'ACTIVE').length}</Text>
          <Text style={styles.summaryLabel}>{language === 'vi' ? 'Hoạt động' : 'Active'}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: 'rgba(148, 163, 184, 0.08)' }]}>
          <View style={[styles.summaryIconWrap, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
            <Ionicons name="business-outline" size={18} color="#94a3b8" />
          </View>
          <Text style={styles.summaryValue}>{tenants.length}</Text>
          <Text style={styles.summaryLabel}>{language === 'vi' ? 'Tổng cộng' : 'Total'}</Text>
        </View>
      </View>

      {/* Tenant List */}
      <FlatList
        data={tenants}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="business-outline" size={40} color="#10b981" />
            </View>
            <Text style={styles.emptyTitle}>{language === 'vi' ? 'Chưa có tổ chức nào' : 'No organizations yet'}</Text>
            <Text style={styles.emptySubtitle}>{language === 'vi' ? 'Danh sách tổ chức đăng ký sẽ xuất hiện tại đây' : 'Registered organizations will appear here'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusInfo = getStatusInfo(item.status);
          const isPending = item.status === 'PENDING';
          const isProcessingThis = processing === item.id;

          return (
            <TouchableOpacity 
              style={styles.card} 
              onPress={() => openDetail(item)}
              activeOpacity={0.75}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <View style={[styles.cardIcon, { backgroundColor: statusInfo.bg }]}>
                    <Ionicons name={statusInfo.icon as any} size={18} color={statusInfo.color} />
                  </View>
                  <View style={styles.cardTitleGroup}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardEmail} numberOfLines={1}>{item.contactEmail}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                    {language === 'vi' ? statusInfo.labelVi : statusInfo.labelEn}
                  </Text>
                </View>
              </View>

              {/* Representative */}
              {item.representativeName && (
                <View style={styles.repRow}>
                  <View style={styles.repItem}>
                    <Ionicons name="person-outline" size={13} color="#64748b" />
                    <Text style={styles.repText}>{item.representativeName}</Text>
                  </View>
                  {item.representativePosition && (
                    <Text style={styles.repSep}>·</Text>
                  )}
                  {item.representativePosition && (
                    <View style={styles.repItem}>
                      <Ionicons name="briefcase-outline" size={13} color="#64748b" />
                      <Text style={styles.repText}>{item.representativePosition}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.cardFooter}>
                {isPending ? (
                  <>
                    <TouchableOpacity
                      style={styles.actionReject}
                      onPress={() => handleReject(item.id)}
                      disabled={isProcessingThis}
                    >
                      <Ionicons name="close-circle" size={15} color="#f87171" />
                      <Text style={styles.actionRejectText}>{language === 'vi' ? 'Từ chối' : 'Reject'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionApprove, isProcessingThis && styles.actionDisabled]}
                      onPress={() => handleApprove(item.id)}
                      disabled={isProcessingThis}
                    >
                      {isProcessingThis ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={15} color="#fff" />
                          <Text style={styles.actionApproveText}>{language === 'vi' ? 'Duyệt' : 'Approve'}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.viewDetailRow}>
                    <Text style={styles.viewDetailText}>{language === 'vi' ? 'Xem chi tiết' : 'View details'}</Text>
                    <Ionicons name="chevron-forward" size={15} color="#10b981" />
                  </View>
                )}
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
            <Text style={styles.modalHeaderTitle}>{language === 'vi' ? 'Chi tiết tổ chức' : 'Organization Details'}</Text>
            <TouchableOpacity onPress={() => setDetailModalOpen(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={22} color="#f1f5f9" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            {selectedTenant && (
              <>
                {/* Status Banner */}
                <View style={styles.statusBanner}>
                  {(() => {
                    const info = getStatusInfo(selectedTenant.status);
                    return (
                      <View style={[styles.statusBannerInner, { backgroundColor: info.bg }]}>
                        <Ionicons name={info.icon as any} size={22} color={info.color} />
                        <Text style={[styles.statusBannerText, { color: info.color }]}>
                          {language === 'vi' ? info.labelVi : info.labelEn}
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Company Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="business" size={15} color="#10b981" /> {language === 'vi' ? 'Thông tin công ty' : 'Company Information'}
                  </Text>
                  <View style={styles.infoCard}>
                    <InfoRow label={language === 'vi' ? 'Tên công ty' : 'Company Name'} value={selectedTenant.name} />
                    <InfoRow label={language === 'vi' ? 'Email liên hệ' : 'Contact Email'} value={selectedTenant.contactEmail} />
                    {selectedTenant.address && <InfoRow label={language === 'vi' ? 'Địa chỉ' : 'Address'} value={selectedTenant.address} />}
                    {selectedTenant.website && <InfoRow label={language === 'vi' ? 'Website' : 'Website'} value={selectedTenant.website} isLink />}
                    {selectedTenant.companySize && <InfoRow label={language === 'vi' ? 'Quy mô' : 'Company Size'} value={selectedTenant.companySize} />}
                  </View>
                </View>

                {/* Representative Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="person" size={15} color="#10b981" /> {language === 'vi' ? 'Người đại diện' : 'Representative'}
                  </Text>
                  <View style={styles.infoCard}>
                    {selectedTenant.representativeName && <InfoRow label={language === 'vi' ? 'Họ tên' : 'Full Name'} value={selectedTenant.representativeName} />}
                    {selectedTenant.representativePosition && <InfoRow label={language === 'vi' ? 'Chức vụ' : 'Position'} value={selectedTenant.representativePosition} />}
                    {selectedTenant.representativePhone && <InfoRow label={language === 'vi' ? 'Điện thoại' : 'Phone'} value={selectedTenant.representativePhone} />}
                  </View>
                </View>

                {/* Request Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="document-text" size={15} color="#10b981" /> {language === 'vi' ? 'Yêu cầu đăng ký' : 'Registration Request'}
                  </Text>
                  <View style={styles.infoCard}>
                    <InfoRow label={language === 'vi' ? 'Ngày đăng ký' : 'Request Date'} value={formatDate(selectedTenant.requestedAt)} />
                    {selectedTenant.requestMessage && (
                      <View style={styles.messageBox}>
                        <Text style={styles.messageLabel}>{language === 'vi' ? 'Lời nhắn' : 'Message'}</Text>
                        <Text style={styles.messageText}>"{selectedTenant.requestMessage}"</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Review Info */}
                {(selectedTenant.reviewedAt || selectedTenant.rejectionReason) && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      <Ionicons name="shield-checkmark" size={15} color="#10b981" /> {language === 'vi' ? 'Thông tin duyệt' : 'Review Information'}
                    </Text>
                    <View style={styles.infoCard}>
                      {selectedTenant.reviewedAt && <InfoRow label={language === 'vi' ? 'Ngày duyệt' : 'Reviewed At'} value={formatDate(selectedTenant.reviewedAt)} />}
                      {selectedTenant.rejectionReason && (
                        <View style={styles.messageBox}>
                          <Text style={styles.messageLabel}>{language === 'vi' ? 'Lý do từ chối' : 'Rejection Reason'}</Text>
                          <Text style={styles.messageText}>{selectedTenant.rejectionReason}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Modal Actions */}
          {selectedTenant?.status === 'PENDING' && (
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.actionRejectLarge}
                onPress={() => handleReject(selectedTenant.id, true)}
                disabled={processing === selectedTenant.id}
              >
                <Ionicons name="close-circle" size={20} color="#f87171" />
                <Text style={styles.actionRejectLargeText}>{language === 'vi' ? 'Từ chối' : 'Reject'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionApproveLarge, processing === selectedTenant.id && styles.actionDisabled]}
                onPress={() => handleApprove(selectedTenant.id, true)}
                disabled={processing === selectedTenant.id}
              >
                {processing === selectedTenant.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.actionApproveLargeText}>{language === 'vi' ? 'Duyệt tổ chức' : 'Approve'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </AppShell>
  );
}

function InfoRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, isLink && infoStyles.link]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.1)' },
  label: { fontSize: 13, color: '#64748b', flex: 1 },
  value: { fontSize: 13, color: '#f1f5f9', fontWeight: '500', textAlign: 'right', flex: 1 },
  link: { color: '#3b82f6' },
});

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#94a3b8', fontSize: 15 },
  
  // Summary
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16 },
  summaryIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
  summaryLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  
  // List
  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  
  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.2)' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#f1f5f9', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  
  // Card
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitleGroup: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#f1f5f9', letterSpacing: 0.2 },
  cardEmail: { fontSize: 12, color: '#64748b', marginTop: 3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  
  // Representative
  repRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  repItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  repSep: { color: '#64748b', fontSize: 12 },
  repText: { fontSize: 12, color: '#94a3b8' },
  
  // Card Footer
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  actionReject: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(248, 113, 113, 0.12)' },
  actionRejectText: { fontSize: 13, color: '#f87171', fontWeight: '600' },
  actionApprove: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, backgroundColor: '#10b981' },
  actionApproveText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  actionDisabled: { opacity: 0.6 },
  viewDetailRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  viewDetailText: { fontSize: 13, color: '#10b981', fontWeight: '500' },
  
  // Modal
  modalWrap: { flex: 1, backgroundColor: '#0f172a' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', letterSpacing: 0.3 },
  modalCloseBtn: { padding: 4 },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 16, paddingBottom: 32 },
  
  statusBanner: { marginBottom: 16 },
  statusBannerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  statusBannerText: { fontSize: 15, fontWeight: '700' },
  
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#10b981', marginBottom: 10, letterSpacing: 0.3 },
  infoCard: { backgroundColor: '#1e293b', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#334155' },
  messageBox: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(148, 163, 184, 0.1)' },
  messageLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  messageText: { fontSize: 13, color: '#f1f5f9', fontStyle: 'italic', lineHeight: 20 },
  
  // Modal Actions
  modalActions: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b' },
  actionRejectLarge: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(248, 113, 113, 0.12)', borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.2)' },
  actionRejectLargeText: { fontSize: 14, color: '#f87171', fontWeight: '600' },
  actionApproveLarge: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#10b981' },
  actionApproveLargeText: { fontSize: 14, color: '#fff', fontWeight: '600' },
});
