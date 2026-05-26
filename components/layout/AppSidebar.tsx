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
import { COLORS } from '../../lib/theme';
import { clearAuth, getUser, isRole } from '../../lib/auth-store';
import { requestNewChat } from '../../lib/navigation-store';
import { LanguageToggle } from '../LanguageToggle';
import { useLanguageStore, translations } from '../../lib/language-store';

type NavRoute = {
  href: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const EMPLOYEE_ROUTES: NavRoute[] = [
  { href: '/chatbot', labelKey: 'chat', icon: 'chatbubbles-outline' },
  { href: '/history', labelKey: 'history', icon: 'time-outline' },
  { href: '/documents', labelKey: 'documents', icon: 'document-text-outline' },
  { href: '/analytics', labelKey: 'analytics', icon: 'analytics-outline' },
  { href: '/profile', labelKey: 'profile', icon: 'person-outline' },
];

const STAFF_ROUTES: NavRoute[] = [
  { href: '/staff', labelKey: 'manageEmployees', icon: 'business-outline' },
  { href: '/analytics', labelKey: 'analytics', icon: 'analytics-outline' },
  { href: '/profile', labelKey: 'profile', icon: 'person-outline' },
];

const ADMIN_ROUTES: NavRoute[] = [
  { href: '/analytics', labelKey: 'analytics', icon: 'analytics-outline' },
  { href: '/staff', labelKey: 'manageEmployees', icon: 'people-outline' },
  { href: '/documents', labelKey: 'documents', icon: 'document-text-outline' },
  { href: '/profile', labelKey: 'profile', icon: 'person-outline' },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const [userName, setUserName] = useState('Người dùng');
  const [userEmail, setUserEmail] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { language } = useLanguageStore();
  const t = translations[language];

  useEffect(() => {
    (async () => {
      const user = await getUser();
      if (user?.email) setUserEmail(user.email);
      setUserName(user?.email?.split('@')[0] ?? 'User');
      setIsStaff(await isRole('ROLE_STAFF'));
      setIsAdmin(await isRole('ROLE_TENANT_ADMIN'));
    })();
  }, []);

  const routes = isAdmin ? ADMIN_ROUTES : (isStaff ? STAFF_ROUTES : EMPLOYEE_ROUTES);

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

  function getRoleBadge() {
    if (isAdmin) return { text: t.admin, icon: 'shield-checkmark', color: COLORS.accent };
    if (isStaff) return { text: t.staff, icon: 'briefcase', color: '#3b82f6' };
    return { text: t.employee, icon: 'person', color: '#8b5cf6' };
  }

  const badge = getRoleBadge();

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.brandIcon}>
          <Ionicons name="sparkles" size={22} color={COLORS.accent} />
        </View>
        <View style={styles.brandText}>
          <Text style={styles.brandTitle}>{t.appTitle}</Text>
          <Text style={styles.brandSubtitle}>{t.appSubtitle}</Text>
        </View>
      </View>

      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {userName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
          <Text style={styles.userEmail} numberOfLines={1}>{userEmail || '—'}</Text>
        </View>
      </View>

      <View style={styles.roleBadgeContainer}>
        <Ionicons name={badge.icon as any} size={14} color={badge.color} />
        <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.text}</Text>
      </View>

      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        {!isStaff && !isAdmin && (
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={handleNewChat}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.newChatText}>{t.newChat}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>{language === 'vi' ? 'MENU' : 'MENU'}</Text>
        {routes.map(route => {
          const active = isActive(route.href);
          return (
            <TouchableOpacity
              key={route.href}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => navigate(route.href)}
              activeOpacity={0.75}
            >
              <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
                <Ionicons
                  name={route.icon}
                  size={20}
                  color={active ? COLORS.accent : COLORS.textMuted}
                />
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {t[route.labelKey as keyof typeof t] || route.labelKey}
              </Text>
              {active && <View style={styles.activeBar} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View style={styles.languageSection}>
            <Ionicons name="globe-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.languageLabel}>Language</Text>
          </View>
          <LanguageToggle />
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>{t.logout}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    minHeight: 0,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  brandText: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  brandSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  navScroll: {
    flex: 1,
    minHeight: 0,
  },
  navContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 20,
    marginHorizontal: 4,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  newChatText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDim,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: COLORS.accentSoft,
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  navLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  navLabelActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 3,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  languageSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  languageLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.danger,
  },
});
