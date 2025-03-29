import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export default function Layout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'Administrare Parcare';
    }
  }, []);
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        
      }}



      
    />
  );
}
