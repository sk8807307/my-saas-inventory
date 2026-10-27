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

export async function login(data: LoginRequest): Promise<AuthSession> {
  try {
    return await postJson<AuthSession>("/api/auth/login/", data);
  } finally {
    // Django can rotate the CSRF token during login.
    resetCsrf();
  }
}

export async function register(data: RegisterRequest): Promise<UserProfile> {
  return postJson<UserProfile>("/api/auth/register/", data);
}

export function selectTenant(tenantId: number): Promise<AuthMembership> {
  return postJson<AuthMembership>("/api/auth/tenant/select/", {
    tenant_id: tenantId,
  });
}

export function getCurrentSession(): Promise<AuthSession> {
  return getJson<AuthSession>("/api/auth/me/");
}

export async function logout(): Promise<{ detail: string }> {
  try {
    return await postJson<{ detail: string }>("/api/auth/logout/", {});
  } finally {
    resetCsrf();
  }
}

export function requestPasswordReset(data: PasswordResetRequest) {
  return postJson<{ detail: string }>("/api/auth/password-reset/", data);
}

export function confirmPasswordReset(data: PasswordResetConfirmRequest) {
  return postJson<{ detail: string }>(
    "/api/auth/password-reset/confirm/",
    data,
  );
}
