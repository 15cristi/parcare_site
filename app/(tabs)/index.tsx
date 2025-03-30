import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { loginUser } from '@/api/vehicleAPI';

const CustomCheckBox = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <TouchableOpacity style={styles.checkboxContainer} onPress={onChange}>
    <View style={[styles.checkbox, checked && styles.checked]} />
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigation = useNavigation<any>();

  useEffect(() => {
    const loadUserData = async () => {
      const storedUsername = await AsyncStorage.getItem('username');
      const storedPassword = await AsyncStorage.getItem('password');
      const storedStaySignedIn = await AsyncStorage.getItem('staySignedIn');

      if (storedStaySignedIn === 'true') {
        setUsername(storedUsername || '');
        setPassword(storedPassword || '');
        setStaySignedIn(true);
      }
    };
    loadUserData();
  }, []);

  const handleLogin = async () => {
    const result = await loginUser(username, password);

    if (result) {
      const { role } = result;
      if (Platform.OS !== 'web') {
        Alert.alert('Succes', 'Te-ai autentificat cu succes!');
      }

      if (staySignedIn) {
        await AsyncStorage.setItem('username', username);
        await AsyncStorage.setItem('password', password);
        await AsyncStorage.setItem('staySignedIn', 'true');
      } else {
        await AsyncStorage.removeItem('username');
        await AsyncStorage.removeItem('password');
        await AsyncStorage.setItem('staySignedIn', 'false');
      }

      navigation.navigate(role === 'ADMIN' ? 'Dashboard' : 'UserHistory');
    } else {
      const message = 'Utilizator sau parolă greșită.';
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(''), 5000);
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
      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Parolă"
          style={styles.passwordInput}
          onChangeText={setPassword}
          value={password}
          secureTextEntry={!showPassword}
        />
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <CustomCheckBox
        checked={showPassword}
        onChange={() => setShowPassword(!showPassword)}
        label="Afișează parola"
      />

      <CustomCheckBox
        checked={staySignedIn}
        onChange={() => setStaySignedIn(!staySignedIn)}
        label="Salveaza datele"
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 4,
  },
  checked: {
    backgroundColor: '#3b82f6',
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
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
  errorText: {
    color: 'red',
    marginBottom: 16,
    marginLeft: 8,
  },
});