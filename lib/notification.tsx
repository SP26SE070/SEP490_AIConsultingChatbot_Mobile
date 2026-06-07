import React, { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { ConfirmModal, SuccessModal, ErrorModal, InfoModal, ToastModal } from '../components/ui/CustomModal';

// ============== Types ==============
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'primary' | 'danger';
  icon?: string;
  iconColor?: string;
  loading?: boolean;
}

// ============== Context ==============
interface NotificationContextType {
  // Toast (auto-dismiss notification at top of screen)
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  // Blocking confirm dialog
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  // Success dialog
  showSuccess: (title: string, message: string, buttonText?: string) => void;
  // Error dialog
  showError: (message: string, title?: string) => void;
  // Info dialog
  showInfo: (message: string, title?: string, buttonText?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

// ============== Provider ==============
interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [toast, setToast] = useState<{ message: string; type: ToastType; duration: number } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmOptions & { resolve: (v: boolean) => void } | null>(null);
  const [success, setSuccess] = useState<{ title: string; message: string; buttonText?: string } | null>(null);
  const [error, setError] = useState<{ title?: string; message: string } | null>(null);
  const [info, setInfo] = useState<{ title?: string; message: string; buttonText?: string } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      toastTimer.current = setTimeout(() => setToast(null), toast.duration);
      return () => { if (toastTimer.current !== undefined) clearTimeout(toastTimer.current); };
    }
  }, [toast]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 2500) => {
    if (toastTimer.current !== undefined) clearTimeout(toastTimer.current);
    setToast({ message, type, duration });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirm({ ...options, resolve });
    });
  }, []);

  const showSuccess = useCallback((title: string, message: string, buttonText?: string) => {
    setSuccess({ title, message, buttonText });
  }, []);

  const showError = useCallback((message: string, title?: string) => {
    setError({ message, title });
  }, []);

  const showInfo = useCallback((message: string, title?: string, buttonText?: string) => {
    setInfo({ message, title, buttonText });
  }, []);

  const value: NotificationContextType = { showToast, showConfirm, showSuccess, showError, showInfo };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Toast */}
      {toast && (
        <ToastModal
          visible={true}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
        />
      )}

      {/* Confirm */}
      {confirm && (
        <ConfirmModal
          visible={true}
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          cancelText={confirm.cancelText}
          confirmStyle={confirm.confirmStyle}
          icon={confirm.icon}
          iconColor={confirm.iconColor}
          loading={confirm.loading}
          onConfirm={() => { confirm.resolve(true); setConfirm(null); }}
          onCancel={() => { confirm.resolve(false); setConfirm(null); }}
        />
      )}

      {/* Success */}
      {success && (
        <SuccessModal
          visible={true}
          title={success.title}
          message={success.message}
          buttonText={success.buttonText}
          onClose={() => setSuccess(null)}
        />
      )}

      {/* Error */}
      {error && (
        <ErrorModal
          visible={true}
          title={error.title}
          message={error.message}
          onClose={() => setError(null)}
        />
      )}

      {/* Info */}
      {info && (
        <InfoModal
          visible={true}
          title={info.title}
          message={info.message}
          buttonText={info.buttonText}
          onClose={() => setInfo(null)}
        />
      )}
    </NotificationContext.Provider>
  );
}

// ============== Hook ==============
export function useNotification(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used inside <NotificationProvider>');
  return ctx;
}

// ============== Standalone exports (for use outside React tree via ref) ==============
// For simplicity, we export the hook-based approach. Screens should call:
//   const { showToast, showConfirm, showSuccess, showError, showInfo } = useNotification();
