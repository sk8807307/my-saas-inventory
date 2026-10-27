// These shapes match the responses returned by Django.
export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

export interface AuthTenant {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface AuthMembership {
  id: number;
  user: AuthUser;
  tenant: AuthTenant;
  role: string;
  status: string;
}

export interface AuthSession {
  user: AuthUser;
  memberships: AuthMembership[];
}

export type UserProfile = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
};

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  uid: string;
  token: string;
  new_password: string;
  new_password_confirm: string;
}
