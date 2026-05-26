import { create } from 'zustand';

export type Language = 'vi' | 'en';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useLanguageStore = create<LanguageState>()((set) => ({
  language: 'vi',
  setLanguage: (lang) => set({ language: lang }),
  toggleLanguage: () => set((state) => ({
    language: state.language === 'vi' ? 'en' : 'vi'
  })),
}));

// ============ Translations ============

export const translations = {
  vi: {
    // Common
    settings: 'Cài đặt',
    back: 'Quay lại',
    profile: 'Hồ sơ',
    logout: 'Đăng xuất',
    save: 'Lưu',
    cancel: 'Hủy',
    edit: 'Sửa',
    delete: 'Xóa',
    create: 'Tạo',
    search: 'Tìm kiếm',
    close: 'Đóng',
    done: 'Xong',
    confirm: 'Xác nhận',
    success: 'Thành công',
    error: 'Lỗi',
    loading: 'Đang tải...',
    noData: 'Không có dữ liệu',
    refresh: 'Làm mới',
    all: 'Tất cả',
    active: 'Hoạt động',
    inactive: 'Không hoạt động',
    pending: 'Chờ duyệt',
    rejected: 'Từ chối',
    suspended: 'Tạm ngưng',

    // Navigation
    chat: 'Trò chuyện AI',
    history: 'Lịch sử',
    documents: 'Tài liệu',
    analytics: 'Phân tích',
    profile: 'Hồ sơ',
    newChat: 'Chat mới',

    // App
    appTitle: 'AI Chatbot',
    appSubtitle: 'Nội bộ FPT',

    // Auth
    login: 'Đăng nhập',
    logout: 'Đăng xuất',
    email: 'Email',
    password: 'Mật khẩu',
    forgotPassword: 'Quên mật khẩu?',
    loginButton: 'Đăng nhập',
    loginError: 'Không thể đăng nhập. Vui lòng thử lại.',
    sessionExpired: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',

    // Analytics
    useAI: 'Sử dụng AI',
    totalRequests: 'Tổng yêu cầu',
    tokensUsed: 'Tokens đã dùng',
    today: 'Hôm nay',
    requests: 'Yêu cầu',
    documents: 'Tài liệu',
    totalDocuments: 'Tổng tài liệu',
    totalChunks: 'Tổng chunks',
    embeddingStatus: 'Trạng thái Embedding',
    embeddingDetails: 'Chi tiết Embedding',
    completed: 'Hoàn tất',
    processing: 'Đang xử lý',
    waiting: 'Chờ',
    failed: 'Lỗi',

    // Employee Management
    manageEmployees: 'Quản lý nhân viên',
    employeeList: 'Danh sách nhân viên',
    total: 'Tổng',
    activate: 'Kích hoạt',
    deactivate: 'Vô hiệu hóa',
    resetPassword: 'Reset mật khẩu',
    viewDetails: 'Xem chi tiết',
    fullName: 'Họ tên',
    phone: 'Điện thoại',
    role: 'Vai trò',
    department: 'Phòng ban',
    createdAt: 'Ngày tạo',
    lastLogin: 'Đăng nhập cuối',
    noEmployees: 'Không có nhân viên nào',

    // Chat
    chatPlaceholder: 'Nhập tin nhắn...',
    send: 'Gửi',
    thinking: 'Đang suy nghĩ...',
    noHistory: 'Chưa có cuộc trò chuyện nào',
    sources: 'Nguồn tài liệu',

    // Profile
    editProfile: 'Chỉnh sửa hồ sơ',
    updateSuccess: 'Cập nhật thành công',
    updateError: 'Không thể cập nhật. Vui lòng thử lại.',

    // Settings
    settings: 'Cài đặt',
    language: 'Ngôn ngữ',
    theme: 'Giao diện',
    lightMode: 'Sáng',
    darkMode: 'Tối',

    // Role
    admin: 'Quản trị viên',
    staff: 'Nhân viên',
    employee: 'Nhân viên',
    user: 'Người dùng',
  },

  en: {
    // Common
    settings: 'Settings',
    back: 'Back',
    profile: 'Profile',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    create: 'Create',
    search: 'Search',
    close: 'Close',
    done: 'Done',
    confirm: 'Confirm',
    success: 'Success',
    error: 'Error',
    loading: 'Loading...',
    noData: 'No data',
    refresh: 'Refresh',
    all: 'All',
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    rejected: 'Rejected',
    suspended: 'Suspended',

    // Navigation
    chat: 'AI Chat',
    history: 'History',
    documents: 'Documents',
    analytics: 'Analytics',
    profile: 'Profile',
    newChat: 'New Chat',

    // App
    appTitle: 'AI Chatbot',
    appSubtitle: 'FPT Internal',

    // Auth
    login: 'Login',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    loginButton: 'Login',
    loginError: 'Cannot login. Please try again.',
    sessionExpired: 'Session expired. Please login again.',

    // Analytics
    useAI: 'AI Usage',
    totalRequests: 'Total Requests',
    tokensUsed: 'Tokens Used',
    today: 'Today',
    requests: 'Requests',
    documents: 'Documents',
    totalDocuments: 'Total Documents',
    totalChunks: 'Total Chunks',
    embeddingStatus: 'Embedding Status',
    embeddingDetails: 'Embedding Details',
    completed: 'Completed',
    processing: 'Processing',
    waiting: 'Waiting',
    failed: 'Failed',

    // Employee Management
    manageEmployees: 'Manage Employees',
    employeeList: 'Employee List',
    total: 'Total',
    activate: 'Activate',
    deactivate: 'Deactivate',
    resetPassword: 'Reset Password',
    viewDetails: 'View Details',
    fullName: 'Full Name',
    phone: 'Phone',
    role: 'Role',
    department: 'Department',
    createdAt: 'Created At',
    lastLogin: 'Last Login',
    noEmployees: 'No employees found',

    // Chat
    chatPlaceholder: 'Enter message...',
    send: 'Send',
    thinking: 'Thinking...',
    noHistory: 'No conversations yet',
    sources: 'Document Sources',

    // Profile
    editProfile: 'Edit Profile',
    updateSuccess: 'Updated successfully',
    updateError: 'Cannot update. Please try again.',

    // Settings
    settings: 'Settings',
    language: 'Language',
    theme: 'Theme',
    lightMode: 'Light',
    darkMode: 'Dark',

    // Role
    admin: 'Administrator',
    staff: 'Staff',
    employee: 'Employee',
    user: 'User',
  },
};

export type TranslationKey = keyof typeof translations.vi;

export function t(key: TranslationKey, lang: Language = 'vi'): string {
  return translations[lang][key] || key;
}
