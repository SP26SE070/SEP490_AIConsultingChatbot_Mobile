import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, LAYOUT } from '../../lib/theme';
import { AppSidebar } from './AppSidebar';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  headerRight?: ReactNode;
}

export function AppShell({ title, subtitle, children, headerRight }: AppShellProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= LAYOUT.tabletBreakpoint;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-LAYOUT.sidebarWidth)).current;

  useEffect(() => {
    if (isTablet) {
      setDrawerOpen(false);
      return;
    }
    Animated.timing(slideAnim, {
      toValue: drawerOpen ? 0 : -LAYOUT.sidebarWidth,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [drawerOpen, isTablet, slideAnim]);

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function openDrawer() {
    setDrawerOpen(true);
  }

  const sidebar = (
    <View style={[styles.sidebarContainer, { width: LAYOUT.sidebarWidth }]}>
      <SafeAreaView style={styles.sidebarSafe} edges={['top', 'bottom', 'left']}>
        <View style={styles.sidebarInner}>
          <AppSidebar onNavigate={closeDrawer} />
        </View>
      </SafeAreaView>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'right', 'bottom']}>
      <View style={styles.row}>
        {isTablet && sidebar}

        {!isTablet && drawerOpen && (
          <Pressable style={styles.overlay} onPress={closeDrawer} />
        )}

        {!isTablet && (
          <Animated.View
            style={[
              styles.drawer,
              { width: LAYOUT.sidebarWidth, transform: [{ translateX: slideAnim }] },
            ]}
          >
            <SafeAreaView style={styles.sidebarSafe} edges={['top', 'bottom', 'left']}>
              <View style={styles.sidebarInner}>
                <AppSidebar onNavigate={closeDrawer} />
              </View>
            </SafeAreaView>
          </Animated.View>
        )}

        <View style={styles.main}>
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              {!isTablet && (
                <TouchableOpacity
                  style={styles.menuBtn}
                  onPress={openDrawer}
                  activeOpacity={0.8}
                >
                  <Ionicons name="menu" size={24} color={COLORS.text} />
                </TouchableOpacity>
              )}
              <View style={styles.titleBlock}>
                <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>
                {subtitle ? (
                  <Text style={styles.pageSubtitle} numberOfLines={1}>{subtitle}</Text>
                ) : null}
              </View>
            </View>
            {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
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
  },
  sidebarSafe: {
    flex: 1,
  },
  sidebarInner: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerRight: {
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
});
