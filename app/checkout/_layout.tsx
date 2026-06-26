import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function CheckoutLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8F9FD' } }} />
    </>
  );
}
