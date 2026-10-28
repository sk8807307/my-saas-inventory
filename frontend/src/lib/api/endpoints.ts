
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_DJANGO_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export const API_ENDPOINTS = {
  auth: {
    csrf: "/api/auth/csrf/",
    login: "/api/auth/login/",
    logout: "/api/auth/logout/",
    register: "/api/auth/register/",
    me: "/api/auth/me/",
    memberships: "/api/auth/memberships/",
    selectTenant: "/api/auth/tenant/select/",
    passwordReset: "/api/auth/password-reset/",
    passwordResetConfirm: "/api/auth/password-reset/confirm/",
  },

  inventory: {
    base: "/api/inventory/",
  },

  sales: {
    base: "/api/sales/",
  },

  purchasing: {
    base: "/api/purchasing/",
  },

  reports: {
    base: "/api/reports/",
  },

  settings: {
    base: "/api/settings/",
  },
} as const;

export { API_BASE_URL };
