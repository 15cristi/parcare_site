import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchVehicles, deleteVehicle, addVehicle, fetchAccessLogs } from '@/api/vehicleAPI';
import { Vehicle, AccessLog } from '@/types/Vehicle';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { BarChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { Platform } from 'react-native';

const Dashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeMode, setActiveMode] = useState<'7days' | 'month' | 'year'>('month');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [newPlate, setNewPlate] = useState('');
  const [history, setHistory] = useState<AccessLog[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [chartData, setChartData] = useState<{ labels: string[]; values: number[] }>({ labels: [], values: [] });
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('MM'));
  const [selectedYear, setSelectedYear] = useState(moment().format('YYYY'));
  const [countdown, setCountdown] = useState(5);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'history' | 'stats'>('vehicles');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const navigation = useNavigation();
  const [showDropdown, setShowDropdown] = useState(false);
  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('auth');
    setIsAuthenticated(!!token);
  };

  useEffect(() => {
    if (isAuthenticated === false) {
      setCountdown(5);
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      const timeout = setTimeout(() => {
        (navigation as any).navigate('index');
      }, 5000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isAuthenticated]);

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

  const loadVehicles = async () => {
    const data = await fetchVehicles();
    setVehicles(data);
  };

  const loadHistory = async () => {
    const logs = await fetchAccessLogs();
    setHistory(logs);
    groupChartData(logs, activeMode);
  };

  const groupChartData = (data: AccessLog[], mode: 'month' | 'year' | '7days') => {
    const counts: { [key: string]: number } = {};
    data.forEach((log) => {
      const date = moment(log.accessTime);
      let key = '';
      if (mode === '7days') {
        if (moment().diff(date, 'days') < 7) {
          key = date.format('DD MMM');
        }
      } else if (mode === 'month') {
        if (date.format('MM') === selectedMonth && date.format('YYYY') === selectedYear) {
          key = date.format('DD MMM');
        }
      } else if (mode === 'year') {
        if (date.format('YYYY') === selectedYear) {
          key = date.format('MMM');
        }
      }
      if (key) {
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    const labels = Object.keys(counts).sort((a, b) => moment(a, 'DD MMM').diff(moment(b, 'DD MMM')));
    const values = labels.map((label) => counts[label]);
    const today = moment().format('DD MMM');
    const decoratedLabels = labels.map(label => {
      if (mode === '7days' || mode === 'month') {
        return label === today ? `🔴 ${label}` : label;
      } else if (mode === 'year') {
        return label === moment().format('MMM') ? `🔴 ${label}` : label;
      }
      return label;
    });
    setChartData({ labels: decoratedLabels, values });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const initialLoad = async () => {
      await loadVehicles();
      await loadHistory();
    };
    initialLoad();
    const interval = setInterval(() => {
      loadVehicles();
      loadHistory();
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, selectedMonth, selectedYear]);

  const handleAddVehicle = async () => {
    if (!newPlate.trim()) return;
    try {
      await addVehicle(newPlate);
      await loadVehicles();
      await loadHistory();
      setNewPlate('');
    } catch (err) {
      Alert.alert('Eroare', 'A apărut o problemă la adăugarea vehiculului.');
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    try {
      await deleteVehicle(id);
      await loadVehicles();
    } catch (err) {
      Alert.alert('Eroare', 'A apărut o problemă la ștergerea vehiculului.');
    }
  };

  const filteredVehicles = vehicles.filter((v) =>
    v.licensePlate.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  const filteredHistory = history.filter((h) => {
    const logDate = moment(h.accessTime);
    const matchPlate = h.licensePlate.toLowerCase().includes(historySearch.toLowerCase());
    const matchFrom = fromDate ? logDate.isSameOrAfter(moment(fromDate), 'day') : true;
    const matchTo = toDate ? logDate.isSameOrBefore(moment(toDate), 'day') : true;
    return matchPlate && matchFrom && matchTo;
  });

  const totalEntries = chartData.values.reduce((acc, val) => acc + val, 0);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Se verifică autentificarea...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: 'white', textAlign: 'center' }}>
          ❌ Trebuie să fii autentificat pentru a accesa această pagină.{"\n"}
          Vei fi redirecționat automat în {countdown} secunde...
        </Text>
      </View>
    );
  }


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
        <View style={{ marginBottom: 8,flex: 1 }}>
          <Text>{label}</Text>
          <input
            type="date"
            id={id}
            value={date ? moment(date).format('YYYY-MM-DD') : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val) setDate(new Date(val));
              else setDate(null);
            }}
            style={{ padding: 8, borderRadius: 8, borderColor: '#ccc', borderWidth: 1 }}
          />
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={showPicker} style={{ padding: 12, backgroundColor: '#eee', borderRadius: 8, marginBottom: 12 }}>
        <Text>{date ? moment(date).format('YYYY-MM-DD') : `📅 ${label} (selectează data)`}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '80%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Adaugă vehicul</Text>
            <TextInput
              style={styles.searchBar}
              placeholder="Număr înmatriculare"
              value={newPlate}
              onChangeText={setNewPlate}
            />
            <TouchableOpacity onPress={async () => { await handleAddVehicle(); setModalVisible(false); }} style={[styles.addButton, { marginTop: 10 }]}>
              <Text style={styles.addButtonText}>Salvează</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.refreshButton, { marginTop: 10 }]}>
              <Text style={styles.refreshButtonText}>Anulează</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.container2}>
        

      
        

        {/* 🔻 Icon Menu Tabs */}
        <View style={styles.iconBar}>
          <TouchableOpacity onPress={() => setActiveTab('vehicles')} style={activeTab === 'vehicles' && styles.activeTab}>
            <Text style={styles.icon}>🚘</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('history')} style={activeTab === 'history' && styles.activeTab}>
            <Text style={styles.icon}>📥</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('stats')} style={activeTab === 'stats' && styles.activeTab}>
            <Text style={styles.icon}>📈</Text>
          </TouchableOpacity>
                  <TouchableOpacity onPress={handleLogout}>
                  <Text style={styles.tabItem}>🚪Logout</Text>
                   </TouchableOpacity>
        </View>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/favicon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>AI-ParkControl</Text>
        </View>

        {/* 🔻 Tabs */}
        {activeTab === 'vehicles' && (
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚘 Mașini înregistrate în baza de date</Text>
          <View style={[styles.buttonRow, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Adaugă</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={loadVehicles} style={styles.refreshButton}>
                <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        
          <TextInput
            style={styles.searchBar}
            placeholder="Caută număr înmatriculare..."
            value={vehicleSearch}
            onChangeText={setVehicleSearch}
          />
        
          {filteredVehicles.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.itemInfo}>
                <Image
                  source={require('../../assets/images/favicon.png')}
                  style={styles.logoSmall}
                  resizeMode="contain"
                />
                <View>
                  <Text style={styles.boldText}>{item.licensePlate}</Text>
                  {item.entryTime && (
                    <Text style={styles.historySubText}>
                      Înregistrat la: {new Date(item.entryTime).toLocaleString('ro-RO')}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteVehicle(item.id)}
              >
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        
        )}

        {activeTab === 'history' && (
          
          <ScrollView style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>📥 Istoric Acces - Admin</Text>

      <TextInput
        placeholder="Caută număr înmatriculare..."
        value={historySearch}
        onChangeText={setHistorySearch}
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 }}
      />

      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {renderDateInput('De la', fromDate, setFromDate, () => setShowFromPicker(true), Platform.OS === 'web', 'from-date')}
        {renderDateInput('Până la', toDate, setToDate, () => setShowToPicker(true), Platform.OS === 'web', 'to-date')}
      </View>

      {(fromDate || toDate) && (
        <TouchableOpacity onPress={() => { setFromDate(null); setToDate(null); }} style={{ backgroundColor: '#ef4444', padding: 10, borderRadius: 8, marginBottom: 16 }}>
          <Text style={{ color: 'white', textAlign: 'center' }}>🔄 Resetare interval</Text>
        </TouchableOpacity>
      )}

      {filteredHistory.map((item) => (
        <View key={item.id} style={{ backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 10 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{item.licensePlate}</Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>Ora acces: {moment(item.accessTime).format('YYYY-MM-DD HH:mm')}</Text>
        </View>
      ))}

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
    </ScrollView>
       
       
        )}

        {activeTab === 'stats' && (
          <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Statistici intrări</Text>
        
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={() => { setActiveMode('7days'); groupChartData(history, '7days'); }} style={[styles.addButton, activeMode === '7days' && styles.activeButton]}>
              <Text style={styles.addButtonText}>Ultimele 7 zile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setActiveMode('month'); groupChartData(history, 'month'); }} style={[styles.refreshButton, activeMode === 'month' && styles.activeButton]}>
              <Text style={styles.refreshButtonText}>Pe lună</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setActiveMode('year'); groupChartData(history, 'year'); }} style={[styles.refreshButton, activeMode === 'year' && styles.activeButton]}>
              <Text style={styles.refreshButtonText}>Pe an</Text>
            </TouchableOpacity>
          </View>
        
          {activeMode === 'month' && (
            <View style={styles.buttonRow}>
              <TextInput
                style={styles.inputHalf}
                placeholder="Lună (ex: 01)"
                value={selectedMonth}
                onChangeText={setSelectedMonth}
                keyboardType="numeric"
                maxLength={2}
              />
              <TextInput
                style={styles.inputHalf}
                placeholder="An (ex: 2024)"
                value={selectedYear}
                onChangeText={setSelectedYear}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          )}
        
          {activeMode === 'year' && (
            <View style={styles.buttonRow}>
              <TextInput
                style={styles.inputHalf}
                placeholder="An (ex: 2024)"
                value={selectedYear}
                onChangeText={setSelectedYear}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          )}
        
          <Text style={{ marginBottom: 10 }}>📊 Total intrări: <Text style={{ fontWeight: 'bold' }}>{totalEntries}</Text></Text>
        
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              withCustomBarColorFromData={true}
              data={{
                labels: chartData.labels,
                datasets: [{
                  data: chartData.values,
                  colors: chartData.labels.map(label =>
                    label.includes('🔴')
                      ? (opacity = 1) => `rgba(255, 99, 132, ${opacity})`
                      : (opacity = 1) => `rgba(76, 175, 80, ${opacity})`
                  )
                }],
              }}
              width={Math.max(Dimensions.get('window').width, chartData.labels.length * 60)}
              height={220}
              fromZero
              withInnerLines
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                labelColor: () => '#333',
              }}
              style={{ borderRadius: 16 }}
            />
          </ScrollView>
        
          <Text style={{ fontSize: 12, marginTop: 8, color: '#666', textAlign: 'center' }}>
            🔴 = Ziua/Luna curentă evidențiată
          </Text>
        </View>
        
        )}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  datePickerText: {
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderRadius: 8,
    color: '#333',
    marginBottom: 12,
  },
  iconBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  icon: {
    fontSize: 28,
    color: '#333',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderColor: '#22c55e',
    paddingBottom: 4,
  },
  container: {
    padding: 20,
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  inputHalf: {
    flex: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: 'black',
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  activeButton: {
    borderWidth: 2,
    borderColor: '#000000aa',
  },
  searchBar: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 30,
    marginRight: 6,
  },
  boldText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 50,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 16,
  },
  historyItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  historyText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  historySubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderColor: 'black',
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoWrapper: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 90,
    height: 90,
    marginRight: 12,
  },
  
  logoText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'black',
  },
  container2: {
    padding: 16,
    backgroundColor: '#fff',
    flex: 1,
  },
  logoSmall: {
    width: 80,
    height: 80,
    marginRight: 12,
  },
  tabItem: {
    fontSize: 24,
  },
});


export default Dashboard;
