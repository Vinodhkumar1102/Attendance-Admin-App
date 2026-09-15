import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ToastAndroid,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';

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
  aboutPoints: ['', '', '', ''],
  aboutSecondaryDescription: '',
  avatar: null,
};

const pointIcons = [
  {name: 'briefcase-outline', color: '#38BDF8'},
  {name: 'globe-outline', color: '#29B6F6'},
  {name: 'brush-outline', color: '#38BDF8'},
  {name: 'rocket-outline', color: '#0F2747'},
];

const getImageUri = avatar => {
  if (!avatar) return null;
  if (avatar.uri) return avatar.uri;
  return avatar.path?.startsWith('http') ? avatar.path : `${API_BASE_URL}${avatar.path}`;
};

const AboutUsScreen = ({onBack, adminToken}) => {
  const [heading, setHeading] = useState('');
  const [description, setDescription] = useState('');
  const [secondaryDescription, setSecondaryDescription] = useState('');
  const [aboutPoints, setAboutPoints] = useState(['', '', '', '']);
  const [profile, setProfile] = useState(emptyProfile);
  const [avatar, setAvatar] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const profileLoaded = useRef(false);

  useEffect(() => {
    const loadAbout = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/company-profile`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to load About Us details');
        setProfile({...emptyProfile, ...result});
        setHeading(result.aboutHeading || '');
        setDescription(result.about || '');
        setSecondaryDescription(result.aboutSecondaryDescription || '');
        setAboutPoints(Array.isArray(result.aboutPoints) ? [...result.aboutPoints, '', '', '', ''].slice(0, 4) : ['', '', '', '']);
        profileLoaded.current = true;
      } catch (error) {
        Alert.alert('About Us', error.message || 'Unable to load About Us details');
      }
    };

    if (adminToken) loadAbout();
  }, [adminToken]);

  const requestImagePermission = async source => {
    if (Platform.OS !== 'android') return true;

    const permissions = [
      source === 'camera'
        ? PermissionsAndroid.PERMISSIONS.CAMERA
        : Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    ];
    const result = await PermissionsAndroid.requestMultiple(permissions);
    return permissions.every(permission => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
  };

  const chooseAvatar = async source => {
    const hasPermission = await requestImagePermission(source);
    if (!hasPermission) {
      Alert.alert('Permission required', 'Allow camera or gallery access to choose an avatar.');
      return;
    }

    const picker = source === 'camera' ? launchCamera : launchImageLibrary;
    const result = await picker({mediaType: 'photo', quality: 0.85, selectionLimit: 1});
    if (!result.didCancel && result.assets?.[0]) {
      const selectedAvatar = result.assets[0];
      setAvatar(selectedAvatar);
      await saveAbout(selectedAvatar);
    }
  };

  const openAvatarPicker = () => {
    Alert.alert('Choose avatar', 'Select an image source', [
      {text: 'Camera', onPress: () => chooseAvatar('camera')},
      {text: 'Gallery', onPress: () => chooseAvatar('gallery')},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const saveAbout = async (overrides = {}) => {
    try {
      setIsSaving(true);
      const body = new FormData();
      ['companyName', 'description', 'managerName', 'email', 'phone', 'address', 'website'].forEach(field => {
        body.append(field, profile[field] || '');
      });
      body.append('aboutHeading', overrides.aboutHeading ?? heading.trim());
      body.append('about', overrides.about ?? description.trim());
      body.append('aboutSecondaryDescription', overrides.aboutSecondaryDescription ?? secondaryDescription.trim());
      body.append('aboutPoints', JSON.stringify(overrides.aboutPoints ?? aboutPoints));

      if (avatar?.uri) {
        body.append('avatar', {
          uri: avatar.uri,
          type: avatar.type || 'image/jpeg',
          name: avatar.fileName || 'about-avatar.jpg',
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/company-profile`, {
        method: 'PUT',
        headers: {Authorization: `Bearer ${adminToken}`},
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save About Us details');
      setProfile({...emptyProfile, ...result});
      setAvatar(null);
      if (Platform.OS === 'android') {
        ToastAndroid.show('About Us details saved successfully', ToastAndroid.SHORT);
      } else {
        Alert.alert('About Us', 'Details saved successfully.');
      }
    } catch (error) {
      Alert.alert('About Us', error.message || 'Unable to save About Us details');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!profileLoaded.current) {
      return undefined;
    }

    const saveTimer = setTimeout(() => saveAbout({
      aboutHeading: heading.trim(),
      about: description.trim(),
      aboutSecondaryDescription: secondaryDescription.trim(),
      aboutPoints,
    }), 600);
    return () => clearTimeout(saveTimer);
  }, [heading, description, secondaryDescription, aboutPoints]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.title}>About Us</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.aboutScrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.aboutContent}>
        <TouchableOpacity style={styles.avatarIcon} onPress={openAvatarPicker} activeOpacity={0.8}>
          <Ionicons name="person-outline" size={32} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.fieldHeading}>Heading</Text>
        <TextInput
          style={styles.headingInput}
          value={heading}
          onChangeText={setHeading}
          placeholder="Enter heading"
          placeholderTextColor="#98A1B3"
        />
        <Text style={styles.descriptionHeading}>Description</Text>
        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter description"
          placeholderTextColor="#98A1B3"
          multiline
          textAlignVertical="top"
        />
        <View style={styles.pointsContainer}>
          {aboutPoints.map((point, index) => (
            <View key={index} style={styles.pointFieldRow}>
              <Text style={styles.pointNumber}>{index + 1}.</Text>
              <TextInput
                style={styles.pointInput}
                value={point}
                onChangeText={value => setAboutPoints(current => current.map((item, itemIndex) => itemIndex === index ? value : item))}
                placeholder={`Enter point ${index + 1}`}
                placeholderTextColor="#98A1B3"
              />
            </View>
          ))}
        </View>
        <Text style={styles.descriptionHeading}>Additional Description</Text>
        <TextInput
          style={styles.descriptionInput}
          value={secondaryDescription}
          onChangeText={setSecondaryDescription}
          placeholder="Enter additional description"
          placeholderTextColor="#98A1B3"
          multiline
          textAlignVertical="top"
        />
        {(avatar?.uri || getImageUri(profile.avatar)) && (
          <Image
            source={{uri: avatar?.uri || getImageUri(profile.avatar)}}
            style={styles.previewImage}
          />
        )}
        {!!heading.trim() && (
          <Text style={styles.savedHeading}>{heading.trim()}</Text>
        )}
        {!!description.trim() && (
          <Text style={styles.savedDescription}>{description.trim()}</Text>
        )}
        {aboutPoints.some(point => point.trim()) && (
          <View style={styles.savedPointsGrid}>
            {aboutPoints.map((point, index) => point.trim() ? (
              <View key={index} style={styles.savedPointCard}>
                <View style={[styles.savedPointIcon, {backgroundColor: pointIcons[index].color}]}>
                  <Ionicons name={pointIcons[index].name} size={22} color="#FFFFFF" />
                </View>
                <View style={styles.savedPointContent}>
                  <Text style={styles.savedPointTitle}>{point.trim()}</Text>
                </View>
              </View>
            ) : null)}
          </View>
        )}
        <TouchableOpacity style={styles.saveButton} onPress={() => saveAbout()} disabled={isSaving} activeOpacity={0.8}>
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save About Us'}</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </View>
  );
};

