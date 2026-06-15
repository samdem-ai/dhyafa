/**
 * Filters route (Phase 4) — deprecated as a standalone screen.
 *
 * Filtering now happens in a BottomSheet OVER the results screen
 * (src/components/FiltersSheet.tsx) so there's never a second results instance
 * or an ambiguous back-stack. Any lingering navigation to this route just
 * forwards back to results with its params intact.
 */

import { Redirect, useLocalSearchParams } from 'expo-router';
import { fromParams, toParams } from '@/lib/searchParams';

export default function FiltersScreen() {
  const params = useLocalSearchParams();
  const state = fromParams(params as Record<string, string | undefined>);
  return <Redirect href={{ pathname: '/search/results', params: toParams(state) }} />;
}
