This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## ERP architecture

- `src/config/navigation.ts` is the single source for ERP navigation groups and links. Desktop and mobile navigation render through `AppSidebar`, which consumes this configuration. Add links there rather than adding menu arrays to components.
- `src/features/{feature}/` owns feature types, data access, and domain rules. Dashboard preview data and its access boundary live in `src/features/dashboard/`; dashboard UI components receive typed data as props and stay focused on presentation. Values are illustrative. Django/API integration is deferred.
- `src/components/ui/` contains shared presentation patterns. `DataTable` accepts caller-provided columns, rows, row keys, row actions, and an optional pagination slot; it has no domain-specific data or behavior.
- `docs/domain-ux-plan.md` records the Inventory UX plan plus approved Sales, Purchasing, and shared frontend domain contracts for Milestone C.
- `src/app/(erp)/` contains ERP routes and the shared ERP shell. `ErpAuthGuard` checks the Django session before rendering those routes and sends signed-out users to login. The site root opens login, which redirects an existing session to the dashboard; the route group does not add a URL segment.
- `src/app/(auth)/` groups login, registration guidance, and password-reset pages without adding a URL segment. `src/features/auth/` centralizes the Django session-auth request contract.
- `src/app/layout.tsx` remains the single root layout. Theme preference is read through an external-store subscription with a stable server snapshot, then synchronized to the document class. This preserves saved preferences without initializing server and client renders differently or setting React state in an effect.

- `src/features/inventory/sku.ts` owns canonical SKU normalization and a debounced, cancellable availability-check contract. Availability checks are advisory; tenant-scoped uniqueness must be enforced by the Django/database layer when integration is added.
- `src/features/sales/` and `src/features/purchasing/` own approved workflow types and pure domain helpers; they do not call Django or implement persisted transactions.
- `src/lib/` contains shared money/date formatting, URL list-query parsing, UI permission claims, and the generic API envelope decoder. Backend authorization, tenant uniqueness, and concrete payload schemas remain authoritative.

Run project commands from this directory in Windows PowerShell. To start the development server, use `npm run dev`.



## Authentication integration

Set `NEXT_PUBLIC_API_BASE_URL` in the frontend environment to the Django origin. Copy the setting from `frontend.env.example` into `.env.local` and adjust it as needed. Configure Django CORS and CSRF trusted origins for the frontend. The UI supports backend session login, sign-out, and password reset. An ERP route guard provides a navigation check, while Django enforces API access. Account registration must be handled by a workspace administrator because Django exposes no registration endpoint. See `docs/authentication-integration.md` for endpoint mapping and current limits.
