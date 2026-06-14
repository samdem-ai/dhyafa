/**
 * Shared layout for all authenticated hotel-dashboard routes.
 *
 * Server Component:
 *   • Gates the whole group via `requireHost()` (redirects to /sign-in when the
 *     caller is not a signed-in host / staff member).
 *   • Resolves locale + capability flags and hands them to the shared
 *     @dyafa/ui AppShell (via the client `HotelAppShell` wrapper).
 *
 * The shell is a Client Component (active-link highlighting, collapse, mobile
 * drawer, language switch); the rest of each page is server-rendered. RTL
 * direction is applied by the shell from the resolved locale (the root <html dir>
 * is also set in app/layout.tsx).
 */

import { requireHost, canManage } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { HotelAppShell, type ShellUser } from '../../components/HotelAppShell';
import { T, tl } from '../../lib/dashboard-i18n';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireHost('/');
  const locale = resolveLocale();

  const roleLabel = session.isOwner
    ? tl(T.roleOwner, locale)
    : session.staffRole === 'manager'
      ? tl(T.roleManager, locale)
      : tl(T.roleReception, locale);

  const user: ShellUser = {
    canManage: canManage(session),
    isOwner: session.isOwner,
    staffRole: session.staffRole,
    roleLabel,
    email: session.email,
  };

  return (
    <HotelAppShell locale={locale} user={user}>
      {children}
    </HotelAppShell>
  );
}
