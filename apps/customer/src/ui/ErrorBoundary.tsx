/**
 * ErrorBoundary — a global crash guard. Any uncaught render error in the tree is
 * caught here and shown as a branded ErrorState with a "Try again" reset, rather
 * than white-screening the app.
 *
 * Must be a class component (React error boundaries cannot be functions).
 */

import { Component, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '@/theme';
import { ErrorState } from './EmptyState';

interface Props {
  children: ReactNode;
  /** Localized labels (the root passes these; defaults are English). */
  title?: string;
  message?: string;
  retryLabel?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    // Surface to the JS console; a real crash reporter hooks in here later.
    console.error('[ErrorBoundary]', error);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <View style={styles.root}>
          <ErrorState
            title={this.props.title ?? 'Something went wrong'}
            message={this.props.message ?? 'An unexpected error occurred. Please try again.'}
            retryLabel={this.props.retryLabel ?? 'Try again'}
            onRetry={this.reset}
          />
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.bg },
});
