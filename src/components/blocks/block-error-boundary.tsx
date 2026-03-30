'use client';

import React from 'react';

interface Props {
  blockType: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class BlockErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`Block error [${this.props.blockType}]:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
          Content block unavailable ({this.props.blockType})
        </div>
      );
    }
    return this.props.children;
  }
}
