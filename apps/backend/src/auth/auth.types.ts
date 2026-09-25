export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  branchId?: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: UserResponse;
  tokens: TokenResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: string;
  tenantId: string;
  branchId?: string;
  isActive: boolean;
  lastLoginAt?: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  tenant?: TenantBrief;
  branch?: BranchBrief;
  cashierProfile?: CashierProfileBrief;
}

export interface TenantBrief {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
}

export interface BranchBrief {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  isActive: boolean;
  isMain: boolean;
}

export interface CashierProfileBrief {
  id: string;
  isOnShift: boolean;
  shiftId?: string;
  permissions?: unknown;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export interface TwoFactorVerifyResponse {
  enabled: boolean;
  recoveryCodes: string[];
}

export interface RegisterResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

export interface MessageResponse {
  message: string;
}