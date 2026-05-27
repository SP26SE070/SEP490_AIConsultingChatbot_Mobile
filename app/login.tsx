import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
  Animated, Dimensions, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { login } from '../lib/api/auth';
import { setAuth } from '../lib/auth-store';
import { useLanguageStore, translations } from '../lib/language-store';
import { AppLogo } from '../components/brand/AppLogo';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { language } = useLanguageStore();
  const t = translations[language];

  // Animation values
  const contentOpacity = useState(new Animated.Value(0))[0];
  const contentTranslateY = useState(new Animated.Value(30))[0];
  const formOpacity = useState(new Animated.Value(0))[0];
  const formTranslateY = useState(new Animated.Value(50))[0];

  useEffect(() => {
    // Animate content
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animate form after content
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t.error, language === 'vi' ? 'Vui lòng nhập đầy đủ thông tin' : 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      await setAuth(data);

      const roles: string[] = data.roles ?? [];
      if (roles.includes('ROLE_STAFF')) {
        router.replace('/staff');
      } else {
        router.replace('/chatbot');
      }
    } catch (e: any) {
      Alert.alert(
        t.error,
        e.message || (language === 'vi' ? 'Vui lòng kiểm tra lại email và mật khẩu.' : 'Please check your email and password.')
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={['#0f172a', '#134e4a', '#0f172a']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={styles.decorTopLeft} />
      <View style={styles.decorBottomRight} />
      <View style={styles.decorSmall} />

      {/* Top Section - Branding & Quote */}
      <Animated.View
        style={[
          styles.topSection,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <AppLogo size={80} />
          <Text style={styles.brandTitle}>AI Chatbot</Text>
          <Text style={styles.brandSubtitle}>For Tenants</Text>
        </View>

        {/* Quote */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quoteText}>
            {language === 'vi'
              ? '"Đối tác thông minh cho chính sách nội bộ, HR và kiến thức công ty—được cung cấp bởi AI."'
              : '"Your intelligent partner for internal policies, HR guidance, and company knowledge—powered by AI."'
            }
          </Text>
          <Text style={styles.quoteAuthor}>
            {language === 'vi' ? 'Nền tảng Tư vấn Nội bộ' : 'Internal Consultant Platform'}
          </Text>
        </View>
      </Animated.View>

      {/* Bottom Section - Login Form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomContainer}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[
            styles.formSection,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          <Text style={styles.formTitle}>
            {language === 'vi' ? 'Chào mừng trở lại!' : 'Welcome back!'}
          </Text>
          <Text style={styles.formSubtitle}>
            {language === 'vi' ? 'Đăng nhập để tiếp tục' : 'Sign in to continue'}
          </Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={language === 'vi' ? 'Email' : 'Email'}
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={language === 'vi' ? 'Mật khẩu' : 'Password'}
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>{t.forgotPassword}</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>{t.loginButton}</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
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
    top: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  decorBottomRight: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.4,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(5, 150, 105, 0.06)',
  },
  decorSmall: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    right: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  topSection: {
    paddingTop: 80,
    paddingHorizontal: 32,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '500',
  },
  quoteContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  quoteText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  quoteAuthor: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  bottomContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  formSection: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#f1f5f9',
  },
  eyeBtn: {
    padding: 14,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '500',
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
