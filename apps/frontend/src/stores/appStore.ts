import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';

type ThemeMode = 'light' | 'dark';
type Language = 'ar' | 'en';
type Direction = 'ltr' | 'rtl';

export interface Tenant {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  logo?: string;
  planId?: string;
  planName?: string;
  isActive: boolean;
}

interface AppState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  language: Language;
  isOffline: boolean;
  tenant: Tenant | null;
}

interface AppActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  setOffline: (offline: boolean) => void;
  setTenant: (tenant: Tenant | null) => void;
}

type AppStore = AppState & AppActions;

function getDirection(language: Language): Direction {
  return language === 'ar' ? 'rtl' : 'ltr';
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'light',
      language: 'ar',
      isOffline: false,
      tenant: null,

      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      toggleSidebarCollapse: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      setTheme: (theme: ThemeMode) => {
        set({ theme });
        try {
          localStorage.setItem('smart-pos-theme', theme);
        } catch {
          // localStorage unavailable
        }
      },

      toggleTheme: () => {
        const current = get().theme;
        const next = current === 'light' ? 'dark' : 'light';
        set({ theme: next });
        try {
          localStorage.setItem('smart-pos-theme', next);
        } catch {
          // localStorage unavailable
        }
      },

      setLanguage: (language: Language) => {
        set({ language });
        const dir = getDirection(language);

        try {
          localStorage.setItem('smart-pos-language', language);
          localStorage.setItem('smart-pos-direction', dir);
        } catch {
          // localStorage unavailable
        }

        i18n.changeLanguage(language);

        if (typeof document !== 'undefined') {
          document.documentElement.dir = dir;
          document.documentElement.lang = language;
        }
      },

      toggleLanguage: () => {
        const current = get().language;
        const next = current === 'ar' ? 'en' : 'ar';
        const dir = getDirection(next);

        set({ language: next });

        try {
          localStorage.setItem('smart-pos-language', next);
          localStorage.setItem('smart-pos-direction', dir);
        } catch {
          // localStorage unavailable
        }

        i18n.changeLanguage(next);

        if (typeof document !== 'undefined') {
          document.documentElement.dir = dir;
          document.documentElement.lang = next;
        }
      },

      setOffline: (offline: boolean) => {
        set({ isOffline: offline });
      },

      setTenant: (tenant: Tenant | null) => {
        set({ tenant });
      },
    }),
    {
      name: 'smart-pos-app',
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        sidebarCollapsed: state.sidebarCollapsed,
        tenant: state.tenant,
      }),
    }
  )
);