import React, {useState} from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const termsSections = [
  {title: 'Purpose of the Admin Panel', icon: 'locate-outline', color: '#2867F4', backgroundColor: '#EAF1FF', body: 'This admin panel is used to manage employees, attendance, leaves, payroll, and other organizational data.'},
  {title: 'Access & Responsibility', icon: 'people-outline', color: '#179447', backgroundColor: '#EAF9F0', body: 'You are authorized to access and manage company data. You are responsible for all actions performed under your account.'},
  {title: 'Data Management', icon: 'server-outline', color: '#5B32D6', backgroundColor: '#F0ECFF', body: 'You agree to maintain the accuracy, confidentiality, and security of all employee data.'},
  {title: 'Attendance & Payroll', icon: 'calendar-outline', color: '#F08A00', backgroundColor: '#FFF3E3', body: 'You can mark, edit, and approve attendance, leaves, and payroll as per company policies. Ensure data is correct before final submission.'},
  {title: 'Camera Access', icon: 'camera-outline', color: '#E52D4F', backgroundColor: '#FFECEF', body: 'The admin app may request camera access for identity verification, attendance validation, or employee profile image capture when required by company policy.'},
  {title: 'Photos & Gallery Access', icon: 'images-outline', color: '#16967C', backgroundColor: '#EAFBF7', body: 'The app may access photos and gallery to upload or select employee profile pictures, official documents, or other approved media files required for administrative tasks.'},
  {title: 'User Management', icon: 'person-add-outline', color: '#E52D4F', backgroundColor: '#FFECEF', body: 'You may add, edit, or deactivate employee accounts. Ensure proper authorization and use.'},
  {title: 'Confidentiality', icon: 'shield-outline', color: '#5B32D6', backgroundColor: '#F0ECFF', body: 'All company and employee information must be kept confidential and must not be shared with unauthorized persons.'},
  {title: 'Updates & Compliance', icon: 'sync-outline', color: '#2867F4', backgroundColor: '#EAF1FF', body: 'These terms may be updated by the company at any time. You are expected to follow the latest version.'},
];

const AgreementControls = ({onAgree}) => {
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isAgreed || isSubmitting) {
      if (!isAgreed) {
        Alert.alert('Terms & Conditions', 'Please check the agreement box before submitting.');
      }
      return;
    }

    setIsSubmitting(true);
    await onAgree?.();
    setIsSubmitting(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.agreeRow} onPress={() => setIsAgreed(current => !current)} activeOpacity={0.8}>
        <View style={[styles.checkbox, isAgreed && styles.checkboxChecked]}>
          {isAgreed && <Ionicons name="checkmark" size={17} color="#FFFFFF" />}
        </View>
        <Text style={styles.agreeText}>I agree to the Terms & Conditions</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.submitButton, !isAgreed && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        <Text style={styles.submitButtonText}>{isSubmitting ? 'Saving...' : 'Submit'}</Text>
      </TouchableOpacity>
    </>
  );
};

const AdminTermsAndConditionsScreen = ({onBack, showAgree = false, onAgree}) => (
  
  <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="light-content" backgroundColor="#061B4F" />
    <View style={styles.header} />
    <View style={styles.subHeader}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={22} color="#172B50" />
      </TouchableOpacity>
      <Text style={styles.title}>Terms & Conditions</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="document-text-outline" size={48} color="#315DE8" />
          <View style={styles.heroSettings}>
            <Ionicons name="settings" size={16} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.heroTitle}>Terms & Conditions</Text>
        <Text style={styles.heroSubtitle}>Please read the following terms and conditions{`\n`}before using the admin panel.</Text>
      </View>
      {termsSections.map((section, index) => (
        <View key={section.title} style={styles.termCard}>
          <View style={[styles.termIcon, {backgroundColor: section.backgroundColor}]}>
            <Ionicons name={section.icon} size={21} color={section.color} />
          </View>
          <View style={styles.termText}>
            <Text style={styles.sectionTitle}>{index + 1}. {section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        </View>
      ))}
      {showAgree && <AgreementControls onAgree={onAgree} />}
    </ScrollView>
  </SafeAreaView>
  );

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F7F9FC'},
  // header: {height: 32, backgroundColor: '#061B4F'},
  subHeader: {height: 54, alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: '#FFFFFF'},
  backButton: {position: 'absolute', left: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
  title: {color: '#172B50', fontSize: 18, fontWeight: '800'},
  content: {padding: 20, paddingBottom: 36},
  hero: {alignItems: 'center', paddingTop: 8, paddingBottom: 18},
  heroIcon: {width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1FF'},
  heroSettings: {position: 'absolute', right: 3, bottom: 3, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#12A05A', borderWidth: 2, borderColor: '#FFFFFF'},
  heroTitle: {marginTop: 14, color: '#172B50', fontSize: 21, fontWeight: '800'},
  heroSubtitle: {marginTop: 5, color: '#5B6B8F', fontSize: 14, lineHeight: 19, textAlign: 'center'},
  termCard: {minHeight: 76, marginBottom: 8, padding: 10, flexDirection: 'row', alignItems: 'flex-start', borderRadius: 8, borderWidth: 1, borderColor: '#E3EAF5', backgroundColor: '#FFFFFF'},
  termIcon: {width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center'},
  termText: {flex: 1, marginLeft: 12},
  sectionTitle: {marginBottom: 4, color: '#172B50', fontSize: 13, fontWeight: '800'},
  body: {color: '#5B6B8F', fontSize: 12, lineHeight: 16},
  agreeRow: {marginTop: 18, flexDirection: 'row', alignItems: 'center'},
  checkbox: {width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, borderColor: '#315DE8', alignItems: 'center', justifyContent: 'center'},
  checkboxChecked: {backgroundColor: '#315DE8'},
  agreeText: {marginLeft: 10, color: '#172B50', fontSize: 13, fontWeight: '700'},
  submitButton: {height: 50, marginTop: 18, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#315DE8'},
  submitButtonDisabled: {opacity: 0.45},
  submitButtonText: {color: '#FFFFFF', fontSize: 15, fontWeight: '800'},
});

export default AdminTermsAndConditionsScreen;
