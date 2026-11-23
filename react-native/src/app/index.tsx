import { Redirect } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';
import { getPrimaryStaffTab } from '../authorization/permissions';

// Role-based landing: Staff land on their designated operational dashboard;
// customers and guests land on the Royal Andhra home.
export default function Index() {
  const { status, isStaff, roles } = useAuth();
  if (status === 'loading') return null;
  if (status === 'authenticated' && isStaff) {
    const targetTab = getPrimaryStaffTab(roles);
    return <Redirect href={`/${targetTab}` as any} />;
  }
  return <Redirect href="/home" />;
}
