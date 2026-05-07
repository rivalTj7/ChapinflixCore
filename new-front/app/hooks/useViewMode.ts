import { useLocalStorage } from './useLocalStorage';

export type ViewMode = 'grid' | 'list';

export function useViewMode() {
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('chapinflix-view-mode', 'grid');
  
  return [viewMode, setViewMode] as const;
}