import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '../../lib/language-store';

interface OptionItem {
  label: string;
  value: string;
  icon?: string;
}

interface PickerModalProps {
  visible: boolean;
  title: string;
  options: OptionItem[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

// Reusable Picker Modal
export function PickerModal({ visible, title, options, selectedValue, onSelect, onClose }: PickerModalProps) {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <View style={styles.optionsList}>
                {options.map((option) => {
                  const isSelected = option.value === selectedValue;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemSelected
                      ]}
                      onPress={() => {
                        onSelect(option.value);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      {option.icon && (
                        <Ionicons
                          name={option.icon as any}
                          size={20}
                          color={isSelected ? '#10b981' : '#64748b'}
                          style={styles.optionIcon}
                        />
                      )}
                      <Text style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>
                  {isVi ? 'Hủy' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Confirmation Modal
interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'primary' | 'danger';
  icon?: string;
  iconColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  confirmStyle = 'primary',
  icon,
  iconColor = '#10b981',
  onConfirm,
  onCancel,
  loading = false
}: ConfirmModalProps) {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.confirmModalContent}>
              {/* Icon */}
              {icon && (
                <View style={[styles.confirmIconWrap, { backgroundColor: `${iconColor}20` }]}>
                  <Ionicons name={icon as any} size={36} color={iconColor} />
                </View>
              )}

              {/* Title & Message */}
              <Text style={styles.confirmTitle}>{title}</Text>
              <Text style={styles.confirmMessage}>{message}</Text>

              {/* Buttons */}
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={onCancel}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmCancelText}>
                    {cancelText || (isVi ? 'Hủy' : 'Cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmConfirmBtn,
                    confirmStyle === 'danger' && styles.confirmDangerBtn
                  ]}
                  onPress={onConfirm}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <Text style={styles.confirmConfirmText}>
                      {isVi ? 'Đang xử lý...' : 'Processing...'}
                    </Text>
                  ) : (
                    <Text style={styles.confirmConfirmText}>
                      {confirmText || (isVi ? 'Xác nhận' : 'Confirm')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Success Modal
interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export function SuccessModal({ visible, title, message, buttonText, onClose }: SuccessModalProps) {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.successModalContent}>
              {/* Success Icon */}
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-circle" size={60} color="#10b981" />
              </View>

              {/* Title & Message */}
              <Text style={styles.successTitle}>{title}</Text>
              <Text style={styles.successMessage}>{message}</Text>

              {/* Button */}
              <TouchableOpacity
                style={styles.successBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.successBtnText}>
                  {buttonText || 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Error Modal
interface ErrorModalProps {
  visible: boolean;
  title?: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

export function ErrorModal({ visible, title, message, buttonText, onClose }: ErrorModalProps) {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.errorModalContent}>
              {/* Error Icon */}
              <View style={styles.errorIconWrap}>
                <Ionicons name="alert-circle" size={60} color="#f87171" />
              </View>

              {/* Title & Message */}
              {title && <Text style={styles.errorTitle}>{title}</Text>}
              <Text style={styles.errorMessage}>{message}</Text>

              {/* Button */}
              <TouchableOpacity
                style={styles.errorBtn}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.errorBtnText}>
                  {buttonText || (isVi ? 'Đóng' : 'Close')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Info Modal
interface InfoModalProps {
  visible: boolean;
  title?: string;
  message: string;
  buttonText?: string;
  icon?: string;
  iconColor?: string;
  onClose: () => void;
}

export function InfoModal({ visible, title, message, buttonText, icon = 'information-circle', iconColor = '#3b82f6', onClose }: InfoModalProps) {
  const { language } = useLanguageStore();
  const isVi = language === 'vi';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.infoModalContent}>
              <View style={[styles.infoIconWrap, { backgroundColor: `${iconColor}20` }]}>
                <Ionicons name={icon as any} size={48} color={iconColor} />
              </View>
              {title && <Text style={styles.infoTitle}>{title}</Text>}
              <Text style={styles.infoMessage}>{message}</Text>
              <TouchableOpacity style={[styles.infoBtn, { backgroundColor: iconColor }]} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.infoBtnText}>{buttonText || (isVi ? 'Đóng' : 'Close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Toast Modal (auto-dismiss)
interface ToastModalProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  icon?: string;
  duration?: number;
}

export function ToastModal({ visible, message, type = 'info', icon, duration = 2500 }: ToastModalProps) {
  const config = {
    success: { icon: icon || 'checkmark-circle', color: '#10b981', bg: '#10b981' },
    error: { icon: icon || 'alert-circle', color: '#f87171', bg: '#f87171' },
    info: { icon: icon || 'information-circle', color: '#3b82f6', bg: '#3b82f6' },
    warning: { icon: icon || 'warning', color: '#f59e0b', bg: '#f59e0b' },
  }[type];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={toastStyles.overlay}>
        <View style={toastStyles.container}>
          <View style={[toastStyles.iconWrap, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon as any} size={22} color={config.color} />
          </View>
          <Text style={toastStyles.message} numberOfLines={3}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const toastStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    maxWidth: '100%',
    width: 'auto',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#f1f5f9',
    fontWeight: '500',
    lineHeight: 20,
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  // Picker Modal
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    padding: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  optionItemSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#e2e8f0',
  },
  optionTextSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
  cancelBtn: {
    margin: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },

  // Confirm Modal
  confirmModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  confirmIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
  confirmConfirmBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  confirmDangerBtn: {
    backgroundColor: '#f87171',
  },
  confirmConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Success Modal
  successModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  successIconWrap: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  successBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Error Modal
  errorModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  errorIconWrap: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f87171',
    alignItems: 'center',
  },
  errorBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Info Modal
  infoModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  infoIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  infoBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
