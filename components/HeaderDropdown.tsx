import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '../lib/language-store';
import { useRouter } from 'expo-router';

export function HeaderDropdown() {
  const { language, toggleLanguage } = useLanguageStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.spring(dropdownAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(dropdownAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [open]);

  const handleProfile = () => {
    setOpen(false);
    router.push('/profile');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#f1f5f9" />
      </TouchableOpacity>

      {open && (
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Animated.View 
            style={[
              styles.dropdownContainer,
              {
                opacity: opacityAnim,
                transform: [
                  {
                    scale: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                  {
                    translateY: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <View style={styles.dropdown}>
              {/* Profile Option */}
              <TouchableOpacity style={styles.menuItem} onPress={handleProfile} activeOpacity={0.7}>
                <View style={styles.menuIcon}>
                  <Ionicons name="person-outline" size={18} color="#10b981" />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>
                    {language === 'vi' ? 'Hồ sơ' : 'Profile'}
                  </Text>
                  <Text style={styles.menuSub}>
                    {language === 'vi' ? 'Chỉnh sửa thông tin' : 'Edit information'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#64748b" />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Language Section */}
              <View style={styles.langSection}>
                <Text style={styles.sectionTitle}>
                  {language === 'vi' ? 'Ngôn ngữ' : 'Language'}
                </Text>

                <TouchableOpacity
                  style={[styles.option, language === 'vi' && styles.optionActive]}
                  onPress={() => {
                    if (language !== 'vi') toggleLanguage();
                    setOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>🇻🇳</Text>
                  <Text style={[styles.optionText, language === 'vi' && styles.optionTextActive]}>
                    Tiếng Việt
                  </Text>
                  {language === 'vi' && (
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.option, language === 'en' && styles.optionActive]}
                  onPress={() => {
                    if (language !== 'en') toggleLanguage();
                    setOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>🇺🇸</Text>
                  <Text style={[styles.optionText, language === 'en' && styles.optionTextActive]}>
                    English
                  </Text>
                  {language === 'en' && (
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Arrow */}
            <View style={styles.arrow} />
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  trigger: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: -Dimensions.get('window').height,
    left: -Dimensions.get('window').width + 80,
    zIndex: 999,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 50,
    right: 0,
    zIndex: 1000,
  },
  arrow: {
    position: 'absolute',
    top: -6,
    right: 14,
    width: 12,
    height: 12,
    backgroundColor: '#1e293b',
    transform: [{ rotate: '45deg' }],
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#334155',
  },
  dropdown: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  menuSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginHorizontal: 14,
  },
  langSection: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  flag: {
    fontSize: 18,
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
