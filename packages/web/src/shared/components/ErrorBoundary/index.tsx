import { Component } from 'react';
import type { ErrorInfo } from 'react';
import ErrorFallback from '@/shared/components/ErrorFallback';
import type { ErrorBoundaryProps, ErrorBoundaryState } from '@/shared/contracts/boundary';

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState>{
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState{
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo){
        this.props.onError?.(error, info);
        if(import.meta.env.DEV){
            console.error('ErrorBoundary caught an error:', error, info.componentStack);
        }
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps){
        if(this.state.error && this.#resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)){
            this.reset();
        }
    }

    #resetKeysChanged(prev?: unknown[], next?: unknown[]): boolean{
        if(prev === next) return false;
        if(!prev || !next) return true;
        if(prev.length !== next.length) return true;
        return prev.some((key, index) => !Object.is(key, next[index]));
    }

    reset = () => {
        this.setState({ error: null });
    };

    render(){
        const { error } = this.state;
        if(error){
            const Fallback = this.props.fallback ?? ErrorFallback;
            return <Fallback error={error} reset={this.reset} />;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
