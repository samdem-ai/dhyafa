/**
 * @/ui — the customer-app React Native design system.
 *
 * Built on @dyafa/design-tokens (rnTheme), RTL-safe (logical props +
 * writingDirection), safe-area aware, ≥44px touch targets, expo-image, Lucide
 * icons, haptics, and reduced-motion-aware animation.
 *
 * Import elevated components from here. The legacy `@/components/ui` and
 * `@/components/fields` modules re-export the compat shims for existing screens.
 */

// Foundations
export { theme } from '@/theme';
export * as haptics from './haptics';
export * as motion from './motion';
export { useReducedMotion } from './motion';

// Typography
export { Text, Heading } from './Text';
export type { TextProps, TextVariant, HeadingProps, HeadingLevel } from './Text';

// Layout
export { Screen } from './Screen';
export type { ScreenProps } from './Screen';
export { Header } from './Header';
export type { HeaderProps } from './Header';

// Actions
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// Containers + rows
export { Card } from './Card';
export type { CardProps } from './Card';
export { ListItem } from './ListItem';
export type { ListItemProps } from './ListItem';

// Inputs
export { TextField } from './TextField';
export type { TextFieldProps } from './TextField';
export { FieldLabel } from './FieldLabel';
export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';
export { SearchBar } from './SearchBar';
export type { SearchBarProps } from './SearchBar';
export { TimePicker } from './TimePicker';
export type { TimePickerProps } from './TimePicker';

// Selection
export { Chip } from './Chip';
export type { ChipProps } from './Chip';
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentOption } from './SegmentedControl';

// Status + identity
export { Badge, StatusPill, statusTone } from './StatusPill';
export type { BadgeProps, Tone } from './StatusPill';
export { Avatar } from './Avatar';
export type { AvatarProps, AvatarSize } from './Avatar';
export { RatingStars } from './RatingStars';
export type { RatingStarsProps } from './RatingStars';
export { PriceText } from './PriceText';
export type { PriceTextProps, PriceVariant } from './PriceText';

// Sheets + toast
export { BottomSheet } from './BottomSheet';
export type { BottomSheetProps } from './BottomSheet';
export { ConfirmSheet } from './ConfirmSheet';
export type { ConfirmSheetProps } from './ConfirmSheet';
export { ToastProvider, useToast } from './Toast';
export type { ToastOptions } from './Toast';

// Feedback states
export {
  Skeleton,
  SkeletonList,
  PropertyCardSkeleton,
  RowSkeleton,
  ConversationSkeleton,
  DetailSkeleton,
} from './Skeleton';
export type { SkeletonProps } from './Skeleton';
export { EmptyState, ErrorState } from './EmptyState';
export type { EmptyStateProps, ErrorStateProps } from './EmptyState';

// Lists
export { List, Refreshable } from './List';
export type { ListProps } from './List';

// Wizard
export { WizardProgress, WizardNav } from './WizardProgress';
export type { WizardProgressProps, WizardNavProps } from './WizardProgress';

// Media
export { RemoteImage } from './RemoteImage';
export type { RemoteImageProps } from './RemoteImage';
export { Carousel, PhotoGallery } from './PhotoGallery';
export type { CarouselProps, PhotoGalleryProps } from './PhotoGallery';
export { Map } from './Map';
export type { MapProps, MapMarker, MapRegion } from './Map';

// Error boundary + branded splash (root wiring)
export { ErrorBoundary } from './ErrorBoundary';
export { Splash } from './Splash';
