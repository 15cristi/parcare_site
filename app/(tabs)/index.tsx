import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { loginUser } from '@/api/vehicleAPI';
import { checkAdmin } from '@/api/vehicleAPI';
import * as base64 from 'base-64';
const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    const result = await loginUser(username, password);
  
    if (result) {
      const { role } = result;
      Alert.alert('Succes', 'Te-ai autentificat cu succes!');
      navigation.navigate(role === 'ADMIN' ? 'Dashboard' : 'UserHistory');
    } else {
      Alert.alert('Eroare', 'Utilizator sau parolă greșită.');
    }
  };
  
  


  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔐 Autentificare</Text>

      <TextInput
        placeholder="Username"
        style={styles.input}
        onChangeText={setUsername}
        value={username}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Parolă"
        style={styles.input}
        onChangeText={setPassword}
        value={password}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#e5e7eb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
