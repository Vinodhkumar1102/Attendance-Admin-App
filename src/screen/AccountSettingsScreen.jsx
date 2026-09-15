import React, {useEffect, useState} from 'react';
import {
  Alert,
  Image,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const API_BASE_URL = 'https://attendance-backend-11.onrender.com';

const settings = [
  {label: 'Themes', icon: 'color-palette-outline'},
  {label: 'Notification Settings', icon: 'notifications-outline'},
  {label: 'About Us', icon: 'information-circle-outline'},
  {label: 'Contact Us', icon: 'call-outline'},
  {label: 'Terms & Conditions', icon: 'document-text-outline'},
  {label: 'Logout', icon: 'log-out-outline'},
];

const getImageUri = avatar => {
  if (!avatar) return null;
  if (avatar.uri) return avatar.uri;
  return avatar.path?.startsWith('http') ? avatar.path : `${API_BASE_URL}${avatar.path}`;
};

const AccountSettingsScreen = ({onBack, adminToken, onOpenAboutUs, onOpenContactUs, onOpenTerms, onOpenNotificationSettings, onLogout, themeMode = 'light', onToggleTheme, activeSetting, onActiveSettingChange}) => {
  const [profile, setProfile] = useState({companyName: 'Admin User', managerName: 'Company Manager', avatar: null, activeSetting: null});

  useEffect(() => {
    const loadProfile = async () => {
      if (!adminToken) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/company-profile`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to load company profile');
        setProfile({
          companyName: result.companyName || 'Admin User',
          managerName: result.managerName || 'Company Manager',
          avatar: result.avatar || null,
          activeSetting: null,
        });
      } catch (error) {
        // Keep the default profile display if the company profile is unavailable.
      }
    };

    loadProfile();
  }, [adminToken]);

  const avatarUri = getImageUri(profile.avatar);
  const initials = profile.companyName?.trim()?.slice(0, 2).toUpperCase() || 'AU';
  const selectedSetting = activeSetting ?? profile.activeSetting;

  const handleSettingPress = setting => {
    setProfile(current => ({...current, activeSetting: setting.label}));
    onActiveSettingChange?.(setting.label);

    if (setting.label === 'Themes') {
      onToggleTheme?.();
    }
    if (setting.label === 'Notification Settings') {
      onOpenNotificationSettings?.();
    }
    if (setting.label === 'About Us') {
      onOpenAboutUs?.();
    }
    if (setting.label === 'Contact Us') {
      onOpenContactUs?.();
    }
    if (setting.label === 'Terms & Conditions') {
      onOpenTerms?.();
    }
    if (setting.label === 'Logout') {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {text: 'No', style: 'cancel'},
          {text: 'Yes', style: 'destructive', onPress: () => onLogout?.()},
        ],
      );
    }
  };

  return (
    <View style={[styles.container, themeMode === 'dark' && styles.darkContainer]}>
      <View style={[styles.header, themeMode === 'dark' && styles.darkHeader]}>
        <TouchableOpacity style={[styles.backButton, themeMode === 'dark' && styles.darkSurface]} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={themeMode === 'dark' ? '#F4F7FC' : '#202633'} />
        </TouchableOpacity>
        <Text style={[styles.title, themeMode === 'dark' && styles.darkText]}>Account Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.profileRow, themeMode === 'dark' && styles.darkSurface]}>
        <View style={styles.avatar}>
          {avatarUri ? <Image source={{uri: avatarUri}} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initials}</Text>}
        </View>
        <View style={styles.profileText}>
          <Text style={[styles.profileName, themeMode === 'dark' && styles.darkText]}>{profile.companyName}</Text>
          <Text style={[styles.profileRole, themeMode === 'dark' && styles.darkMutedText]}>{profile.managerName || 'Company Manager'}</Text>
        </View>
      </View>

      <View style={[styles.settingsCard, themeMode === 'dark' && styles.darkSurface]}>
        {settings.map(setting => (
          <TouchableOpacity
            key={setting.label}
            style={[styles.settingRow, selectedSetting === setting.label && styles.activeSettingRow]}
            activeOpacity={0.8}
            onPress={() => handleSettingPress(setting)}
          >
            <Ionicons name={setting.icon} size={20} color={selectedSetting === setting.label ? '#FFFFFF' : themeMode === 'dark' ? '#AFC4FF' : '#5269A6'} />
            <Text style={[styles.settingLabel, themeMode === 'dark' && styles.darkText, selectedSetting === setting.label && styles.activeSettingLabel]}>{setting.label}{setting.label === 'Themes' ? ` (${themeMode === 'dark' ? 'Dark' : 'Light'})` : ''}</Text>
            <Ionicons name="chevron-forward" size={18} color={selectedSetting === setting.label ? '#FFFFFF' : '#98A1B3'} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default AccountSettingsScreen;

const styles = StyleSheet.create({
  container: {paddingHorizontal: 8, paddingBottom: 18},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 10, marginTop: 12},
  backButton: {width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  title: {flex: 1, fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#000000'},
  headerSpacer: {width: 32},
  profileRow: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginTop: 12, padding: 10, borderRadius: 9, backgroundColor: '#FFFFFF'},
  avatar: {width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#243B6B', overflow: 'hidden'},
  avatarImage: {width: '100%', height: '100%'},
  avatarText: {fontSize: 12, fontWeight: '800', color: '#FFFFFF'},
  profileText: {marginLeft: 14},
  profileName: {fontSize: 13, fontWeight: '800', color: '#1F2A44'},
  profileRole: {marginTop: 3, fontSize: 10, color: '#67748E'},
  settingsCard: {marginHorizontal: 8, marginTop: 12, overflow: 'hidden', borderRadius: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EEF0F4'},
  settingRow: {flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#EEF0F3'},
  activeSettingRow: {backgroundColor: '#1D4ED8'},
  settingLabel: {flex: 1, marginLeft: 14, fontSize: 12, fontWeight: '700', color: '#1F2A44'},
  activeSettingLabel: {color: '#FFFFFF'},
  darkContainer: {backgroundColor: '#101827'},
  darkHeader: {backgroundColor: '#101827'},
  darkSurface: {backgroundColor: '#1B2638', borderColor: '#344258'},
  darkText: {color: '#F4F7FC'},
  darkMutedText: {color: '#B6C2D6'},
});
