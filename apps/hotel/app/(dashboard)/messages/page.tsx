/**
 * Messages — inbox + realtime thread.
 *
 * Server Component loads the host's conversations (RLS-scoped) and resolves
 * guest names / property titles, then hands off to the client `MessagesClient`
 * which loads + subscribes to messages per conversation.
 */

import { requireHost } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { createUserClient } from '../../../lib/supabase/userServer';
import { T, tl, localizedField } from '../../../lib/dashboard-i18n';
import { PageHeader, ErrorState } from '../../../components/ui';
import { MessagesClient, type ConversationListItem } from './MessagesClient';

export const dynamic = 'force-dynamic';

interface ConversationRow {
  id: string;
  guest_id: string;
  property_id: string | null;
  last_message_at: string | null;
}

export default async function MessagesPage() {
  const session = await requireHost('/messages');
  const locale = resolveLocale();
  const supabase = createUserClient(session.accessToken);

  const { data, error } = await supabase
    .from('conversations')
    .select('id, guest_id, property_id, last_message_at')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100);

  const convos = (data ?? []) as ConversationRow[];

  const guestIds = Array.from(new Set(convos.map((c) => c.guest_id)));
  const propIds = Array.from(
    new Set(convos.map((c) => c.property_id).filter((v): v is string => v !== null)),
  );

  const [guestsRes, propsRes] = await Promise.all([
    guestIds.length
      ? supabase.from('profiles').select('id, display_name').in('id', guestIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    propIds.length
      ? supabase.from('properties').select('id, title_ar, title_fr, title_en').in('id', propIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            title_ar: string | null;
            title_fr: string | null;
            title_en: string | null;
          }[],
        }),
  ]);

  const guestName = new Map(
    ((guestsRes.data ?? []) as { id: string; display_name: string }[]).map((g) => [
      g.id,
      g.display_name,
    ]),
  );
  const propTitle = new Map(
    (
      (propsRes.data ?? []) as {
        id: string;
        title_ar: string | null;
        title_fr: string | null;
        title_en: string | null;
      }[]
    ).map((p) => [
      p.id,
      localizedField({ ar: p.title_ar, fr: p.title_fr, en: p.title_en }, locale),
    ]),
  );

  const items: ConversationListItem[] = convos.map((c) => ({
    id: c.id,
    guestName: guestName.get(c.guest_id) ?? tl(T.msgGuest, locale),
    propertyTitle: c.property_id ? (propTitle.get(c.property_id) ?? null) : null,
    lastMessageAt: c.last_message_at,
  }));

  return (
    <>
      <PageHeader title={tl(T.msgTitle, locale)} />
      {error ? (
        <ErrorState title={tl(T.errorTitle, locale)} message={error.message} />
      ) : (
        <MessagesClient locale={locale} currentUserId={session.userId} conversations={items} />
      )}
    </>
  );
}
