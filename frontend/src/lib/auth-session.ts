/**
 * The ERP route group's client guard checks the Django session through
 * @/features/auth/service. Django's API cookie belongs to that API origin, so
 * Next server components cannot assume they can inspect it directly.
 * This guard improves navigation only; Django must authorize every private API.
 */
export {};