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
import { LanguageDropdown } from '../LanguageDropdown';

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
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [drawerOpen, isTablet, slideAnim]);

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function openDrawer() {
    setDrawerOpen(true);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'right', 'bottom']}>
      <View style={styles.row}>
        {isTablet && (
          <View style={styles.sidebarContainer}>
            <SafeAreaView style={styles.sidebarSafe} edges={['top', 'bottom', 'left']}>
              <View style={styles.sidebarInner}>
                <AppSidebar onNavigate={closeDrawer} />
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
                  <Ionicons name="menu" size={22} color="#f1f5f9" />
                </TouchableOpacity>
              )}
              <View style={styles.titleBlock}>
                <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>
                {subtitle ? (
                  <Text style={styles.pageSubtitle} numberOfLines={1}>{subtitle}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.headerActions}>
              <LanguageDropdown />
              {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
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
    backgroundColor: '#0f172a',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarContainer: {
    width: LAYOUT.sidebarWidth,
    flexShrink: 0,
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
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
    backgroundColor: '#0f172a',
  },
});
