interface AuthFormMessageProps {
  children: string;
  kind?: "error" | "success" | "info";
}

export default function AuthFormMessage({
  children,
  kind = "error",
}: AuthFormMessageProps) {
  const color = {
    error: "border-(--danger) text-(--danger)",
    success: "border-(--success) text-(--success)",
    info: "subtle-border muted-text",
  }[kind];

  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`rounded-lg border px-3 py-2 text-sm leading-5 ${color}`}
    >
      {children}
    </p>
  );
}
