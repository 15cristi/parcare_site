import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import moment from 'moment';
import { fetchAccessLogs } from '@/api/vehicleAPI';
import { AccessLog } from '@/types/Vehicle';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const UserHistory = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [search, setSearch] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [countdown, setCountdown] = useState(10);
  const navigation = useNavigation();

  const handleLogout = async () => {
    await AsyncStorage.removeItem('auth');
    setIsAuthenticated(false);
    setTimeout(() => {
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'index' }],
        });
      }, 100); 
  };
  
   
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('auth');
      setIsAuthenticated(!!token);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      const timeout = setTimeout(() => {
        (navigation as any).navigate('index');
      }, 10000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
  
    const load = async () => {
      const data = await fetchAccessLogs();
      setLogs(data);
    };
  
    if (isAuthenticated) {
      load(); // fetch imediat
      interval = setInterval(load, 10000); // apoi din 10 în 10 secunde
    }
  
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const filtered = logs.filter((log) =>
    log.licensePlate.toLowerCase().includes(search.toLowerCase())
  );

  if (isAuthenticated === null) {
    return (
      <View style={styles.container}>
        <Text>Se verifică autentificarea...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          ❌ Trebuie să fii autentificat pentru a accesa această pagină.{"\n"}
          Vei fi redirecționat automat în {countdown} secunde...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📥 Istoric Acces</Text>
  
      <TextInput
        style={styles.input}
        placeholder="Caută număr înmatriculare..."
        value={search}
        onChangeText={setSearch}
      />
  
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Logout</Text>
      </TouchableOpacity>
  
      {filtered.map((item) => (
        <View key={item.id} style={styles.item}>
          <Text style={styles.plate}>🚗 {item.licensePlate}</Text>
          <Text style={styles.time}>
            {moment(item.accessTime).format('YYYY-MM-DD HH:mm')}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
  
};

export default UserHistory;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  plate: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  time: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});