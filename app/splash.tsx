import { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getAccessToken } from '../lib/auth-store';
import { useLanguageStore, translations } from '../lib/language-store';
import { AppLogo } from '../components/brand/AppLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const t = translations[language];

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
      <View style={styles.decorTopLeft} />
      <View style={styles.decorBottomRight} />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <AppLogo size={100} />
        </View>

        {/* Title */}
        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={styles.title}>AI Chatbot</Text>
          <Text style={styles.subtitle}>For Tenants</Text>
        </Animated.View>
      </Animated.View>

      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressContainer,
          { opacity: progressOpacity },
        ]}
      >
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>
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
  decorTopLeft: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  decorBottomRight: {
    position: 'absolute',
    bottom: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoWrapper: {
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 16,
    fontWeight: '500',
  },
});
