import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { readPrivacyMode, writePrivacyMode } from '@/lib/privacyMode';

interface PrivacyContextValue {
  isPrivacyModeEnabled: boolean;
  togglePrivacyMode: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  isPrivacyModeEnabled: false,
  togglePrivacyMode: () => {},
});

export function PrivacyModeProvider({ children }: { children: ReactNode }) {
  const [isPrivacyModeEnabled, setEnabled] = useState(readPrivacyMode);

  const togglePrivacyMode = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      writePrivacyMode(next);
      return next;
    });
  }, []);

  return (
    <PrivacyContext.Provider value={{ isPrivacyModeEnabled, togglePrivacyMode }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacyMode() {
  return useContext(PrivacyContext);
}
