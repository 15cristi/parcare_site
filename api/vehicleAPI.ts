// vehicleAPI.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as base64 from 'base-64';

export type AccessLog = {
  id: number;
  licensePlate: string;
  accessTime: string;
};

export type Vehicle = {
  id: number;
  licensePlate: string;
  entryTime: string;
};

export type UserProfile = {
  fullName: string;
  licensePlate: string;
  profileImageUrl: string;
};

export const loginUser = async (username: string, password: string): Promise<{ token: string; role: string } | null> => {
  try {
    const res = await fetch('http://192.168.1.131:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) return null;

    const data = await res.json();

    const token = base64.encode(`${username}:${password}`);
    await AsyncStorage.setItem('auth', token);
    await AsyncStorage.setItem('role', data.role);

    return { token, role: data.role };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
};


// 🔑 Obține header cu token
const getAuthHeader = async (): Promise<{ [key: string]: string }> => {
  const token = await AsyncStorage.getItem('auth');
  return token ? { Authorization: `Basic ${token}` } : {};
};

// 🚘 Fetch vehicles
export const fetchVehicles = async (): Promise<Vehicle[]> => {
  try {
    const headers = await getAuthHeader();
    const response = await fetch('http://192.168.1.131:8080/api/vehicles', { headers });

    if (!response.ok) throw new Error('Eroare la fetch vehicule');
    return await response.json();
  } catch (error) {
    console.error('[EROARE] Nu s-au putut lua datele:', error);
    return [];
  }
};

// 🗑 Delete vehicle
export const deleteVehicle = async (id: number): Promise<void> => {
  const headers = await getAuthHeader();
  const res = await fetch(`http://192.168.1.131:8080/api/vehicles/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    throw new Error('Eroare la ștergerea vehiculului');
  }
};

// ➕ Add vehicle
export const addVehicle = async (licensePlate: string): Promise<void> => {
  const headers = await getAuthHeader();
  const res = await fetch('http://192.168.1.131:8080/api/vehicles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ license_plate: licensePlate }),
  });

  if (!res.ok) {
    throw new Error('Eroare la adăugarea vehiculului');
  }
};

// 📄 Fetch access logs
export const fetchAccessLogs = async (): Promise<AccessLog[]> => {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('http://192.168.1.131:8080/api/access', { headers });

    if (!res.ok) throw new Error('Error fetching access logs');
    return await res.json();
  } catch (error) {
    console.error('[EROARE] Nu s-au putut lua acces log-urile:', error);
    return [];
  }
};


export const checkAdmin = async (encoded: string): Promise<boolean> => {
  try {
    const res = await fetch('http://192.168.1.131:8080/api/admin/test', {
      headers: {
        Authorization: `Basic ${encoded}`,
      },
    });

    return res.ok;
  } catch {
    return false;
  }
};

export const fetchUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('http://192.168.1.131:8080/api/user/profile', {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      console.error('❌ Eroare la preluarea profilului');
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error('[EROARE] fetchUserProfile:', error);
    return null;
  }
};


export const updateUserProfile = async (profile: UserProfile): Promise<boolean> => {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('http://192.168.1.131:8080/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(profile),
    });

    return res.ok;
  } catch (error) {
    console.error('[EROARE] updateUserProfile:', error);
    return false;
  }
};

export const clearUserProfileData = async (): Promise<boolean> => {
  try {
    const headers = await getAuthHeader();
    const res = await fetch('http://192.168.1.131:8080/api/user/profile', {
      method: 'DELETE',
      headers,
    });

    return res.ok;
  } catch (error) {
    console.error('[EROARE] clearUserProfileData:', error);
    return false;
  }
};

// vehicleAPI.ts

export const fetchParkingStatus = async () => {
  try {
    const res = await fetch('http://192.168.1.131:8080/api/parking-status');
    return await res.json(); // { slot1: 0, slot2: 1 }
  } catch (err) {
    console.error('Eroare la fetchParkingStatus:', err);
    return null;
  }
};
