import React, {useEffect, useState} from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {launchImageLibrary} from 'react-native-image-picker';

const API_BASE_URL = 'https://attendance-backend-11.onrender.com';

const emptyProfile = {
  companyName: '',
  description: '',
  managerName: '',
  email: '',
  phone: '',
  address: '',
  website: '',
  about: '',
  avatar: null,
};

const CompanyProfileScreen = ({onBack, onLogout, adminToken}) => {
  const [profile, setProfile] = useState(emptyProfile);
  const [form, setForm] = useState(emptyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (field, value) => {
    setForm(current => ({...current, [field]: value}));
  };

  const getImageUri = avatar => {
    if (!avatar) {
      return null;
    }
    if (avatar.uri) {
      return avatar.uri;
    }
    return avatar.path?.startsWith('http') ? avatar.path : `${API_BASE_URL}${avatar.path}`;
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/company-profile`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        });
        const result = await response.json();
        if (response.status === 401) {
          Alert.alert('Session expired', 'Please sign in again to manage the company profile.', [
            {text: 'OK', onPress: onLogout},
          ]);
          return;
        }
        if (!response.ok) {
          throw new Error(result.message || 'Unable to load company profile');
        }
        setProfile({...emptyProfile, ...result});
        setForm({...emptyProfile, ...result});
      } catch (error) {
        Alert.alert('Company Profile', error.message);
      }
    };

    if (adminToken) {
      loadProfile();
    }
  }, [adminToken, onLogout]);

  const chooseAvatar = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.85, selectionLimit: 1});
    if (!result.didCancel && result.assets?.[0]) {
      updateField('avatar', result.assets[0]);
    }
  };

  const saveProfile = async () => {
    if (!form.companyName.trim()) {
      Alert.alert('Company Profile', 'Company name is required');
      return;
    }

    try {
      setIsSaving(true);
      const body = new FormData();
      ['companyName', 'description', 'managerName', 'email', 'phone', 'address', 'website', 'about'].forEach(field => {
        body.append(field, form[field] || '');
      });

      if (form.avatar?.uri && form.avatar.uri !== getImageUri(profile.avatar)) {
        body.append('avatar', {
          uri: form.avatar.uri,
          type: form.avatar.type || 'image/jpeg',
          name: form.avatar.fileName || 'company-avatar.jpg',
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/company-profile`, {
        method: 'PUT',
        headers: {Authorization: `Bearer ${adminToken}`},
        body,
      });
      const result = await response.json();
      if (response.status === 401) {
        Alert.alert('Session expired', 'Please sign in again to save the company profile.', [
          {text: 'OK', onPress: onLogout},
        ]);
        return;
      }
      if (!response.ok) {
        throw new Error(result.message || 'Unable to save company profile');
      }

      setProfile({...emptyProfile, ...result});
      setForm({...emptyProfile, ...result});
      setIsEditing(false);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Company profile saved successfully', ToastAndroid.SHORT);
      } else {
        Alert.alert('Company Profile', 'Company profile saved successfully');
      }
    } catch (error) {
      Alert.alert('Company Profile', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (label, field, multiline = false) => (
    <View style={styles.formSection}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={form[field]}
        onChangeText={value => updateField(field, value)}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor="#8D96A6"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize={field === 'email' || field === 'website' ? 'none' : 'sentences'}
        keyboardType={field === 'email' ? 'email-address' : field === 'phone' ? 'phone-pad' : 'default'}
      />
    </View>
  );

  const avatarUri = getImageUri(isEditing ? form.avatar : profile.avatar);
  const initials = profile.companyName?.trim()?.slice(0, 2).toUpperCase() || 'CO';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.title}>Company Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.profileCard}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoCircle}>
            {avatarUri ? <Image source={{uri: avatarUri}} style={styles.logoImage} /> : <Text style={styles.logoText}>{initials}</Text>}
          </View>
          {isEditing && (
            <TouchableOpacity style={styles.editLogoButton} onPress={chooseAvatar} activeOpacity={0.8}>
              <Ionicons name="camera" size={14} color="#5269A6" />
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.form}>
            {renderField('Company Name', 'companyName')}
            {renderField('Company Description', 'description', true)}
            {renderField('Company Manager Name', 'managerName')}
            {renderField('Email', 'email')}
            {renderField('Phone', 'phone')}
            {renderField('Address', 'address', true)}
            {renderField('Website', 'website')}
            {renderField('About Company', 'about', true)}
          </View>
        ) : (
          <View>
            {[
              ['Company Name', profile.companyName],
              ['Company Description', profile.description],
              ['Company Manager Name', profile.managerName],
              ['Email', profile.email],
              ['Phone', profile.phone],
              ['Address', profile.address],
              ['Website', profile.website],
              ['About Company', profile.about],
            ].map(([label, value], index, fields) => (
              <View key={label}>
                <View style={styles.infoSection}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.value}>{value || 'Not provided'}</Text>
                </View>
                {index < fields.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}
      </View>

      {isEditing ? (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => { setForm(profile); setIsEditing(false); }} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={saveProfile} disabled={isSaving} activeOpacity={0.85}>
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Save Profile'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.editProfileButton} onPress={() => setIsEditing(true)} activeOpacity={0.85}>
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          <Text style={styles.editProfileText}>Edit Company Profile</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default CompanyProfileScreen;

const styles = StyleSheet.create({
  container: {paddingHorizontal: 8, paddingBottom: 24},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 10, marginTop: 12},
  backButton: {width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  title: {flex: 1, fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#000000'},
  headerSpacer: {width: 32},
  profileCard: {marginHorizontal: 8, marginTop: 8, paddingHorizontal: 14, paddingBottom: 16, borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2},
  logoWrapper: {alignSelf: 'center', marginTop: 12, marginBottom: 8},
  logoCircle: {width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#142B59'},
  logoImage: {width: '100%', height: '100%'},
  logoText: {fontSize: 21, fontWeight: '900', color: '#FFFFFF'},
  editLogoButton: {position: 'absolute', right: -6, bottom: -2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', elevation: 3},
  infoSection: {paddingVertical: 9},
  label: {fontSize: 10, fontWeight: '700', color: '#5269A6'},
  value: {marginTop: 4, fontSize: 12, lineHeight: 16, color: '#1F2A44'},
  divider: {height: 1, backgroundColor: '#EEF0F3'},
  form: {marginTop: 4},
  formSection: {marginTop: 9},
  input: {height: 38, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 8, fontSize: 12, color: '#202633', backgroundColor: '#FFFFFF'},
  multilineInput: {height: 70, paddingTop: 10},
  editProfileButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 42, marginHorizontal: 8, marginTop: 12, borderRadius: 8, backgroundColor: '#1769E0'},
  editProfileText: {marginLeft: 7, fontSize: 12, fontWeight: '800', color: '#FFFFFF'},
  actionRow: {flexDirection: 'row', gap: 10, marginHorizontal: 8, marginTop: 12},
  cancelButton: {flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#EEF0F3'},
  cancelText: {fontSize: 12, fontWeight: '800', color: '#364154'},
  saveButton: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: 8, backgroundColor: '#1769E0'},
  saveText: {marginLeft: 6, fontSize: 12, fontWeight: '800', color: '#FFFFFF'},
});
