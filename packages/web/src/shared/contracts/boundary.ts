import type { ErrorInfo, ReactNode, ComponentType } from 'react';

export interface ErrorFallbackProps{
    error: Error;
    reset: () => void;
}

export interface ErrorBoundaryProps{
    children: ReactNode;
    fallback?: ComponentType<ErrorFallbackProps>;
    onError?: (error: Error, info: ErrorInfo) => void;
    resetKeys?: unknown[];
}

export interface ErrorBoundaryState{
    error: Error | null;
}
