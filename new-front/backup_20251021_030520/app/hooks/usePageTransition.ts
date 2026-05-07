import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function usePageTransition() {
  const router = useRouter();

  const navigateWithTransition = useCallback((href: string, options?: { replace?: boolean }) => {
    // Show transition overlay
    const overlay = document.getElementById('page-transition');
    if (overlay) {
      overlay.classList.remove('pointer-events-none');
      overlay.classList.add('opacity-100');
    }

    // Navigate after transition starts
    setTimeout(() => {
      if (options?.replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    }, 150);
  }, [router]);

  return { navigateWithTransition };
}
