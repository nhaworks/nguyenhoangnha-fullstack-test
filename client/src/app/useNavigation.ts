import { useEffect } from 'react';
import { useCurrentPath } from '../shared/hooks/useCurrentPath';
import { navigateTo } from '../shared/navigation';
import { findFullScreenPage } from './fullScreenPages';
import { findMenuItem, MENU_ITEMS } from './menu';

export function useNavigation() {
  const path = useCurrentPath();
  const activeItem = findMenuItem(path);

  useEffect(() => {
    document.title = `${activeItem.label} · Mẫu tài liệu`;
  }, [activeItem.label]);

  return {
    path,
    menuItems: MENU_ITEMS,
    activeItem,
    fullScreenPage: findFullScreenPage(path),
    navigate: navigateTo,
  };
}
