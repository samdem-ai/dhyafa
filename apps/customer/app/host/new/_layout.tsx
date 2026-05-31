/**
 * Listing wizard layout. Wraps the ordered step screens in <WizardProvider>
 * so they share one in-progress draft. Each step is its own route in a
 * headerless stack (the WizardChrome renders its own progress header).
 *
 * If launched with ?propertyId=… (editing an existing draft), the index step
 * hydrates the wizard from the DB.
 */

import { Stack } from 'expo-router';
import { I18nManager } from 'react-native';
import { WizardProvider } from '@/lib/wizard';
import { theme } from '@/theme';

export default function NewListingLayout() {
  return (
    <WizardProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.color.bg },
          animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
          gestureEnabled: false,
        }}
      />
    </WizardProvider>
  );
}
