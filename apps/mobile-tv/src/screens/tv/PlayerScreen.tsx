import { View, Image, StyleSheet, Text } from 'react-native'
import { Video, ResizeMode } from 'expo-av'
import { usePlayer } from '../../hooks/usePlayer'

type Props = { screenId: string }

export function PlayerScreen({ screenId }: Props) {
  const { currentItem, totalItems, currentIndex } = usePlayer(screenId)

  if (totalItems === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.logo}>MenuCast</Text>
        <Text style={styles.emptyText}>Sin contenido asignado</Text>
        <Text style={styles.emptySubtext}>
          Asigna una playlist desde el panel de control
        </Text>
      </View>
    )
  }

  if (!currentItem?.content_item) return null

  const { type, storage_url } = currentItem.content_item

  return (
    <View style={styles.container}>
      {type === 'image' ? (
        <Image
          key={`${currentIndex}-${storage_url}`}
          source={{ uri: storage_url }}
          style={styles.media}
          resizeMode="contain"
        />
      ) : (
        <Video
          key={`${currentIndex}-${storage_url}`}
          source={{ uri: storage_url }}
          style={styles.media}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  media: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  logo: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 24,
    letterSpacing: -1,
  },
  emptyText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
})
