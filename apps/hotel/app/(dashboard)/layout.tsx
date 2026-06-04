/**
 * Shared layout for all authenticated hotel-dashboard routes.
 *
 * Server Component:
 *   • Gates the whole group via `requireHost()` (redirects to /sign-in when the
 *     caller is not a signed-in host / staff member).
 *   • Resolves locale + capability flags and renders the sidebar nav.
 *
 * The sidebar is a Client Component (active-link highlighting + mobile collapse);
 * the rest of each page is server-rendered. RTL direction is applied on the flex
 * shell (the root <html dir> is also set in app/layout.tsx).
 */

import { requireHost, canManage } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { Sidebar, type NavCapabilities } from '../../components/Sidebar';
import { T, tl } from '../../lib/dashboard-i18n';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireHost('/');
  const locale = resolveLocale();

  const staffRoleLabel = session.isOwner
    ? tl(T.roleOwner, locale)
    : session.staffRole === 'manager'
      ? tl(T.roleManager, locale)
      : tl(T.roleReception, locale);

  const caps: NavCapabilities = {
    canManage: canManage(session),
    isOwner: session.isOwner,
    staffRoleLabel,
    email: session.email,
  };

  return (
    <Sidebar locale={locale} caps={caps}>
      {children}
    </Sidebar>
  );
}
