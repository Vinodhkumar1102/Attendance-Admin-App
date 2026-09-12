import React, {useEffect, useState} from 'react';
import {SafeAreaView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ADMIN_NOTIFICATIONS_ENABLED_KEY = 'admin_notifications_enabled';

const AdminNotificationSettingsScreen = ({onBack}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ADMIN_NOTIFICATIONS_ENABLED_KEY)
      .then(value => setNotificationsEnabled(value !== 'false'))
      .catch(() => setNotificationsEnabled(true));
  }, []);

  const toggleNotifications = async enabled => {
    setNotificationsEnabled(enabled);
    try {
      await AsyncStorage.setItem(ADMIN_NOTIFICATIONS_ENABLED_KEY, String(enabled));
    } catch (error) {
      // Keep the selected preference active for this session if storage is unavailable.
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.title}>Notification Settings</Text>
        <View style={styles.spacer} />
      </View>
      <View style={styles.content}>
        <View style={styles.settingCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={22} color="#1D4ED8" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.settingTitle}>Admin Notifications</Text>
            <Text style={styles.settingDescription}>
              {notificationsEnabled ? 'Receive employee leave request notifications.' : 'Admin notifications are turned off.'}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{false: '#D1D5DB', true: '#A8C7FF'}}
            thumbColor={notificationsEnabled ? '#1D4ED8' : '#F4F4F5'}
            accessibilityLabel="Turn admin notifications on or off"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F7F9FC'},
  header: {height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16},
  backButton: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
  title: {flex: 1, textAlign: 'center', color: '#202633', fontSize: 19, fontWeight: '800'},
  spacer: {width: 32},
  content: {padding: 16},
  settingCard: {minHeight: 82, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E1E7F0', backgroundColor: '#FFFFFF'},
  iconWrap: {width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2FF'},
  textWrap: {flex: 1, marginHorizontal: 12},
  settingTitle: {color: '#1F2A44', fontSize: 14, fontWeight: '800'},
  settingDescription: {marginTop: 4, color: '#71809C', fontSize: 11, lineHeight: 16},
});

export default AdminNotificationSettingsScreen;
