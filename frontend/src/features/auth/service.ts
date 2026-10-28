import { getJson, postJson, resetCsrf } from "@/lib/http";
import type {
  AuthMembership,
  AuthSession,
  LoginRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  RegisterRequest,
  UserProfile,
} from "./types";

import { API_ENDPOINTS } from "@/lib/api/endpoints";

export async function login(data: LoginRequest): Promise<AuthSession> {
  try {
    return await postJson<AuthSession>(API_ENDPOINTS.auth.login, data);
  } finally {
    // Django can rotate the CSRF token during login.
    resetCsrf();
  }
}

export async function register(data: RegisterRequest): Promise<UserProfile> {
  return postJson<UserProfile>(API_ENDPOINTS.auth.register, data);
}

export function selectTenant(tenantId: number): Promise<AuthMembership> {
  return postJson<AuthMembership>(API_ENDPOINTS.auth.selectTenant, {
    tenant_id: tenantId,
  });
}

export function getCurrentSession(): Promise<AuthSession> {
  return getJson<AuthSession>(API_ENDPOINTS.auth.me);
}

export async function logout(): Promise<{ detail: string }> {
  try {
    return await postJson<{ detail: string }>(API_ENDPOINTS.auth.logout, {});
  } finally {
    resetCsrf();
  }
}

export function requestPasswordReset(data: PasswordResetRequest) {
  return postJson<{ detail: string }>(
    API_ENDPOINTS.auth.passwordReset,
    data,
  );
}

export function confirmPasswordReset(data: PasswordResetConfirmRequest) {
  return postJson<{ detail: string }>(
    API_ENDPOINTS.auth.passwordResetConfirm,
    data,
  );
}
