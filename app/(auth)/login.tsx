import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
  Animated, StatusBar, useWindowDimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { login } from '../../lib/api/auth';
import { setAuth, refreshUser } from '../../lib/auth-store';
import { useLanguageStore, translations } from '../../lib/language-store';
import { AppLogo } from '../../components/brand/AppLogo';
import { ErrorModal } from '../../components/ui/CustomModal';
import { useResponsive } from '../../lib/useResponsive';

const COLORS_BG = '#0f172a';
const COLORS_SURFACE = '#1e293b';
const COLORS_BORDER = '#334155';
const COLORS_TEXT = '#f1f5f9';
const COLORS_TEXT_MUTED = '#94a3b8';
const COLORS_ACCENT = '#10b981';
const COLORS_ACCENT_DARK = '#059669';

export default function LoginScreen() {
  const { width, height } = useWindowDimensions();
  const { gap, sz, fs } = useResponsive();

  const decorWidth = sz(200);
  const decorHeight = sz(200);
  const decorBorderRadius = sz(100);

  const decorTopOffset = sz(48);
  const decorRightOffset = sz(-80);
  const topSectionPaddingTop = sz(60);
  const topSectionMinHeight = sz(380);
  const formBorderRadius = sz(32);
  const formPadding = sz(28);
  const brandTitleSize = fs(30);
  const quoteFontSize = fs(14);
  const inputBorderRadius = sz(14);
  const inputPadding = sz(14);
  const buttonBorderRadius = sz(14);
  const buttonPadding = sz(16);
  const formTitleSize = fs(24);
  const formSubtitleMarginBottom = sz(24);

  const contentOpacity = useState(new Animated.Value(0))[0];
  const contentTranslateY = useState(new Animated.Value(30))[0];
  const formOpacity = useState(new Animated.Value(0))[0];
  const formTranslateY = useState(new Animated.Value(50))[0];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { language } = useLanguageStore();
  const isVi = language === 'vi';
  const t = translations[language];

  useEffect(() => {
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
      setErrorMessage(isVi ? 'Vui lòng nhập đầy đủ thông tin.' : 'Please fill in all fields.');
      setShowErrorModal(true);
      return;
    }
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      await setAuth(data);
      // Refresh permissions from BE so employee gets latest from admin
      await refreshUser();

      const roles: string[] = data.roles ?? [];

      if (data.mustChangePassword) {
        router.replace('/change-password');
        return;
      }

      if (roles.includes('ROLE_STAFF')) {
        router.replace('/staff');
      } else {
        router.replace('/chatbot');
      }
    } catch (e: any) {
      setErrorMessage(e.message || (isVi ? 'Vui lòng kiểm tra lại email và mật khẩu.' : 'Please check your email and password.'));
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS_BG} />

      <LinearGradient
        colors={[COLORS_BG, '#134e4a', COLORS_BG]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[styles.decorTopLeft, { top: decorTopOffset, left: decorTopOffset, width: decorWidth, height: decorHeight, borderRadius: decorBorderRadius }]} />
      <View style={[styles.decorBottomRight, { top: height * 0.4, right: decorRightOffset, width: decorWidth + sz(50), height: decorWidth + sz(50), borderRadius: decorBorderRadius + sz(25) }]} />
      <View style={[styles.decorSmall, { top: height * 0.3, right: sz(-40), width: sz(100), height: sz(100), borderRadius: sz(50) }]} />

      <Animated.View
        style={[styles.topSection, { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }], paddingTop: topSectionPaddingTop, paddingHorizontal: gap(32), paddingBottom: gap(24), minHeight: topSectionMinHeight }]}
      >
        <View style={[styles.logoWrapper, { marginBottom: gap(20) }]}>
          <AppLogo size={80} />
          <Text style={[styles.brandTitle, { fontSize: brandTitleSize }]}>AI Chatbot</Text>
          <Text style={styles.brandSubtitle}>For Tenants</Text>
        </View>

        <View style={[styles.quoteContainer, { paddingHorizontal: gap(8) }]}>
          <Text style={[styles.quoteText, { fontSize: quoteFontSize, lineHeight: fs(22) }]}>
            {language === 'vi'
              ? '"Đối tác thông minh cho chính sách nội bộ, HR và kiến thức công ty—được cung cấp bởi AI."'
              : '"Your intelligent partner for internal policies, HR guidance, and company knowledge—powered by AI."'}
          </Text>
          <Text style={styles.quoteAuthor}>
            {language === 'vi' ? 'Nền tảng Tư vấn Nội bộ' : 'Internal Consultant Platform'}
          </Text>
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bottomContainer}
        keyboardVerticalOffset={0}
      >
        <Animated.View
          style={[styles.formSection, {
            opacity: formOpacity,
            transform: [{ translateY: formTranslateY }],
            borderTopLeftRadius: formBorderRadius,
            borderTopRightRadius: formBorderRadius,
            padding: formPadding,
            paddingBottom: gap(48)
          }]}
        >
          <View style={[styles.handleBar, { width: sz(40), height: sz(4), borderRadius: sz(2), marginBottom: sz(20) }]} />

          <Text style={[styles.formTitle, { fontSize: formTitleSize, marginBottom: sz(4) }]}>
            {language === 'vi' ? 'Chào mừng trở lại!' : 'Welcome back!'}
          </Text>
          <Text style={[styles.formSubtitle, { fontSize: fs(14), marginBottom: formSubtitleMarginBottom }]}>
            {language === 'vi' ? 'Đăng nhập để tiếp tục' : 'Sign in to continue'}
          </Text>

          <View style={[styles.inputContainer, { marginBottom: gap(16) }]}>
            <View style={[styles.inputWrapper, { borderRadius: inputBorderRadius }]}>
              <Ionicons name="mail-outline" size={20} color={COLORS_TEXT_MUTED} style={[styles.inputIcon, { marginLeft: sz(14) }]} />
              <TextInput
                style={[styles.input, { paddingVertical: inputPadding, paddingHorizontal: sz(12), fontSize: fs(16) }]}
                placeholder={language === 'vi' ? 'Email' : 'Email'}
                placeholderTextColor={COLORS_TEXT_MUTED}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={[styles.inputContainer, { marginBottom: gap(16) }]}>
            <View style={[styles.inputWrapper, { borderRadius: inputBorderRadius }]}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS_TEXT_MUTED} style={[styles.inputIcon, { marginLeft: sz(14) }]} />
              <TextInput
                style={[styles.input, { paddingVertical: inputPadding, paddingHorizontal: sz(12), fontSize: fs(16) }]}
                placeholder={language === 'vi' ? 'Mật khẩu' : 'Password'}
                placeholderTextColor={COLORS_TEXT_MUTED}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity style={[styles.eyeBtn, { padding: inputPadding }]} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS_TEXT_MUTED} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={[styles.forgotBtn, { marginBottom: sz(20) }]}>
            <Text style={[styles.forgotText, { fontSize: fs(13) }]}>{t.forgotPassword}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { borderRadius: buttonBorderRadius, opacity: loading ? 0.6 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS_ACCENT, COLORS_ACCENT_DARK]}
              style={[styles.buttonGradient, { paddingVertical: buttonPadding }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={[styles.buttonContent, { gap: sz(8) }]}>
                  <Text style={[styles.buttonText, { fontSize: fs(16) }]}>{t.loginButton}</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.registerLink, { marginTop: sz(20) }]} onPress={() => router.push('/register')} activeOpacity={0.7}>
            <Text style={styles.registerText}>
              {isVi ? 'Chưa có tài khoản? ' : 'Don\'t have an account? '}
              <Text style={styles.registerTextBold}>
                {isVi ? 'Đăng ký ngay' : 'Register now'}
              </Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>

      <ErrorModal
        visible={showErrorModal}
        title={t.error}
        message={errorMessage}
        buttonText={isVi ? 'Đóng' : 'Close'}
        onClose={() => setShowErrorModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS_BG },
  background: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  decorTopLeft: { position: 'absolute', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  decorBottomRight: { position: 'absolute', backgroundColor: 'rgba(5, 150, 105, 0.06)' },
  decorSmall: { position: 'absolute', backgroundColor: 'rgba(16, 185, 129, 0.05)' },
  topSection: { alignItems: 'center' },
  logoWrapper: { alignItems: 'center' },
  brandTitle: { fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  brandSubtitle: { fontSize: 14, color: COLORS_TEXT_MUTED, marginTop: 4, fontWeight: '500' },
  quoteContainer: { alignItems: 'center' },
  quoteText: { color: 'rgba(255, 255, 255, 0.65)', textAlign: 'center', fontStyle: 'italic' },
  quoteAuthor: { fontSize: 11, color: COLORS_ACCENT, fontWeight: '600', marginTop: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  bottomContainer: { flex: 1, justifyContent: 'flex-end' },
  formSection: { backgroundColor: 'rgba(30, 41, 59, 0.98)', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
  handleBar: { backgroundColor: 'rgba(148, 163, 184, 0.3)', alignSelf: 'center' },
  formTitle: { fontWeight: '700', color: '#fff' },
  formSubtitle: { color: COLORS_TEXT_MUTED },
  inputContainer: {},
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS_SURFACE, borderWidth: 1, borderColor: COLORS_BORDER },
  inputIcon: {},
  input: { flex: 1, color: COLORS_TEXT },
  eyeBtn: {},
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { color: COLORS_ACCENT, fontWeight: '500' },
  registerLink: { alignItems: 'center', paddingVertical: 8 },
  registerText: { fontSize: 14, color: COLORS_TEXT_MUTED },
  registerTextBold: { color: COLORS_ACCENT, fontWeight: '600' },
  button: { overflow: 'hidden', shadowColor: COLORS_ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonGradient: { alignItems: 'center', justifyContent: 'center' },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
