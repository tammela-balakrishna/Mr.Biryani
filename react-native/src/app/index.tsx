import { Redirect } from 'expo-router';
import { useAuth } from '../auth/AuthProvider';

// Staff land on the floor; customers land on the menu; signed-out visitors go to sign-in.
export default function Index() {
  const { status, isStaff } = useAuth();
  if (status === 'loading') return null;
  if (status !== 'authenticated') return <Redirect href="/login" />;
  return <Redirect href={isStaff ? '/floor' : '/menu'} />;
}
