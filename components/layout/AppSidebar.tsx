import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { clearAuth } from '../../lib/auth-store';
import { requestNewChat } from '../../lib/navigation-store';
import { useLanguageStore, translations } from '../../lib/language-store';

type NavItem = {
  href: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/chatbot', labelKey: 'chat', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { href: '/history', labelKey: 'history', icon: 'time-outline', iconActive: 'time' },
  { href: '/documents', labelKey: 'documents', icon: 'document-text-outline', iconActive: 'document-text' },
  { href: '/analytics', labelKey: 'analytics', icon: 'analytics-outline', iconActive: 'analytics' },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { language } = useLanguageStore();
  const t = translations[language];

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

  return (
    <View style={styles.sidebar}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoWrap}>
            <Ionicons name="sparkles" size={22} color="#10b981" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.appTitle}>{t.appTitle}</Text>
            <Text style={styles.appSubtitle}>{t.appSubtitle}</Text>
          </View>
        </View>
      </View>

      {/* Navigation */}
      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        {/* New Chat Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleNewChat}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.actionText}>{t.newChat}</Text>
        </TouchableOpacity>

        {/* Main Nav */}
        <View style={styles.navList}>
          {NAV_ITEMS.map(item => {
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
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {t[item.labelKey as keyof typeof t] || item.labelKey}
                </Text>
                {active && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
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
  navScroll: {
    flex: 1,
    minHeight: 0,
  },
  navContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
});
