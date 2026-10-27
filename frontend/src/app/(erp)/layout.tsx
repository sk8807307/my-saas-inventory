import ErpAuthGuard from "@/components/auth/erp-auth-guard";
import type { ReactNode } from "react";

export default function ErpLayout({ children }: { children: ReactNode }) {
  return <ErpAuthGuard>{children}</ErpAuthGuard>;
}
