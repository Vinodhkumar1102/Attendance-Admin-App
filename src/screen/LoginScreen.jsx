import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  ToastAndroid,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const API_BASE_URL = 'http://192.168.0.102:5000';

const showToast = message => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
};

const LoginScreen = ({navigation = null, onLogin = null, onForgotPassword = null, themeMode = 'light'}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const nextEmailError = trimmedEmail ? '' : 'Please enter your email address';
    const nextPasswordError = trimmedPassword ? '' : 'Please enter your password';

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setLoginError('');

    if (nextEmailError || nextPasswordError) {
      showToast('Please enter your email and password');
      return;
    }

    setIsLoggingIn(true);

    try {
      const loginResponse = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
        }),
      });

      const result = await loginResponse.json();

      if (!loginResponse.ok) {
        const message = result.message || 'Invalid email or password';
        setLoginError(message);
        showToast(message);
        return;
      }

      showToast('Admin login successful');

      if (onLogin) {
        onLogin(result);
        return;
      }

      navigation?.navigate('Dashboard');
    } catch (error) {
      const message = 'Cannot connect to the backend. Check that the server is running.';
      setLoginError(message);
      showToast(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <View style={[styles.container, themeMode === 'dark' && styles.darkContainer]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#06133B"
      />

      <ImageBackground
        source={require('../assests/image.png')}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        
        <View style={styles.overlay} />

        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={{flex: 1}}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >

              {/* BRANDING */}
              <View style={styles.brandContainer}>
              </View>

              {/* LOGIN CARD */}
              <View style={styles.loginCard}>
                {/* Welcome */}
                <View style={styles.welcomeContainer}>
                  <Text style={styles.welcome}>
                    Welcome Back! 👋
                  </Text>
                  <Text style={styles.welcomeSubtitle}>
                    Sign in to your admin account
                  </Text>
                </View>

                {/* EMAIL */}
                <Text style={styles.label}>
                  Email Address
                </Text>

                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={22}
                    color="#6D63FF"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Enter your Email"
                    placeholderTextColor="#9299B2"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                {/* PASSWORD */}
                <View style={styles.passwordHeader}>
                  <Text style={styles.label}>
                    Password
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={22}
                    color="#6D63FF"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#9299B2"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />

                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    <Ionicons
                      name={
                        showPassword
                          ? 'eye-outline'
                          : 'eye-off-outline'
                      }
                      size={22}
                      color="#9299B2"
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                {loginError ? <Text style={styles.loginErrorText}>{loginError}</Text> : null}

                <TouchableOpacity
                  style={styles.forgotPasswordRow}
                  onPress={() => {
                    if (onForgotPassword) {
                      onForgotPassword(email.trim());
                      return;
                    }
                    showToast('Forgot password flow is not enabled for this admin screen yet.');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* LOGIN BUTTON */}
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleLogin}
                  disabled={isLoggingIn}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="log-in-outline"
                    size={22}
                    color="#FFFFFF"
                  />

                  <Text style={styles.loginButtonText}>
                    {isLoggingIn ? 'Signing In...' : 'Sign In'}
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={25}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

              </View>

              {/* FOOTER */}
              <View style={styles.footer}>
                <Ionicons
                  name="lock-closed"
                  size={15}
                  color="#A5ACC3"
                />

                <Text style={styles.footerText}>
                  Your data is safe with us
                </Text>
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  darkContainer: {backgroundColor: '#101827'},

  background: {
    flex: 1,
    width: '100%',
    height: '50%',
    alignSelf: 'center',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    overflow: 'hidden',
  },

  backgroundImage: {
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'rgba(3, 13, 48, 0.30)',
  },

  safeArea: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 25,
  },

  /* BRAND */

  brandContainer: {
    alignItems: 'center',
    paddingTop: 35,
    paddingHorizontal: 25,
    paddingBottom: 32,
  },

  logo: {
    width: 145,
    height: 75,
    marginBottom: 18,
  },

  titleWhite: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 44,
    textAlign: 'center',
  },

  titleBlue: {
    color: '#19B8F2',
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 44,
    textAlign: 'center',
  },

  subtitle: {
    color: '#D4DCF5',
    fontSize: 16,
    lineHeight: 25,
    textAlign: 'center',
    marginTop: 18,
  },

  /* LOGIN CARD */

  loginCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 18,
    marginTop: 280,
    borderRadius: 50,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 18,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.18,
    shadowRadius: 25,
    elevation: 12,
  },

  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  welcome: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10204B',
  },

  welcomeSubtitle: {
    fontSize: 15,
    color: '#7B849F',
    marginTop: 8,
  },

  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#18244A',
    marginBottom: 9,
  },

  inputContainer: {
    height: 58,
    borderWidth: 1.3,
    borderColor: '#E2E4F3',
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: '#17234A',
    marginLeft: 12,
    paddingVertical: 0,
  },

  errorText: {
    color: '#D93025',
    fontSize: 12,
    marginTop: -14,
    marginBottom: 14,
    marginLeft: 2,
  },

  loginErrorText: {
    color: '#D93025',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
    textAlign: 'center',
  },

  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  forgotPassword: {
    color: '#604BFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* REMEMBER */

  forgotPasswordRow: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 18,
  },

  /* LOGIN BUTTON */

  loginButton: {
    height: 58,
    borderRadius: 15,
    backgroundColor: '#5146F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,

    shadowColor: '#5146F6',
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },

  loginButtonText: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },

  signupText: {
    color: '#6C7591',
    fontSize: 14,
  },

  signupLink: {
    color: '#5146F6',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },

  /* FOOTER */

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 23,
  },

  footerText: {
    color: '#A5ACC3',
    fontSize: 13,
    marginLeft: 7,
  },
});