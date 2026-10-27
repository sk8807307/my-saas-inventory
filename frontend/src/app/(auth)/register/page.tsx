import AuthCard from "@/components/auth/auth-card";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create an account"
      description="Create your Nexa ERP user account."
    >
      {/* TODO: Connect this form to the register service and show its response. */}
      <form className="space-y-5">
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="first_name">
            First name
          </label>
          <input
            className="field"
            id="first_name"
            name="first_name"
            type="text"
            autoComplete="given-name"
            maxLength={150}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="last_name">
            Last name
          </label>
          <input
            className="field"
            id="last_name"
            name="last_name"
            type="text"
            autoComplete="family-name"
            maxLength={150}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="email">
            Email address
          </label>
          <input
            className="field"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            maxLength={254}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            className="field"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>

        {/* TODO: Add pending and disabled states when registration is connected. */}
        <button
          className="primary-button w-full justify-center"
          type="button"
          disabled
        >
          Create account
        </button>
      </form>

      <p className="muted-text mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link className="text-(--primary) hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
