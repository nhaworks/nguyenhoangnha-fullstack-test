import { useEffect, useState } from 'react';

export function useCurrentPath() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    function handleUrlChange() {
      setPath(window.location.pathname);
    }
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  return path;
}
