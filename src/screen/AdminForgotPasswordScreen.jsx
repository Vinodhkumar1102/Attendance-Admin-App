import React, {useState} from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ADMIN_EMAIL = 'datavibes80@gmail.com';

const AdminForgotPasswordScreen = ({defaultEmail = '', onBack, onSubmit}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = message => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Forgot Password', message);
    }
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showToast('Please enter the admin email.');
      return;
    }

    if (trimmedEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      showToast('This is not the admin email. Please enter the admin email.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(trimmedEmail);
        showToast('OTP sent to the admin email');
        return;
      }
      showToast(`OTP sent to ${trimmedEmail}`);
    } catch (error) {
      Alert.alert('Forgot Password', error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#06133B" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#06133B" />
          </TouchableOpacity>

          <Image
            source={require('../assests/admin.png')}
            style={styles.image}
            resizeMode="contain"
          />

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>Enter your admin email to receive reset instructions.</Text>

          <Text style={styles.label}>Admin Email</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color="#5B6BFF" />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#939DB7"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FF',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 110,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {width: 0, height: 0},
  },
  image: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 12,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: '#10204B',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: '#6A7391',
  },
  label: {
    marginTop: 30,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#17264D',
  },
  inputContainer: {
    height: 58,
    borderWidth: 1,
    borderColor: '#E2E7F2',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: '#17264D',
    fontSize: 16,
    paddingVertical: 0,
  },
  submitButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: '#5146F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    shadowColor: '#5146F6',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});

export default AdminForgotPasswordScreen;
