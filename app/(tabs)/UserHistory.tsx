import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { fetchAccessLogs } from '@/api/vehicleAPI';
import { AccessLog } from '@/types/Vehicle';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState<'history' | 'profile' | 'payments'>('history');
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [search, setSearch] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [countdown, setCountdown] = useState(10);
  const navigation = useNavigation();
  const [paymentType, setPaymentType] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isHappy, setIsHappy] = useState<boolean | null>(null);
  const [comments, setComments] = useState('');
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
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

  const loadProfile = async () => {
    const savedName = await AsyncStorage.getItem('user_name');
    const savedPlate = await AsyncStorage.getItem('user_plate');
    const savedImage = await AsyncStorage.getItem('user_image');

    if (savedName) setName(savedName);
    if (savedPlate) setPlate(savedPlate);
    if (savedImage) setProfileImage(savedImage);
  };
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem('user_name', name);
      await AsyncStorage.setItem('user_plate', plate);
      if (profileImage) {
        await AsyncStorage.setItem('user_image', profileImage);
      }
      Alert.alert('✅ Succes', 'Profil salvat cu succes!');
    } catch (e) {
      Alert.alert('❌ Eroare', 'A apărut o eroare la salvare.');
    }
  };
  
  const clearUserData = async () => {
    console.log("Am apasat resetare.");
  
    const confirm = window.confirm('Ești sigur că vrei să ștergi toate datele personale?');
  
    if (!confirm) return;
  
    try {
      await AsyncStorage.multiRemove([
        'user_name',
        'user_plate',
        'user_image',
        'payment_history',
      ]);
  
      setName('');
      setPlate('');
      setProfileImage(null);
      setPaymentHistory([]);
  
      alert('✅ Datele au fost șterse cu succes!');
    } catch (err) {
      console.error('Eroare la ștergere:', err);
      alert('❌ Nu s-au putut șterge datele.');
    }
  };
  
  const renderDateInput = (
    label: string,
    date: Date | null,
    setDate: React.Dispatch<React.SetStateAction<Date | null>>,
    showPicker: () => void,
    isWeb: boolean,
    id: string
  ) => {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.input}>
          <Text style={styles.label}>{label}</Text>
          <input
            id={id}
            type="date"
            value={date ? moment(date).format('YYYY-MM-DD') : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                setDate(new Date(val));
              } else {
                setDate(null);
              }
            }}
            style={{ border: 'none', backgroundColor: 'transparent', fontSize: 16 }}
          />
        </View>
      );
    }
  
    return (
      <TouchableOpacity onPress={showPicker} style={styles.input}>
        <Text>{date ? moment(date).format('YYYY-MM-DD') : `📅 ${label} (selectează data)`}</Text>
      </TouchableOpacity>
    );
  };
  
  
  
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };
  const loadPaymentHistory = async () => {
    const stored = await AsyncStorage.getItem('payment_history');
    if (stored) {
      setPaymentHistory(JSON.parse(stored));
    }
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
      load();
      interval = setInterval(load, 10000);
    }

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      loadPaymentHistory();
    }
  }, [isAuthenticated]);

  const filtered = logs.filter((log) => {
    const logDate = moment(log.accessTime);
    const matchPlate = log.licensePlate.toLowerCase().includes(search.toLowerCase()) &&
                       log.licensePlate.toLowerCase() === plate.toLowerCase();
    const matchFrom = fromDate ? logDate.isSameOrAfter(moment(fromDate), 'day') : true;
    const matchTo = toDate ? logDate.isSameOrBefore(moment(toDate), 'day') : true;
  
    return matchPlate && matchFrom && matchTo;
  });
  
  
  
  
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

  const handleSubmitSurvey = async () => {
    if (!paymentType || !paymentAmount || isHappy === null) {
      Alert.alert('❗ Incomplet', 'Te rugăm să completezi toate câmpurile obligatorii.');
      return;
    }
  
    const newEntry = {
      paymentType,
      paymentAmount,
      isHappy,
      comments,
      date: new Date().toISOString(),
    };
  
    try {
      const existing = await AsyncStorage.getItem('payment_history');
      const history = existing ? JSON.parse(existing) : [];
      const updated = [newEntry, ...history];
      await AsyncStorage.setItem('payment_history', JSON.stringify(updated));
      setPaymentHistory(updated);
  
      Alert.alert('✅ Mulțumim!', 'Răspunsul tău a fost înregistrat.');
  
      // Resetare form
      setPaymentType('');
      setPaymentAmount('');
      setIsHappy(null);
      setComments('');
    } catch (e) {
      Alert.alert('❌ Eroare', 'Nu s-a putut salva plata.');
    }
  };
  

  return (
    <ScrollView style={styles.container}>
      {/* 🔻 Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabItem, activeTab === 'history' && styles.activeTab]}>📥</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('profile')}>
          <Text style={[styles.tabItem, activeTab === 'profile' && styles.activeTab]}>🧑‍💼</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('payments')}>
          <Text style={[styles.tabItem, activeTab === 'payments' && styles.activeTab]}>💳</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout}>
        <Text style={styles.tabItem}>🚪Logout</Text>
         </TouchableOpacity>
      </View>


      {/* 🔻 Tabs */}
      {activeTab === 'history' && (
        <>
        <View style={styles.sectionCard}>
          <Text style={styles.title}>📥 Istoric Acces</Text>
          
            <Text style={styles.label}>🔍 Filtrare după interval</Text>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              {renderDateInput(
                'De la',
                fromDate,
                setFromDate,
                () => setShowFromPicker(true),
                Platform.OS === 'web',
                'from-date'
              )}
            </View>
            <View style={{ flex: 1 }}>
              {renderDateInput(
                'Până la',
                toDate,
                setToDate,
                () => setShowToPicker(true),
                Platform.OS === 'web',
                'to-date'
              )}
            </View>
          </View>

            {(fromDate || toDate) && (
              <TouchableOpacity onPress={() => { setFromDate(null); setToDate(null); }} style={styles.deleteButton}>
                <Text style={styles.deleteText}>🔄 Resetare interval</Text>
              </TouchableOpacity>
            )}
          {filtered.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.plate}>🚗 {item.licensePlate}</Text>
              <Text style={styles.time}>
                {moment(item.accessTime).format('YYYY-MM-DD HH:mm')}
              </Text>
            </View>
          ))}
          </View>
        </>
      )}

      {activeTab === 'profile' && (
        <>
        <View style={styles.sectionCard}>
          <Text style={styles.title}>🧑‍💼 Profilul Meu</Text>

          <TouchableOpacity onPress={pickImage}>
            <Image
              source={{
                uri: profileImage || 'https://placehold.co/100x100',
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Nume complet"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Număr mașină"
            value={plate}
            onChangeText={setPlate}
          />

          <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
            <Text style={styles.saveText}>💾 Salvează</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearUserData} style={styles.deleteButton}>
          <Text style={styles.deleteText}>🗑️ Resetare date personale</Text>
          </TouchableOpacity>
          </View>



        </>
      )}

{activeTab === 'payments' && (
  <>
    <View style={styles.sectionCard}>
      <Text style={styles.title}>💳 Chestionar Plată</Text>

      <Text style={styles.label}>1️⃣ Tipul parcării</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: parcare subterană, stradală..."
        value={paymentType}
        onChangeText={setPaymentType}
      />

      <Text style={styles.label}>2️⃣ Suma plătită</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 15 RON"
        value={paymentAmount}
        onChangeText={setPaymentAmount}
        keyboardType="numeric"
      />

      <Text style={styles.label}>3️⃣ Ai fost mulțumit?</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.optionButton, isHappy === true && styles.selectedOption]}
          onPress={() => setIsHappy(true)}
        >
          <Text>✅ Da</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionButton, isHappy === false && styles.selectedOption]}
          onPress={() => setIsHappy(false)}
        >
          <Text>❌ Nu</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>4️⃣ Alte comentarii</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        multiline
        placeholder="Feedback opțional..."
        value={comments}
        onChangeText={setComments}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSubmitSurvey}>
        <Text style={styles.saveText}>📤 Trimite</Text>
      </TouchableOpacity>
    </View>

    {/* Istoric Plăți */}
    <View style={styles.sectionCard}>
      <Text style={styles.title}>🧾 Istoric Plăți</Text>
      {paymentHistory.length === 0 && (
        <Text style={{ color: '#666', textAlign: 'center' }}>Nu există plăți înregistrate.</Text>
      )}
      {paymentHistory.map((entry, index) => (
        <View key={index} style={styles.item}>
          <Text style={styles.plate}>📅 {moment(entry.date).format('YYYY-MM-DD HH:mm')}</Text>
          <Text>💰 {entry.paymentAmount} RON – {entry.paymentType}</Text>
          <Text>{entry.isHappy ? '👍 Mulțumit' : '👎 Nemulțumit'}</Text>
          {entry.comments ? <Text>✍️ {entry.comments}</Text> : null}
        </View>
      ))}
    </View>

      {showFromPicker && (
    <DateTimePicker
      value={fromDate || new Date()}
      mode="date"
      display="default"
      onChange={(event, selectedDate) => {
        setShowFromPicker(false);
        if (selectedDate) setFromDate(selectedDate);
      }}
    />
  )}

  {showToPicker && (
    <DateTimePicker
      value={toDate || new Date()}
      mode="date"
      display="default"
      onChange={(event, selectedDate) => {
        setShowToPicker(false);
        if (selectedDate) setToDate(selectedDate);
      }}
    />
  )}
    </>
  )}


    </ScrollView>
  );
};

export default UserDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 8,
  },
  tabItem: {
    fontSize: 24,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderColor: '#10b981',
    paddingBottom: 4,
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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

  saveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 16,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  optionButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  sectionCard: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  
  
});
