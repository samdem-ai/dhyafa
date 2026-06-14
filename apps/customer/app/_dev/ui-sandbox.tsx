/**
 * Hidden dev sandbox — renders each @/ui component once to sanity-check the
 * design system in EN. Not linked from anywhere; navigate to `/_dev/ui-sandbox`.
 * Safe to delete after Phase 1 review.
 */

import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Screen,
  Header,
  Heading,
  Text,
  Button,
  Card,
  ListItem,
  TextField,
  Select,
  SearchBar,
  Chip,
  SegmentedControl,
  Badge,
  StatusPill,
  statusTone,
  Avatar,
  RatingStars,
  PriceText,
  ConfirmSheet,
  BottomSheet,
  useToast,
  Skeleton,
  PropertyCardSkeleton,
  EmptyState,
  ErrorState,
  WizardProgress,
  WizardNav,
  Map,
  theme,
} from '@/ui';
import { Heart, Settings } from 'lucide-react-native';

export default function UiSandbox() {
  const toast = useToast();
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
  const [chip, setChip] = useState(false);
  const [text, setText] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [rating, setRating] = useState(3);
  const [confirm, setConfirm] = useState(false);
  const [sheet, setSheet] = useState(false);

  return (
    <View style={styles.root}>
      <Header title="UI Sandbox" />
      <Screen scroll edges={[]} contentContainerStyle={styles.body}>
        <Heading level={1}>Heading 1</Heading>
        <Heading level={2}>Heading 2</Heading>
        <Heading level={3}>Heading 3</Heading>
        <Text variant="body">Body text — the quick brown fox.</Text>
        <Text variant="caption" color="textMuted">
          Caption muted
        </Text>

        <Section title="Buttons">
          <Button label="Primary" onPress={() => toast.show({ message: 'Primary tapped' })} />
          <Button label="Secondary" variant="secondary" onPress={() => {}} />
          <Button label="Tertiary (commit)" variant="tertiary" onPress={() => {}} />
          <Button label="Danger" variant="danger" onPress={() => {}} />
          <Button label="Ghost" variant="ghost" onPress={() => {}} />
          <Button label="Loading" loading onPress={() => {}} />
          <Button label="With icon" icon={Heart} variant="secondary" onPress={() => {}} />
        </Section>

        <Section title="Card + ListItem">
          <Card>
            <Text variant="body">A card surface.</Text>
          </Card>
          <Card padding="none">
            <ListItem
              title="Settings"
              subtitle="Notifications, language"
              leading={<Settings size={22} color={theme.color.primary} />}
              onPress={() => {}}
            />
          </Card>
        </Section>

        <Section title="Inputs">
          <TextField label="Name" value={text} onChangeText={setText} placeholder="Your name" />
          <TextField label="Email (error)" value="" onChangeText={() => {}} error="Required" />
          <Select
            label="Property type"
            value={sel}
            placeholder="Choose…"
            sheetTitle="Property type"
            options={[
              { value: 'apt', label: 'Apartment' },
              { value: 'villa', label: 'Villa' },
              { value: 'riad', label: 'Riad' },
            ]}
            onChange={setSel}
          />
          <SearchBar value="" onChangeText={() => {}} placeholder="Search stays" />
        </Section>

        <Section title="Chips + Segmented">
          <View style={styles.row}>
            <Chip label="Wifi" selected={chip} onPress={() => setChip((v) => !v)} />
            <Chip label="Pool" icon={Heart} count={3} onPress={() => {}} />
            <Chip label="Removable" selected onRemove={() => {}} />
          </View>
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'a', label: 'Upcoming' },
              { value: 'b', label: 'Completed' },
              { value: 'c', label: 'Cancelled' },
            ]}
          />
        </Section>

        <Section title="Status + identity">
          <View style={styles.row}>
            <Badge label="Neutral" />
            <StatusPill label="Confirmed" tone={statusTone('confirmed')} />
            <StatusPill label="Cancelled" tone={statusTone('cancelled')} />
            <StatusPill label="In review" tone={statusTone('pending')} />
          </View>
          <View style={styles.row}>
            <Avatar name="Sara Ben" />
            <Avatar name="Omar K" size="lg" />
            <RatingStars value={3.5} />
            <RatingStars value={rating} onChange={setRating} />
          </View>
          <PriceText amount={12000} variant="large" locale="en" />
          <PriceText amount={36000} variant="total" locale="en" />
        </Section>

        <Section title="Feedback">
          <PropertyCardSkeleton />
          <Skeleton style={{ height: 16, width: '60%' }} />
          <View style={styles.box}>
            <EmptyState title="No trips yet" subtitle="Your booked stays show up here." />
          </View>
          <View style={styles.box}>
            <ErrorState message="Could not load." retryLabel="Retry" onRetry={() => {}} />
          </View>
        </Section>

        <Section title="Sheets + toast">
          <Button label="Show toast" variant="secondary" onPress={() => toast.show({ message: 'Saved', tone: 'success' })} />
          <Button label="Open confirm" variant="secondary" onPress={() => setConfirm(true)} />
          <Button label="Open sheet" variant="secondary" onPress={() => setSheet(true)} />
        </Section>

        <Section title="Wizard">
          <WizardProgress step={2} total={5} title="Add photos" stepLabel="Step 2 of 5" />
        </Section>

        <Section title="Map (stub)">
          <View style={styles.mapBox}>
            <Map
              title="Map view (stub)"
              body="Interactive map arrives in Phase 4."
              markers={[{ id: '1', latitude: 36.7, longitude: 3.0, price: 9000, label: 'Riad' }]}
            />
          </View>
        </Section>
      </Screen>

      <ConfirmSheet
        visible={confirm}
        onClose={() => setConfirm(false)}
        title="Cancel booking?"
        message="This cannot be undone."
        confirmLabel="Cancel booking"
        cancelLabel="Keep it"
        onConfirm={() => setConfirm(false)}
      />
      <BottomSheet visible={sheet} onClose={() => setSheet(false)}>
        <Heading level={3}>A bottom sheet</Heading>
        <Text variant="body" color="textMuted">
          Content padded above the home indicator.
        </Text>
        <WizardNav onNext={() => setSheet(false)} nextLabel="Done" />
      </BottomSheet>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" weight="bold" color="textMuted">
        {title.toUpperCase()}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
  body: { padding: theme.space.xl, gap: theme.space.md },
  section: { gap: theme.space.sm, marginTop: theme.space.lg },
  sectionBody: { gap: theme.space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.space.sm },
  box: { height: 200, backgroundColor: theme.color.surface, borderRadius: theme.radius.card },
  mapBox: { height: 320, borderRadius: theme.radius.card, overflow: 'hidden' },
});
