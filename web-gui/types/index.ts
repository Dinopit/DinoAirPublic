/**
 * Shared Type Definitions Index
 * Central export point for all type definitions used throughout the application
 */

// Re-export all API types
export * from './api';

// Additional common types that might be used across the application
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface BaseModalProps extends ComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export interface BaseFormProps extends ComponentProps {
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export interface TableColumn<T = any> {
  key: keyof T | string;
  title: string;
  width?: string | number;
  sortable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface TableProps<T = any> extends ComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowKey?: keyof T | ((record: T) => string);
  onRowClick?: (record: T, index: number) => void;
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps extends ComponentProps {
  options: SelectOption[];
  value?: string | number | string[] | number[];
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onChange: (value: string | number | string[] | number[]) => void;
}

export interface ButtonProps extends ComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends ComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  value?: string | number;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

export interface TextareaProps extends ComponentProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  rows?: number;
  cols?: number;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
}

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}

export interface ConfirmDialogProps extends BaseModalProps {
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  data?: any;
}

export interface AsyncState<T = any> extends LoadingState {
  data?: T;
}

// Hook return types
export interface UseAsyncReturn<T = any> extends AsyncState<T> {
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
}

export interface UseDebounceReturn<T> {
  debouncedValue: T;
  isDebouncing: boolean;
}

// Event handler types
export type ClickHandler = (event: React.MouseEvent) => void;
export type ChangeHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void;
export type SubmitHandler = (event: React.FormEvent) => void;
export type KeyboardHandler = (event: React.KeyboardEvent) => void;

// Utility types for better type safety
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type ValueOf<T> = T[keyof T];

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// Environment and configuration types
export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    chat: boolean;
    fileUpload: boolean;
    export: boolean;
    analytics: boolean;
  };
  limits: {
    maxFileSize: number;
    maxFiles: number;
    requestTimeout: number;
  };
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
}

// Theme and styling types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    border: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// User preferences and customization types
export type ThemeMode = 'light' | 'dark' | 'auto';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '12h' | '24h';

export interface AccessibilityPreferences {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  desktop: boolean;
  sound: boolean;
  types: {
    system: boolean;
    updates: boolean;
    collaboration: boolean;
    errors: boolean;
  };
}

export interface ChatPreferences {
  autoSave: boolean;
  showTimestamps: boolean;
  messageGrouping: boolean;
  enterToSend: boolean;
  showTypingIndicator: boolean;
  maxHistoryLength: number;
  defaultPersonality: string;
}

export interface UIPreferences {
  sidebarCollapsed: boolean;
  compactMode: boolean;
  showTooltips: boolean;
  animationsEnabled: boolean;
  gridView: boolean;
  itemsPerPage: number;
}

export interface UserPreferences {
  // Theme and appearance
  themeMode: ThemeMode;
  customTheme?: Partial<Theme>;
  
  // Localization
  language: Language;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  timezone: string;
  
  // Accessibility
  accessibility: AccessibilityPreferences;
  
  // Notifications
  notifications: NotificationPreferences;
  
  // Chat specific
  chat: ChatPreferences;
  
  // UI behavior
  ui: UIPreferences;
  
  // Advanced settings
  advanced: {
    debugMode: boolean;
    experimentalFeatures: boolean;
    telemetryEnabled: boolean;
    autoUpdates: boolean;
  };
  
  // Custom shortcuts
  shortcuts: Record<string, string>;
  
  // Metadata
  version: string;
  lastModified: string;
  syncEnabled: boolean;
}

export interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: DeepPartial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  exportPreferences: () => string;
  importPreferences: (data: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// Theme presets
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: Theme;
  preview: string; // Base64 encoded preview image
}

// Default preferences
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  themeMode: 'auto',
  language: 'en',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium',
    screenReader: false,
    keyboardNavigation: true,
  },
  notifications: {
    email: true,
    push: true,
    desktop: true,
    sound: true,
    types: {
      system: true,
      updates: true,
      collaboration: true,
      errors: true,
    },
  },
  chat: {
    autoSave: true,
    showTimestamps: true,
    messageGrouping: true,
    enterToSend: true,
    showTypingIndicator: true,
    maxHistoryLength: 1000,
    defaultPersonality: 'default',
  },
  ui: {
    sidebarCollapsed: false,
    compactMode: false,
    showTooltips: true,
    animationsEnabled: true,
    gridView: false,
    itemsPerPage: 20,
  },
  advanced: {
    debugMode: false,
    experimentalFeatures: false,
    telemetryEnabled: true,
    autoUpdates: true,
  },
  shortcuts: {},
  version: '1.0.0',
  lastModified: new Date().toISOString(),
  syncEnabled: false,
};