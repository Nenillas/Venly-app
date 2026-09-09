import { useEffect, useState } from 'react';
import { normalizePath } from '@/lib/sitePath';

export function useLocationPath(): string {
  const [path, setPath] = useState(() =>
    `${normalizePath()}${window.location.search}`,
  );

  useEffect(() => {
    const sync = () => setPath(`${normalizePath()}${window.location.search}`);
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  return path;
}