export default AboutUsScreen;

const styles = StyleSheet.create({
  container: {paddingHorizontal: 8, paddingBottom: 18},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 10, marginTop: 12},
  backButton: {width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  title: {flex: 1, fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#000000'},
  headerSpacer: {width: 32},
  aboutContent: {alignItems: 'center', marginHorizontal: 18, marginTop: 28},
  aboutScrollContent: {paddingBottom: 28},
  avatarIcon: {width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#315DE8'},
  fieldHeading: {alignSelf: 'stretch', marginTop: 20, marginBottom: 8, fontSize: 14, fontWeight: '800', color: '#1F2A44'},
  headingInput: {alignSelf: 'stretch', minHeight: 46, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#DCE2EE', backgroundColor: '#FFFFFF', fontSize: 13, color: '#1F2A44'},
  descriptionHeading: {alignSelf: 'stretch', marginTop: 20, marginBottom: 8, fontSize: 14, fontWeight: '800', color: '#1F2A44'},
  descriptionInput: {alignSelf: 'stretch', minHeight: 110, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 9, borderWidth: 1, borderColor: '#DCE2EE', backgroundColor: '#FFFFFF', fontSize: 13, color: '#1F2A44'},
  previewImage: {width: '100%', height: 300, marginTop: 14, borderRadius: 10},
  savedHeading: {alignSelf: 'stretch', marginTop: 14, fontFamily: 'serif', fontSize: 22, fontWeight: '700', color: '#1D4ED8'},
  savedDescription: {alignSelf: 'stretch', marginTop: 12, fontSize: 13, lineHeight: 21, color: '#67748E'},
  savedPointsGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 16},
  savedPointCard: {width: '48%', minHeight: 92, flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 10, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5EAF2'},
  savedPointIcon: {width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center'},
  savedPointContent: {flex: 1, marginLeft: 9},
  savedPointTitle: {fontSize: 12, fontWeight: '800', color: '#0F2747'},
  saveButton: {alignSelf: 'stretch', minHeight: 46, marginTop: 20, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#315DE8'},
  saveButtonText: {color: '#FFFFFF', fontSize: 13, fontWeight: '800'},
  pointsContainer: {alignSelf: 'stretch', marginTop: 14},
  pointFieldRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  pointNumber: {width: 22, fontSize: 14, fontWeight: '800', color: '#315DE8'},
  pointInput: {flex: 1, minHeight: 46, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#DCE2EE', backgroundColor: '#FFFFFF', fontSize: 13, color: '#1F2A44'},
});
