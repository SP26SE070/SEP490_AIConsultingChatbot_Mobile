import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '../lib/language-store';

export function LanguageDropdown() {
  const { language, toggleLanguage } = useLanguageStore();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Ionicons name="globe-outline" size={20} color="#94a3b8" />
        <Text style={styles.triggerText}>{language === 'vi' ? 'VI' : 'EN'}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#64748b"
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          <TouchableOpacity
            style={[styles.option, language === 'vi' && styles.optionActive]}
            onPress={() => {
              if (language !== 'vi') toggleLanguage();
              setOpen(false);
            }}
          >
            <Text style={styles.flag}>🇻🇳</Text>
            <Text style={[styles.optionText, language === 'vi' && styles.optionTextActive]}>
              Tiếng Việt
            </Text>
            {language === 'vi' && (
              <Ionicons name="checkmark" size={18} color="#10b981" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, language === 'en' && styles.optionActive]}
            onPress={() => {
              if (language !== 'en') toggleLanguage();
              setOpen(false);
            }}
          >
            <Text style={styles.flag}>🇺🇸</Text>
            <Text style={[styles.optionText, language === 'en' && styles.optionTextActive]}>
              English
            </Text>
            {language === 'en' && (
              <Ionicons name="checkmark" size={18} color="#10b981" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 160,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  flag: {
    fontSize: 20,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  optionTextActive: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
});
