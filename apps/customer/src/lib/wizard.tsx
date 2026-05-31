/**
 * Listing-wizard state container.
 *
 * Holds the in-progress draft across the ordered steps and owns the
 * "persist a draft property early" strategy: as soon as the host picks a
 * property type + location, `ensureDraft()` inserts a draft `properties` row
 * so later steps (photos, room types, amenities) have a parent id to attach to.
 *
 * The component tree under app/host/new/_layout.tsx is wrapped in
 * <WizardProvider>. Steps read/update the draft via useWizard().
 */

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  becomeHost,
  createDraftProperty,
  getMyHostProfileId,
  updateProperty,
  type CancellationTier,
  type ListingKind,
  type PropertyUpdate,
} from './listings';

export interface RoomTypeDraft {
  /** Local key for list rendering before persistence. */
  key: string;
  /** DB id once persisted (single_unit default room persists on the pricing step). */
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

interface WizardContextValue {
  draft: WizardDraft;
  /** Shallow-merge a patch into the draft. */
  patch: (p: Partial<WizardDraft>) => void;
  /** Replace the rooms array. */
  setRooms: (rooms: RoomTypeDraft[]) => void;
  /**
   * Ensure a draft property exists in the DB (lazily becomes host first).
   * Idempotent — returns the property id. Call from the location step's "next".
   */
  ensureDraft: () => Promise<string>;
  /** Persist the location/details columns onto the draft property. */
  saveProperty: (patch: PropertyUpdate) => Promise<void>;
  reset: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<WizardDraft>(initialDraft);
  // Guards against double-inserting a draft when ensureDraft races.
  const creating = useRef<Promise<string> | null>(null);

  const patch = (p: Partial<WizardDraft>) => setDraft((d) => ({ ...d, ...p }));
  const setRooms = (rooms: RoomTypeDraft[]) => setDraft((d) => ({ ...d, rooms }));

  async function ensureDraft(): Promise<string> {
    if (draft.propertyId) return draft.propertyId;
    if (creating.current) return creating.current;

    const run = (async () => {
      let hostProfileId = draft.hostProfileId ?? (await getMyHostProfileId());
      if (!hostProfileId) hostProfileId = await becomeHost();

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

  const value = useMemo<WizardContextValue>(
    () => ({ draft, patch, setRooms, ensureDraft, saveProperty, reset: () => setDraft(initialDraft()) }),
    // draft is the only changing dependency; helpers close over setDraft (stable).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within <WizardProvider>');
  return ctx;
}

export { emptyRoom };
