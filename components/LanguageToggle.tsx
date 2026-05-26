import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '../lib/language-store';
import { COLORS } from '../lib/theme';

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguageStore();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.flag, language === 'vi' && styles.flagActive]}
        onPress={toggleLanguage}
        activeOpacity={0.7}
      >
        <Text style={styles.flagText}>🇻🇳</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.flag, language === 'en' && styles.flagActive]}
        onPress={toggleLanguage}
        activeOpacity={0.7}
      >
        <Text style={styles.flagText}>🇺🇸</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  flag: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  flagActive: {
    backgroundColor: COLORS.accentSoft,
  },
  flagText: {
    fontSize: 18,
  },
});
