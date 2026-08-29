import { Component, type ErrorInfo, type ReactNode } from 'react';
import Logo from '@/components/Logo';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error.message, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid min-h-dvh min-h-screen place-items-center px-4 py-10">
        <div className="card w-full max-w-md p-6 text-center">
          <Logo size={40} className="mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-zinc-50">Något gick fel</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Sidan kunde inte laddas. Felet är loggat i webbläsarens konsol.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-black/40 px-3 py-2 text-left text-xs text-rose-300 whitespace-pre-wrap">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary mt-5"
          >
            Ladda om
          </button>
        </div>
      </div>
    );
  }
}
