import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { NavigationContainer } from '@react-navigation/native'
import { Text } from 'react-native'
import { ScreensScreen } from './ScreensScreen'
import { ContentScreen } from './ContentScreen'
import { PlaylistsScreen } from './PlaylistsScreen'

const Tab = createBottomTabNavigator()

function Icon({ symbol }: { symbol: string }) {
  return <Text style={{ fontSize: 20 }}>{symbol}</Text>
}

export function TabNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#111',
          tabBarInactiveTintColor: '#aaa',
          tabBarStyle: { borderTopColor: '#eee' },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tab.Screen
          name="Pantallas"
          component={ScreensScreen}
          options={{ tabBarIcon: ({ color }) => <Icon symbol="📺" /> }}
        />
        <Tab.Screen
          name="Contenido"
          component={ContentScreen}
          options={{ tabBarIcon: ({ color }) => <Icon symbol="🖼" /> }}
        />
        <Tab.Screen
          name="Playlists"
          component={PlaylistsScreen}
          options={{ tabBarIcon: ({ color }) => <Icon symbol="▶" /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
