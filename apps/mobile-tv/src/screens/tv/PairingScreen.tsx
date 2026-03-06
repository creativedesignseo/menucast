import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { usePairing } from '../../hooks/usePairing'

type Props = { onPaired: (screenId: string) => void }

export function PairingScreen({ onPaired }: Props) {
  const { code, setCode, loading, error, pair } = usePairing(onPaired)

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>MenuCast</Text>

      <View style={styles.card}>
        <Text style={styles.title}>Vincular pantalla</Text>
        <Text style={styles.subtitle}>
          Ve al dashboard, crea una pantalla y copia el codigo de 6 caracteres
        </Text>

        <TextInput
          style={styles.input}
          value={code}
          onChangeText={t => setCode(t.toUpperCase())}
          placeholder="ABC123"
          placeholderTextColor="#555"
          autoCapitalize="characters"
          maxLength={8}
          autoFocus
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={pair}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.buttonText}>Vincular</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Dashboard: menucast.app/dashboard/screens
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  logo: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    letterSpacing: -1,
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 40,
    width: 480,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#0a0a0a',
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    padding: 18,
    width: '100%',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#333',
    marginBottom: 12,
  },
  error: {
    color: '#ff4444',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  hint: {
    color: '#444',
    fontSize: 12,
    marginTop: 32,
  },
})
