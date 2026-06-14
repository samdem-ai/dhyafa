/**
 * Listing-wizard state container.
 *
 * Holds the in-progress draft across the ordered steps and owns the
 * "persist a draft property early" strategy: as soon as the host picks a
 * property type + location, `ensureDraft()` inserts a draft `properties` row
 * so later steps (photos, room types, amenities) have a parent id to attach to.
 *
 * Two blocker concerns are handled here:
 *  - host_id claim: `ensureDraft()` calls `ensureHostAndRefresh()` which runs
 *    `become_host` (only for non-hosts) THEN `supabase.auth.refreshSession()` so
 *    the freshly-minted `host_id` JWT claim is present before the first host
 *    write (otherwise every write is RLS-blocked for a brand-new host).
 *  - draft loss: the draft is persisted to AsyncStorage (debounced) and
 *    rehydrated on mount, so backgrounding the app mid-wizard doesn't lose
 *    progress. `reset()` clears both memory and storage.
 *
 * The component tree under app/host/new/_layout.tsx is wrapped in
 * <WizardProvider>. Steps read/update the draft via useWizard().
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDraftProperty,
  ensureHostAndRefresh,
  getMyHostProfileId,
  updateProperty,
  type CancellationTier,
  type ListingKind,
  type PropertyUpdate,
} from './listings';

export interface RoomTypeDraft {
  /** Local key for list rendering before persistence. */
  key: string;
  /** DB id once persisted (written back after insert so retries don't dup). */
  id?: string;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  maxOccupancy: string;
  basePriceDzd: string;
  weekendPriceDzd: string;
  cleaningFeeDzd: string;
  inventoryCount: string;
}

export interface WizardDraft {
  propertyId: string | null;
  hostProfileId: string | null;

  // Step 1 — type
  propertyTypeId: number | null;
  listingKind: ListingKind;

  // Step 2 — location
  wilayaCode: number | null;
  communeId: number | null;
  addressLine: string;
  lat: string;
  lng: string;

  // Step 4 — title + description
  titleAr: string;
  titleFr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionFr: string;
  descriptionEn: string;

  // Step 5 — amenities
  amenityIds: number[];

  // Step 6 — rules + times
  houseRulesAr: string;
  houseRulesFr: string;
  houseRulesEn: string;
  checkinTime: string;
  checkoutTime: string;

  // Step 7 — pricing / room types
  rooms: RoomTypeDraft[];

  // Step 8 — policy
  cancellationTier: CancellationTier;
  instantBook: boolean;
  minNights: string;
}

function emptyRoom(isDefault: boolean): RoomTypeDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    nameAr: isDefault ? '' : '',
    nameFr: '',
    nameEn: '',
    maxOccupancy: '2',
    basePriceDzd: '',
    weekendPriceDzd: '',
    cleaningFeeDzd: '0',
    inventoryCount: '1',
  };
}

function initialDraft(): WizardDraft {
  return {
    propertyId: null,
    hostProfileId: null,
    propertyTypeId: null,
    listingKind: 'single_unit',
    wilayaCode: null,
    communeId: null,
    addressLine: '',
    lat: '',
    lng: '',
    titleAr: '',
    titleFr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionFr: '',
    descriptionEn: '',
    amenityIds: [],
    houseRulesAr: '',
    houseRulesFr: '',
    houseRulesEn: '',
    checkinTime: '14:00',
    checkoutTime: '12:00',
    rooms: [emptyRoom(true)],
    cancellationTier: 'moderate',
    instantBook: false,
    minNights: '1',
  };
}

/** AsyncStorage key for the persisted in-progress wizard draft. */
const DRAFT_STORAGE_KEY = 'dyafa.wizard.draft.v1';

interface WizardContextValue {
  draft: WizardDraft;
  /** True until the persisted draft (if any) has been rehydrated. */
  hydrating: boolean;
  /** Shallow-merge a patch into the draft. */
  patch: (p: Partial<WizardDraft>) => void;
  /** Replace the rooms array. */
  setRooms: (rooms: RoomTypeDraft[]) => void;
  /**
   * Ensure a draft property exists in the DB (lazily becomes host + refreshes
   * the session first so the host_id claim is present). Idempotent — returns the
   * property id. Call from the location step's "next" (NOT on mere step visits,
   * to avoid orphaning empty drafts).
   */
  ensureDraft: () => Promise<string>;
  /** Persist the location/details columns onto the draft property. */
  saveProperty: (patch: PropertyUpdate) => Promise<void>;
  /** Clear the draft (memory + storage). Call on successful submit / discard. */
  reset: () => Promise<void>;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<WizardDraft>(initialDraft);
  const [hydrating, setHydrating] = useState(true);
  // Guards against double-inserting a draft when ensureDraft races.
  const creating = useRef<Promise<string> | null>(null);
  // After rehydration completes we may begin persisting changes.
  const persistReady = useRef(false);

  const patch = (p: Partial<WizardDraft>) => setDraft((d) => ({ ...d, ...p }));
  const setRooms = (rooms: RoomTypeDraft[]) => setDraft((d) => ({ ...d, rooms }));

  // Rehydrate the persisted draft once on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw && active) {
          const parsed = JSON.parse(raw) as Partial<WizardDraft>;
          // Merge over a fresh initial draft so new fields get defaults.
          setDraft({ ...initialDraft(), ...parsed });
        }
      } catch {
        // Corrupt/absent — start fresh.
      } finally {
        if (active) {
          persistReady.current = true;
          setHydrating(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist the draft (debounced) whenever it changes after rehydration so
  // backgrounding mid-wizard doesn't lose progress.
  useEffect(() => {
    if (!persistReady.current) return;
    const t = setTimeout(() => {
      void AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft)).catch(
        () => undefined,
      );
    }, 400);
    return () => clearTimeout(t);
  }, [draft]);

  async function ensureDraft(): Promise<string> {
    if (draft.propertyId) return draft.propertyId;
    if (creating.current) return creating.current;

    const run = (async () => {
      // become_host (non-hosts only) + refreshSession so the host_id claim is
      // present before the insert — otherwise RLS rejects the write.
      let hostProfileId = draft.hostProfileId ?? (await getMyHostProfileId());
      if (!hostProfileId) {
        hostProfileId = await ensureHostAndRefresh();
      }

      if (draft.propertyTypeId == null || draft.wilayaCode == null) {
        throw new Error('PROPERTY_TYPE_AND_WILAYA_REQUIRED');
      }

      const id = await createDraftProperty({
        hostProfileId,
        propertyTypeId: draft.propertyTypeId,
        listingKind: draft.listingKind,
        wilayaCode: draft.wilayaCode,
      });
      setDraft((d) => ({ ...d, propertyId: id, hostProfileId }));
      return id;
    })();

    creating.current = run;
    try {
      return await run;
    } finally {
      creating.current = null;
    }
  }

  async function saveProperty(p: PropertyUpdate): Promise<void> {
    const id = await ensureDraft();
    await updateProperty(id, p);
  }

  async function reset(): Promise<void> {
    setDraft(initialDraft());
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // best-effort
    }
  }

  const value = useMemo<WizardContextValue>(
    () => ({ draft, hydrating, patch, setRooms, ensureDraft, saveProperty, reset }),
    // draft/hydrating are the changing deps; helpers close over setDraft (stable).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, hydrating],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within <WizardProvider>');
  return ctx;
}

export { emptyRoom };
