import React, {useEffect, useState} from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';
import LoginScreen from './src/screen/LoginScreen';
import DashboardScreen from './src/screen/DashboardScreen';
import AdminForgotPasswordScreen from './src/screen/AdminForgotPasswordScreen';
import AdminResetPasswordScreen from './src/screen/AdminResetPasswordScreen';
import AdminPasswordSuccessScreen from './src/screen/AdminPasswordSuccessScreen';
import AdminTermsAndConditionsScreen from './src/screen/conditions/AdminTermsAndConditionsScreen';

const API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000'
  : 'http://localhost:5000';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [adminToken, setAdminToken] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetPasswordEmail, setResetPasswordEmail] = useState('');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(null);
  const [appPhase, setAppPhase] = useState('loading');
  const [themeMode, setThemeMode] = useState('light');
  const [notificationTarget, setNotificationTarget] = useState(null);
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);

  const openNotificationTarget = data => {
    const target = data?.type === 'Attendance'
      ? {type: 'Attendance'}
      : {type: 'Leave', status: data?.status || 'Pending'};
    setNotificationTarget(target);
    setCurrentScreen('dashboard');
  };

  useEffect(() => {
    AsyncStorage.getItem('admin_theme_mode')
      .then(value => setThemeMode(value === 'dark' ? 'dark' : 'light'))
      .catch(() => setThemeMode('light'));
  }, []);

  useEffect(() => {
    if (appPhase !== 'permissions') {
      return;
    }

    const triggerPermissionsRequest = async () => {
      await requestAdminPermissions();
    };

    triggerPermissionsRequest();
  }, [appPhase]);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const [termsValue, permissionsValue] = await Promise.all([
          AsyncStorage.getItem('admin_terms_accepted'),
          AsyncStorage.getItem('admin_permissions_granted'),
        ]);

        const accepted = termsValue === 'true';
        const permissionsGranted = permissionsValue === 'true';

        setHasAcceptedTerms(accepted);
        setHasPermissions(permissionsGranted);

        if (!accepted) {
          setAppPhase('terms');
          return;
        }

        setAppPhase(permissionsGranted ? 'login' : 'permissions');
      } catch (error) {
        setHasAcceptedTerms(false);
        setHasPermissions(false);
        setAppPhase('terms');
      }
    };

    loadSavedState();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const notificationChannelId = 'admin_notifications';

    const configureNotifications = async () => {
      await notifee.requestPermission();
      await notifee.createChannel({
        id: notificationChannelId,
        name: 'Admin notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        vibrationPattern: [200, 100],
      });

      return notificationChannelId;
    };

    configureNotifications().catch(error => {
      console.error('Admin notification setup failed', error);
    });

    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Admin received foreground push message', remoteMessage);
      setNotificationRefreshKey(current => current + 1);
      const title = remoteMessage?.notification?.title || remoteMessage?.data?.title || 'New update';
      const body = remoteMessage?.notification?.body || remoteMessage?.data?.message || 'You have a new notification';
      const avatarUrl = remoteMessage?.data?.avatarUrl || remoteMessage?.notification?.imageUrl;

      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId: notificationChannelId,
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [200, 100],
          pressAction: {id: 'default'},
          ...(avatarUrl ? {largeIcon: avatarUrl} : {}),
        },
        data: remoteMessage?.data || {},
      });
    });

    const unsubscribeFromNotificationPress = notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS) {
        openNotificationTarget(detail.notification?.data || {});
      }
    });

    const unsubscribeFromOpenedMessage = messaging().onNotificationOpenedApp(remoteMessage => {
      openNotificationTarget(remoteMessage?.data || {});
    });

    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        openNotificationTarget(remoteMessage.data || {});
      }
    }).catch(() => {});

    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Admin background push message', remoteMessage);
    });

    return () => {
      unsubscribe();
      unsubscribeFromNotificationPress();
      unsubscribeFromOpenedMessage();
    };
  }, []);

  const requestAdminPermissions = async () => {
    try {
      if (Platform.OS !== 'android') {
        await AsyncStorage.setItem('admin_permissions_granted', 'true');
        setHasPermissions(true);
        setAppPhase('login');
        return;
      }

      const galleryPermission = Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      const permissions = [
        PermissionsAndroid.PERMISSIONS.CAMERA,
        galleryPermission,
      ];

      if (Platform.Version >= 33) {
        permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      const results = await PermissionsAndroid.requestMultiple(permissions);

      const cameraGranted = results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
      const galleryGranted = results[galleryPermission] === PermissionsAndroid.RESULTS.GRANTED;
      const notificationGranted = Platform.Version < 33
        ? true
        : results[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] === PermissionsAndroid.RESULTS.GRANTED;
      const granted = cameraGranted && galleryGranted && notificationGranted;

      await AsyncStorage.setItem('admin_permissions_granted', granted ? 'true' : 'false');
      setHasPermissions(granted);
      setAppPhase('login');

      if (!granted) {
        Alert.alert(
          'Permission required',
          'Camera and photo access is required for admin profile and media-related tasks.',
        );
      }
    } catch (error) {
      await AsyncStorage.setItem('admin_permissions_granted', 'false');
      setHasPermissions(false);
      setAppPhase('login');
    }
  };

  const acceptTerms = async () => {
    try {
      await AsyncStorage.setItem('admin_terms_accepted', 'true');
      setHasAcceptedTerms(true);
      setAppPhase('permissions');
    } catch (error) {
      Alert.alert('Terms & Conditions', 'Unable to save your agreement. Please try again.');
    }
  };

  const registerAdminDeviceToken = async currentAdminToken => {
    if (!currentAdminToken || Platform.OS !== 'android') {
      return;
    }

    try {
      const authStatus = await messaging().hasPermission();
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        await messaging().requestPermission();
      }

      const token = await messaging().getToken();
      if (!token) {
        console.error('Admin device token registration failed: empty token');
        return;
      }

      console.log('Admin device token generated', {token});

      const response = await fetch(`${API_BASE_URL}/api/admin/device-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentAdminToken}`,
        },
        body: JSON.stringify({deviceToken: token}),
      });

      console.log('Admin device token registration response', {
        status: response.status,
        ok: response.ok,
      });
    } catch (error) {
      console.error('Admin device token registration failed', error);
    }
  };

  const handleAdminLogout = async () => {
    setAdminToken('');
    setCurrentScreen('login');

    try {
      await Promise.all([
        AsyncStorage.removeItem('admin_token'),
        AsyncStorage.removeItem('admin_read_notification_ids'),
        AsyncStorage.removeItem('admin_deleted_notification_ids'),
        AsyncStorage.removeItem('admin_notifications_enabled'),
      ]);
    } catch (error) {
      // Ignore cleanup errors and keep the session signed out.
    }
  };

  const toggleTheme = async () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
    try {
      await AsyncStorage.setItem('admin_theme_mode', nextMode);
    } catch (error) {
      // Keep the selected theme active for this session if persistence is unavailable.
    }
  };

  if (appPhase === 'loading') {
    return null;
  }

  if (appPhase === 'terms') {
    return <AdminTermsAndConditionsScreen showAgree onAgree={acceptTerms} />;
  }

  if (appPhase === 'permissions') {
    return null;
  }

  if (hasAcceptedTerms === null) {
    return null;
  }

  if (currentScreen === 'forgot-password') {
    return (
      <AdminForgotPasswordScreen
        defaultEmail={forgotPasswordEmail}
        onBack={() => {
          setForgotPasswordEmail('');
          setCurrentScreen('login');
        }}
        onSubmit={async email => {
          const trimmedEmail = email.trim();
          if (!trimmedEmail) {
            Alert.alert('Forgot Password', 'Please enter the admin email.');
            return;
          }

          if (trimmedEmail.toLowerCase() !== 'datavibes80@gmail.com') {
            Alert.alert(
              'Forgot Password',
              'This is not the admin email. Please enter the admin email.',
            );
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/admin/forgot-password`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: trimmedEmail}),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || 'Unable to send OTP');
          }

          setForgotPasswordEmail(trimmedEmail);
          setResetPasswordEmail(trimmedEmail);
          setCurrentScreen('reset-password');
        }}
      />
    );
  }

  if (currentScreen === 'reset-password') {
    return (
      <AdminResetPasswordScreen
        email={resetPasswordEmail}
        onVerifyOtp={async otp => {
          const response = await fetch(`${API_BASE_URL}/api/admin/verify-reset-code`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: resetPasswordEmail, resetCode: otp}),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || 'Unable to verify OTP');
          }
          return result;
        }}
        onBack={() => {
          setResetPasswordEmail('');
          setCurrentScreen('forgot-password');
        }}
        onResetPassword={async ({otp, newPassword}) => {
          const response = await fetch(`${API_BASE_URL}/api/admin/reset-password`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: resetPasswordEmail, resetCode: otp, newPassword}),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || 'Unable to reset password');
          }
          setResetPasswordEmail('');
          setCurrentScreen('password-success');
        }}
      />
    );
  }

  if (currentScreen === 'password-success') {
    return (
      <AdminPasswordSuccessScreen
        onBackToLogin={() => setCurrentScreen('login')}
      />
    );
  }

  if (currentScreen === 'dashboard') {
    return (
      <DashboardScreen
        adminToken={adminToken}
        notificationTarget={notificationTarget}
        notificationRefreshKey={notificationRefreshKey}
        onNotificationTargetHandled={() => setNotificationTarget(null)}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleAdminLogout}
      />
    );
  }

  return <LoginScreen
    themeMode={themeMode}
    onForgotPassword={() => {
      setForgotPasswordEmail('');
      setCurrentScreen('forgot-password');
    }}
    onLogin={async result => {
      const nextToken = result?.token || '';
      setAdminToken(nextToken);
      setCurrentScreen('dashboard');

      try {
        await AsyncStorage.setItem('admin_token', nextToken);
      } catch (error) {
        // Keep the session active even if persistence fails.
      }

      if (nextToken) {
        await registerAdminDeviceToken(nextToken);
      }
    }}
  />;
};

const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    backgroundColor: '#F5F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#1A2B52',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 12},
    elevation: 8,
  },
  permissionTitle: {
    color: '#172B50',
    fontSize: 24,
    fontWeight: '800',
  },
  permissionSubtitle: {
    marginTop: 12,
    color: '#53627B',
    fontSize: 15,
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 24,
    backgroundColor: '#061B4F',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default App;