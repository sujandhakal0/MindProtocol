import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

function TabIcon({ name, label, focused }: { name: keyof typeof Ionicons.glyphMap; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons name={name} size={24} color={focused ? COLORS.accent : COLORS.textMuted} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="home" label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="session"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="book" label="Journal" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="stats-chart" label="Insights" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.bgCard,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: 70,
    paddingTop: 14,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', height: '100%' },
  tabLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  tabLabelFocused: { color: COLORS.accent },
});
