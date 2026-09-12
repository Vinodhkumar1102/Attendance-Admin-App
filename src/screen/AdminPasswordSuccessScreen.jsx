import React, {useEffect} from 'react';
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';

const AdminPasswordSuccessScreen = ({onBackToLogin}) => {
  useEffect(() => {
    const message = 'Password updated successfully';
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Password Updated', message);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#06133B" />
      <View style={styles.container}>
        <Image
          source={require('../assests/success.png')}
          style={styles.image}
          resizeMode="contain"
        />
        <Text style={styles.title}>Password Updated Successfully</Text>
        <Text style={styles.message}>
          Your admin password has been changed successfully. You can now sign in with your new password.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={onBackToLogin}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 150,
  },
  image: {
    width: 260,
    height: 220,
    marginBottom: 24,
  },
  title: {
    color: '#10204B',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 12,
    color: '#6A7391',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 58,
    marginTop: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5146F6',
    elevation: 6,
    shadowColor: '#5146F6',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
});

export default AdminPasswordSuccessScreen;
