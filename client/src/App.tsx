import { Fragment } from 'react';
import { useNavigation } from './app/useNavigation';
import { DashboardLayout } from './app/DashboardLayout';

export default function App() {
  const navigation = useNavigation();

  if (navigation.fullScreenPage) {
    return <Fragment key={navigation.path}>{navigation.fullScreenPage}</Fragment>;
  }

  return (
    <DashboardLayout
      menuItems={navigation.menuItems}
      activePath={navigation.activeItem.path}
      onNavigate={navigation.navigate}
    >
      <Fragment key={navigation.activeItem.path}>{navigation.activeItem.page}</Fragment>
    </DashboardLayout>
  );
}
