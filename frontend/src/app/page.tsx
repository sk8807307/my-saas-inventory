import { redirect } from "next/navigation";

export default function HomePage() {
  // Fallback for environments where the root Proxy is not invoked.
  redirect("/login");
}
