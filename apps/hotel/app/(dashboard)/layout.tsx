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
import { dir } from '@dyafa/i18n';
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
  const direction = dir(locale);

  const staffRoleLabel = session.isOwner
    ? tl(T.roleOwner, locale)
    : session.staffRole === 'manager'
      ? tl(T.roleManager, locale)
      : tl(T.roleReception, locale);

  const caps: NavCapabilities = {
    canManage: canManage(session),
    isOwner: session.isOwner,
    staffRoleLabel,
  };

  return (
    <div dir={direction} className="min-h-screen bg-bg lg:flex">
      <Sidebar locale={locale} caps={caps} />
      <main className="flex-1 min-w-0">
        <div className="max-w-screen-xl mx-auto px-lg sm:px-xl py-xl sm:py-2xl flex flex-col gap-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}
