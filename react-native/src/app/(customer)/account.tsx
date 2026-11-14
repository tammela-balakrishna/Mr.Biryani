import { Text, View } from 'react-native';
import { PrimaryButton, Screen } from '../../components/ui';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';

export default function AccountScreen() {
  const auth = useAuth();
  if (auth.status !== 'authenticated') return null;
  const { user, roles } = auth.session;
  return (
    <Screen>
      <View style={{ padding: 24, gap: 12 }}>
        <Text style={{ color: colors.gold, fontSize: 24, fontWeight: '700' }}>{user.fullName}</Text>
        {user.email ? <Text style={{ color: colors.textMuted }}>{user.email}</Text> : null}
        {user.phone ? <Text style={{ color: colors.textMuted }}>{user.phone}</Text> : null}
        <Text style={{ color: colors.textMuted }}>
          Account type: {roles.includes('CUSTOMER') ? 'Customer' : roles.join(', ')}
        </Text>
        <View style={{ marginTop: 24 }}>
          <PrimaryButton title="Sign out" onPress={() => void auth.logout()} />
        </View>
      </View>
    </Screen>
  );
}
