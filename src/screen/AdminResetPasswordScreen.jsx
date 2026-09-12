import React, {useEffect, useState} from 'react';
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

const OTP_DURATION_SECONDS = 60;

const formatCountdown = totalSeconds => {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const AdminResetPasswordScreen = ({email, onBack, onVerifyOtp, onResetPassword}) => {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_DURATION_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(previous => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft > 0) {
      return;
    }

    Alert.alert(
      'OTP expired',
      'Your admin reset code has expired. Please request a new code by email.',
      [
        {
          text: 'OK',
          onPress: () => {
            setOtp('');
            setNewPassword('');
            setConfirmPassword('');
            setOtpVerified(false);
            onBack?.();
          },
        },
      ],
    );
  }, [timeLeft, onBack]);

  const showToast = message => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Reset Password', message);
    }
  };

  const verifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      showToast('Please enter the OTP');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onVerifyOtp) {
        await onVerifyOtp(trimmedOtp);
      }
      setOtpVerified(true);
      showToast('OTP verified successfully');
    } catch (error) {
      setOtpVerified(false);
      showToast(error.message || 'Invalid OTP. Please enter the correct code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!otp.trim()) {
      showToast('Please enter the OTP');
      return;
    }

    if (!otpVerified) {
      showToast('Please verify the OTP first');
      return;
    }

    if (!newPassword || !confirmPassword) {
      showToast('Please enter the new password and confirm it');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onResetPassword) {
        await onResetPassword({email, otp: otp.trim(), newPassword});
        return;
      }
      showToast('Password updated successfully');
    } catch (error) {
      showToast(error.message || 'Unable to update password. Please try again.');
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
            source={require('../assests/new.png')}
            style={styles.image}
            resizeMode="contain"
          />

          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            A 6-digit OTP was sent to {email}.{' '}
            <Text style={styles.expiryText}>It expires in {formatCountdown(timeLeft)}.</Text>
          </Text>
          <Text style={styles.countdownText}>Code expires in {formatCountdown(timeLeft)}</Text>

          <Text style={styles.label}>OTP</Text>
          <View style={styles.otpRow}>
            <TextInput
              style={styles.otpInput}
              placeholder="Enter OTP"
              placeholderTextColor="#939DB7"
              value={otp}
              onChangeText={value => {
                setOtp(value);
                setOtpVerified(false);
              }}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.verifyButton, otpVerified && styles.verifyButtonDone]}
              onPress={verifyOtp}
              activeOpacity={0.85}
            >
              <Text style={styles.verifyButtonText}>{otpVerified ? 'Verified' : 'Submit'}</Text>
            </TouchableOpacity>
          </View>

          {otpVerified ? (
            <>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter new password"
                  placeholderTextColor="#939DB7"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(value => !value)}
                  activeOpacity={0.8}
                  accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#6A7391"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="#939DB7"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(value => !value)}
                  activeOpacity={0.8}
                  accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#6A7391"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleReset}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
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
    paddingTop: 30,
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
    width: 240,
    height: 240,
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
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: '#6A7391',
  },
  expiryText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  countdownText: {
    marginTop: 6,
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  label: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#17264D',
  },
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  otpInput: {
    flex: 1,
    height: 58,
    borderWidth: 1,
    borderColor: '#E2E7F2',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    color: '#17264D',
    fontSize: 16,
  },
  verifyButton: {
    height: 58,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#5146F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButtonDone: {
    backgroundColor: '#16A34A',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    height: 58,
    borderWidth: 1,
    borderColor: '#E2E7F2',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    color: '#17264D',
    fontSize: 16,
    marginBottom: 8,
  },
  passwordInputContainer: {
    height: 58,
    borderWidth: 1,
    borderColor: '#E2E7F2',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    color: '#17264D',
    fontSize: 16,
  },
  eyeButton: {
    width: 48,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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

export default AdminResetPasswordScreen;
