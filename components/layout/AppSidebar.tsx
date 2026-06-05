import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { clearAuth, isRole, getUser } from '../../lib/auth-store';
import { clearChatSession } from '../../lib/chat-session-store';
import { requestNewChat } from '../../lib/navigation-store';
import { useLanguageStore, translations } from '../../lib/language-store';
import { AppLogo } from '../brand/AppLogo';

type NavItem = {
  href: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

// Employee navigation items
const EMPLOYEE_NAV: NavItem[] = [
  { href: '/chatbot', labelKey: 'chat', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { href: '/history', labelKey: 'history', icon: 'time-outline', iconActive: 'time' },
  { href: '/documents', labelKey: 'documents', icon: 'document-text-outline', iconActive: 'document-text' },
  { href: '/analytics', labelKey: 'analytics', icon: 'analytics-outline', iconActive: 'analytics' },
];

// Staff navigation items - only approve tenants + chatbot
const STAFF_NAV: NavItem[] = [
  { href: '/staff/organizations', labelKey: 'approveTenant', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
  { href: '/chatbot', labelKey: 'chat', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
];

// Admin navigation items - manage employees
const ADMIN_NAV: NavItem[] = [
  { href: '/chatbot', labelKey: 'chat', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { href: '/history', labelKey: 'history', icon: 'time-outline', iconActive: 'time' },
  { href: '/documents', labelKey: 'documents', icon: 'document-text-outline', iconActive: 'document-text' },
  { href: '/analytics', labelKey: 'analytics', icon: 'analytics-outline', iconActive: 'analytics' },
  { href: '/admin/employees', labelKey: 'manageEmployees', icon: 'people-outline', iconActive: 'people' },
  { href: '/admin/organization-settings', labelKey: 'organizationSettings', icon: 'business-outline', iconActive: 'business' },
  { href: '/admin/ai-settings', labelKey: 'aiSettings', icon: 'bulb-outline', iconActive: 'bulb' },
  { href: '/admin/subscription', labelKey: 'subscription', icon: 'card-outline', iconActive: 'card' },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { language } = useLanguageStore();
  const t = translations[language];
  
  const [userRole, setUserRole] = useState<'admin' | 'staff' | 'employee'>('employee');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const isAdmin = await isRole('ROLE_TENANT_ADMIN');
      const isStaff = await isRole('ROLE_STAFF');
      
      if (isAdmin) {
        setUserRole('admin');
      } else if (isStaff) {
        setUserRole('staff');
      } else {
        setUserRole('employee');
      }
      setIsLoading(false);
    })();
  }, []);

  function navigate(href: string) {
    router.push(href as any);
    onNavigate?.();
  }

  function handleNewChat() {
    requestNewChat();
    router.push('/chatbot');
    onNavigate?.();
  }

  async function handleLogout() {
    try {
      const user = await getUser();
      if (user?.id) {
        await clearChatSession(user.id);
      }
    } catch {
      // ignore
    }
    await clearAuth();
    onNavigate?.();
    router.replace('/login');
  }

  function isActive(href: string) {
    if (href === '/chatbot') {
      return pathname === '/chatbot' || pathname === '/';
    }
    return pathname === href || pathname.startsWith(href + '/');
  }

  // Get navigation items based on role
  function getNavItems(): NavItem[] {
    switch (userRole) {
      case 'admin':
        return ADMIN_NAV;
      case 'staff':
        return []; // Staff uses simple layout, not nav list
      default:
        return EMPLOYEE_NAV;
    }
  }

  // Get role badge info
  function getRoleBadge() {
    switch (userRole) {
      case 'admin':
        return { text: t.admin, icon: 'shield-checkmark', color: '#10b981' };
      case 'staff':
        return { text: t.staff, icon: 'briefcase', color: '#3b82f6' };
      default:
        return { text: t.employee, icon: 'person', color: '#8b5cf6' };
    }
  }

  const badge = getRoleBadge();
  const navItems = getNavItems();

  if (isLoading) {
    return (
      <View style={styles.sidebar}>
        <View style={styles.loading}>
          <Ionicons name="sync-outline" size={24} color="#64748b" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sidebar}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoWrap}>
            <AppLogo size={36} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.appTitle}>{t.appTitle}</Text>
            <Text style={styles.appSubtitle}>{t.appSubtitle}</Text>
          </View>
        </View>
        
        {/* Role Badge */}
        <View style={[styles.roleBadge, { backgroundColor: badge.color + '20' }]}>
          <Ionicons name={badge.icon as any} size={12} color={badge.color} />
          <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.text}</Text>
        </View>
      </View>

      {/* Navigation */}
      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Staff simple layout */}
        {userRole === 'staff' ? (
          <View style={styles.staffLayout}>
            <TouchableOpacity
              style={[styles.staffCard, isActive('/staff/organizations') && styles.staffCardActive]}
              onPress={() => navigate('/staff/organizations')}
              activeOpacity={0.8}
            >
              <View style={styles.staffCardHeader}>
                <View style={[styles.staffIcon, { backgroundColor: isActive('/staff/organizations') ? '#10b981' : 'rgba(16, 185, 129, 0.2)' }]}>
                  <Ionicons 
                    name={isActive('/staff/organizations') ? "checkmark-circle" : "checkmark-circle-outline"} 
                    size={22} 
                    color={isActive('/staff/organizations') ? '#fff' : '#10b981'} 
                  />
                </View>
                <View style={styles.staffCardContent}>
                  <Text style={[styles.staffLabel, isActive('/staff/organizations') && styles.staffLabelActive]}>
                    {t.approveTenant}
                  </Text>
                  <Text style={styles.staffDesc}>
                    {language === 'vi' ? 'Xem & duyệt tổ chức mới' : 'View & approve new tenants'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.staffCard, isActive('/chatbot') && styles.staffCardActive]}
              onPress={() => navigate('/chatbot')}
              activeOpacity={0.8}
            >
              <View style={styles.staffCardHeader}>
                <View style={[styles.staffIcon, { backgroundColor: isActive('/chatbot') ? '#10b981' : 'rgba(16, 185, 129, 0.2)' }]}>
                  <Ionicons 
                    name={isActive('/chatbot') ? "chatbubbles" : "chatbubbles-outline"} 
                    size={22} 
                    color={isActive('/chatbot') ? '#fff' : '#10b981'} 
                  />
                </View>
                <View style={styles.staffCardContent}>
                  <Text style={[styles.staffLabel, isActive('/chatbot') && styles.staffLabelActive]}>
                    {t.chat}
                  </Text>
                  <Text style={styles.staffDesc}>
                    {language === 'vi' ? 'Trò chuyện với AI Assistant' : 'Chat with AI Assistant'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* New Chat Button - Only for employee */}
            {userRole === 'employee' && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleNewChat}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={styles.actionText}>{t.newChat}</Text>
              </TouchableOpacity>
            )}

            {/* Divider for admin */}
            {userRole === 'admin' && (
              <Text style={styles.sectionLabel}>
                <Ionicons name="grid-outline" size={12} color="#64748b" /> {t.analytics}
              </Text>
            )}

            {/* Main Nav */}
            <View style={styles.navList}>
              {navItems.map(item => {
                const active = isActive(item.href);
                return (
                  <TouchableOpacity
                    key={item.href}
                    style={[styles.navItem, active && styles.navItemActive]}
                    onPress={() => navigate(item.href)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.navIconWrap, active && styles.navIconActive]}>
                      <Ionicons
                        name={active ? item.iconActive : item.icon}
                        size={20}
                        color={active ? '#10b981' : '#64748b'}
                      />
                    </View>
                    <Text style={[styles.navLabel, active && styles.navLabelActive, item.labelKey === 'subscription' && styles.navLabelUppercase]}>
                      {t[item.labelKey as keyof typeof t] || item.labelKey}
                    </Text>
                    {active && <View style={styles.activeIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer - Logout only */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <View style={styles.logoutIcon}>
            <Ionicons name="log-out-outline" size={18} color="#f87171" />
          </View>
          <Text style={styles.logoutText}>{t.logout}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  headerText: {
    flex: 1,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  appSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  navScroll: {
    flex: 1,
    minHeight: 0,
  },
  navContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  navList: {
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#94a3b8',
    flex: 1,
  },
  navLabelActive: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
  navLabelUppercase: {
    letterSpacing: 0.5,
    fontSize: 13,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    bottom: '25%',
    width: 4,
    borderRadius: 2,
    backgroundColor: '#10b981',
  },
  footer: {
    padding: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f87171',
  },
  // Staff layout styles
  staffLayout: {
    gap: 16,
  },
  staffCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  staffCardActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  staffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  staffIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffCardContent: {
    flex: 1,
    gap: 4,
  },
  staffLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  staffLabelActive: {
    color: '#10b981',
  },
  staffDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
});
