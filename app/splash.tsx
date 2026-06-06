import { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getAccessToken, refreshUser } from '../lib/auth-store';
import { useLanguageStore, translations } from '../lib/language-store';
import { AppLogo } from '../components/brand/AppLogo';
import { useResponsive } from '../lib/useResponsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const t = translations[language];
  const { sz, fs } = useResponsive();

  // Responsive dimensions
  const logoSize = sz(100);
  const decorSize1 = sz(300);
  const decorRadius1 = sz(150);
  const decorTop = -sz(100);
  const decorLeft = -sz(100);
  const decorSize2 = sz(400);
  const decorRadius2 = sz(200);
  const decorBottom = -sz(150);
  const decorRight = -sz(100);
  const contentPaddingH = sz(32);
  const logoMarginB = sz(24);
  const titleSize = fs(36);
  const subtitleSize = fs(16);
  const subtitleMarginT = sz(8);
  const progressBottom = sz(100);
  const progressPaddingH = sz(40);
  const progressTrackH = sz(4);
  const progressTrackRadius = sz(2);
  const loadingTextSize = fs(13);
  const loadingTextMarginT = sz(16);

  // Animation values
  const logoOpacity = new Animated.Value(0);
  const logoScale = new Animated.Value(0.5);
  const textOpacity = new Animated.Value(0);
  const progressOpacity = new Animated.Value(0);
  const progressWidth = new Animated.Value(0);

  useEffect(() => {
    // Start animations
    Animated.sequence([
      // Logo fade in + scale
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Text fade in
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Progress bar animation
        Animated.parallel([
          Animated.timing(progressOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(progressWidth, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false, // width animation
          }),
        ]).start(() => {
          // Check auth and navigate
          setTimeout(async () => {
            const token = await getAccessToken();
            if (token) {
              // CRITICAL: Refresh permissions from BE so employee gets latest from admin
              await refreshUser();
              router.replace('/chatbot');
            } else {
              router.replace('/login');
            }
          }, 300);
        });
      });
    });
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#134e4a', '#0f172a']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={[styles.decorTopLeft, { top: decorTop, left: decorLeft, width: decorSize1, height: decorSize1, borderRadius: decorRadius1 }]} />
      <View style={[styles.decorBottomRight, { bottom: decorBottom, right: decorRight, width: decorSize2, height: decorSize2, borderRadius: decorRadius2 }]} />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          { paddingHorizontal: contentPaddingH },
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        {/* Logo */}
        <View style={[styles.logoWrapper, { marginBottom: logoMarginB }]}>
          <AppLogo size={logoSize} />
        </View>

        {/* Title */}
        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={[styles.title, { fontSize: titleSize }]}>AI Chatbot</Text>
          <Text style={[styles.subtitle, { fontSize: subtitleSize, marginTop: subtitleMarginT }]}>For Tenants</Text>
        </Animated.View>
      </Animated.View>

      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressContainer,
          { opacity: progressOpacity, bottom: progressBottom, paddingHorizontal: progressPaddingH },
        ]}
      >
        <View style={[styles.progressTrack, { height: progressTrackH, borderRadius: progressTrackRadius }]}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                borderRadius: progressTrackRadius,
              },
            ]}
          />
        </View>
        <Text style={[styles.loadingText, { fontSize: loadingTextSize, marginTop: loadingTextMarginT }]}>
          {language === 'vi' ? 'Đang khởi động...' : 'Starting...'}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorTopLeft: { position: 'absolute', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  decorBottomRight: { position: 'absolute', backgroundColor: 'rgba(5, 150, 105, 0.08)' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoWrapper: {},
  title: { fontWeight: '700', color: '#fff', textAlign: 'center', letterSpacing: 1 },
  subtitle: { color: '#94a3b8', textAlign: 'center', fontWeight: '500' },
  progressContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  progressTrack: { width: '100%', backgroundColor: 'rgba(148, 163, 184, 0.2)', overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#10b981' },
  loadingText: { color: '#94a3b8', fontWeight: '500' },
});
