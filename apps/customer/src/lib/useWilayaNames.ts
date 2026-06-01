/**
 * Hook: load active wilayas once and return a code → localized-name map.
 *
 * Used by screens that show only a wilaya_code (trip cards, booking detail)
 * and need the human name without re-querying per row.
 */

import { useEffect, useState } from 'react';
import type { Locale } from '@dyafa/i18n';
import { listActiveWilayas, localizedName } from './discovery';

export function useWilayaNames(locale: Locale): Map<number, string> {
  const [map, setMap] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let mounted = true;
    listActiveWilayas()
      .then((rows) => {
        if (!mounted) return;
        setMap(new Map(rows.map((w) => [w.code, localizedName(w, locale)])));
      })
      .catch(() => {
        if (mounted) setMap(new Map());
      });
    return () => {
      mounted = false;
    };
  }, [locale]);

  return map;
}
