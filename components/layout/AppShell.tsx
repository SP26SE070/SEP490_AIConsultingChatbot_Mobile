import { useState, useEffect, useRef, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, LAYOUT } from '../../lib/theme';
import { AppSidebar } from './AppSidebar';
import { HeaderDropdown } from '../HeaderDropdown';
import { useResponsive } from '../../lib/useResponsive';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerRight?: ReactNode;
}

function getAdaptiveSidebarWidth(width: number): number {
  if (width < 400) return Math.round(width * 0.8);
  if (width < 600) return Math.round(width * 0.75);
  return LAYOUT.sidebarWidth;
}

export function AppShell({ title, subtitle, children, headerRight }: AppShellProps) {
  const { width, sz, fs } = useResponsive();
  const isTablet = width >= LAYOUT.tabletBreakpoint;
  const sidebarWidth = getAdaptiveSidebarWidth(width);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  useEffect(() => {
    if (isTablet) {
      setDrawerOpen(false);
      return;
    }
    Animated.timing(slideAnim, {
      toValue: drawerOpen ? 0 : -sidebarWidth,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [drawerOpen, isTablet, slideAnim, sidebarWidth]);

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function openDrawer() {
    setDrawerOpen(true);
  }

  const topBarPadH = width < 375 ? sz(12) : width < 414 ? sz(14) : sz(16);
  const topBarPadV = width < 375 ? sz(10) : sz(12);
  const menuBtnSz = width < 375 ? sz(36) : sz(42);
  const titleFS = width < 375 ? fs(17) : width >= 600 ? fs(22) : fs(20);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'right', 'bottom']}>
      <View style={styles.row}>
        {isTablet && (
          <View style={[styles.sidebarContainer, { width: sidebarWidth }]}>
            <SafeAreaView style={styles.sidebarSafe} edges={['top', 'bottom', 'left']}>
              <View style={styles.sidebarInner}>
                <AppSidebar onNavigate={closeDrawer} sidebarWidth={sidebarWidth} />
              </View>
            </SafeAreaView>
          </View>
        )}

        {!isTablet && drawerOpen && (
          <Pressable style={styles.overlay} onPress={closeDrawer} />
        )}

        {!isTablet && (
          <Animated.View
            style={[
              styles.drawer,
              { width: sidebarWidth, transform: [{ translateX: slideAnim }] },
            ]}
          >
            <SafeAreaView style={styles.sidebarSafe} edges={['top', 'bottom', 'left']}>
              <View style={styles.sidebarInner}>
                <AppSidebar onNavigate={closeDrawer} sidebarWidth={sidebarWidth} />
              </View>
            </SafeAreaView>
          </Animated.View>
        )}

        <View style={styles.main}>
          <View style={[styles.topBar, { paddingHorizontal: topBarPadH, paddingVertical: topBarPadV }]}>
            <View style={styles.topBarLeft}>
              {!isTablet && (
                <TouchableOpacity
                  style={[styles.menuBtn, { width: menuBtnSz, height: menuBtnSz }]}
                  onPress={openDrawer}
                  activeOpacity={0.8}
                >
                  <Ionicons name="menu" size={20} color="#f1f5f9" />
                </TouchableOpacity>
              )}
              <View style={styles.titleBlock}>
                <Text style={[styles.pageTitle, { fontSize: titleFS }]} numberOfLines={1}>{title}</Text>
                {subtitle ? (
                  <Text style={styles.pageSubtitle} numberOfLines={1}>{subtitle}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.headerActions}>
              {headerRight && <View style={{ marginRight: 8 }}>{headerRight}</View>}
              <HeaderDropdown />
            </View>
          </View>

          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarContainer: {
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: COLORS.surface,
  },
  sidebarSafe: {
    flex: 1,
  },
  sidebarInner: {
    flex: 1,
    backgroundColor: '#151f32',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 99,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
    backgroundColor: COLORS.bg,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  menuBtn: {
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontWeight: '700',
    color: COLORS.text,
  },
  pageSubtitle: {
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    marginLeft: 4,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
