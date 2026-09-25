import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: string;
  permissions: string[];
  branchId?: string;
  branchName?: string;
  tenantId: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

function decodeJWT(token: string): { exp: number } | null {
  try {
    if (token.startsWith('demo-token')) {
      return { exp: Math.floor(Date.now() / 1000) + 86400 * 365 };
    }
    const base64Url = token.split('.')[1] || '';
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,

      login: (user: User, accessToken: string, refreshToken: string) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      },

      logout: () => {
        const { refreshToken } = get();
        if (refreshToken) {
          import('@/api/endpoints')
            .then(({ api }) => api.auth.logout(refreshToken))
            .catch(() => {})
            .finally(() => {
              set({
                user: null,
                accessToken: null,
                refreshToken: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true,
              });
              try {
                localStorage.removeItem('smart-pos-auth');
              } catch {
                // localStorage unavailable
              }
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
            });
        } else {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
          });
          try {
            localStorage.removeItem('smart-pos-auth');
          } catch {
            // localStorage unavailable
          }
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      initialize: async () => {
        const state = get();
        set({ isLoading: true });

        const accessToken = state.accessToken;
        const refreshToken = state.refreshToken;

        if (!accessToken || !refreshToken) {
          set({
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            user: null,
            accessToken: null,
            refreshToken: null,
          });
          return;
        }

        if (isTokenExpired(accessToken)) {
          if (isTokenExpired(refreshToken)) {
            set({
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
              user: null,
              accessToken: null,
              refreshToken: null,
            });
            return;
          }

          try {
            const { api } = await import('@/api/endpoints');
            const tokenData = await api.auth.refreshToken({ refreshToken });
            set({
              accessToken: tokenData.accessToken,
              refreshToken: tokenData.refreshToken || refreshToken,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });

            try {
              const profile = await api.auth.getProfile() as {
                id: string;
                email: string;
                name: string;
                role: string;
                tenantId: string;
                branchId?: string;
                isActive: boolean;
                lastLoginAt?: string;
              };
              set({
                user: {
                  id: profile.id,
                  email: profile.email,
                  fullName: profile.name,
                  role: profile.role,
                  permissions: [],
                  tenantId: profile.tenantId,
                  branchId: profile.branchId,
                  isActive: profile.isActive,
                  lastLogin: profile.lastLoginAt,
                },
              });
            } catch {
              // Profile fetch failed but tokens are valid
            }
            return;
          } catch {
            set({
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
              user: null,
              accessToken: null,
              refreshToken: null,
            });
            return;
          }
        }

        if (!state.user) {
          try {
            const { api } = await import('@/api/endpoints');
            const profile = await api.auth.getProfile() as {
              id: string;
              email: string;
              name: string;
              role: string;
              tenantId: string;
              branchId?: string;
              isActive: boolean;
              lastLoginAt?: string;
            };
            set({
              user: {
                id: profile.id,
                email: profile.email,
                fullName: profile.name,
                role: profile.role,
                permissions: [],
                tenantId: profile.tenantId,
                branchId: profile.branchId,
                isActive: profile.isActive,
                lastLogin: profile.lastLoginAt,
              },
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
            });
          } catch {
            set({
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
              user: null,
              accessToken: null,
              refreshToken: null,
            });
          }
        } else {
          set({
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });
        }
      },
    }),
    {
      name: 'smart-pos-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);