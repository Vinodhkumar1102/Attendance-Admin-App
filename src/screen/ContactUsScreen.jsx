import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const emptyContact = {phone: '', email: '', address: ''};
const emptyFaq = {question: '', paragraph: ''};

const ContactUsScreen = ({onBack, adminToken}) => {
  const [contact, setContact] = useState(emptyContact);
  const [faqs, setFaqs] = useState([emptyFaq]);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const hasLoadedContactCopy = useRef(false);

  useEffect(() => {
    const loadContact = async () => {
      try {
        const response = await fetch('http://192.168.0.102:5000/api/contact', {
          headers: {Authorization: `Bearer ${adminToken}`},
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Unable to fetch contact details');
        setContact({phone: result.phone || '', email: result.email || '', address: result.address || ''});
        setFaqs(result.faqs?.length
          ? result.faqs.map(faq => ({question: faq.question || '', paragraph: faq.paragraph || ''}))
          : result.question || result.paragraph
            ? [{question: result.question || '', paragraph: result.paragraph || ''}]
            : [emptyFaq]);
        hasLoadedContactCopy.current = true;
      } catch (error) {
        Alert.alert('Contact Us', error.message || 'Unable to fetch contact details');
      }
    };

    if (adminToken) loadContact();
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken || !hasLoadedContactCopy.current) return undefined;

    const timeout = setTimeout(async () => {
      try {
        await fetch('http://192.168.0.102:5000/api/contact', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({faqs}),
        });
      } catch (error) {
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [adminToken, faqs]);

  const updateFaq = (index, field, value) => {
    setFaqs(current => current.map((faq, faqIndex) => (
      faqIndex === index ? {...faq, [field]: value} : faq
    )));
  };

  const addFaq = () => setFaqs(current => [...current, {...emptyFaq}]);

  const removeFaq = index => setFaqs(current => current.filter((_, faqIndex) => faqIndex !== index));

  const updateContact = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch('http://192.168.0.102:5000/api/contact', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contact),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to update contact details');
      setContact({phone: result.phone || '', email: result.email || '', address: result.address || ''});
      setIsEditing(false);
      Alert.alert('Contact Us', 'Contact details updated successfully.');
    } catch (error) {
      Alert.alert('Contact Us', error.message || 'Unable to update contact details');
    } finally {
      setIsUpdating(false);
    }
  };

  const renderField = (label, field, icon, multiline = false) => (
    <View style={styles.contactField}>
      <Ionicons name={icon} size={21} color="#315DE8" />
      <View style={styles.fieldText}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={[styles.fieldInput, multiline && styles.addressInput]}
            value={contact[field]}
            onChangeText={value => setContact(current => ({...current, [field]: value}))}
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor="#98A1B3"
            multiline={multiline}
          />
        ) : (
          <Text style={styles.fieldValue}>{contact[field] || 'Not provided'}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.title}>Contact Us</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contactContent}>
        <Text style={styles.callHeading}>Call our team</Text>
        {renderField('Phone Number', 'phone', 'call-outline')}
        {renderField('Email', 'email', 'mail-outline')}
        {renderField('Address', 'address', 'location-outline', true)}
        <TouchableOpacity
          style={isEditing ? styles.updateButton : styles.editButton}
          onPress={isEditing ? updateContact : () => setIsEditing(true)}
          disabled={isUpdating}
          activeOpacity={0.8}
        >
          <Text style={isEditing ? styles.updateButtonText : styles.editButtonText}>
            {isUpdating ? 'Updating...' : isEditing ? 'Update' : 'Edit Contact Details'}
          </Text>
        </TouchableOpacity>

        <View style={styles.copySection}>
          <Text style={styles.copyHeading}>Questions and Answers</Text>
          {faqs.map((faq, index) => (
            <View key={`faq-${index}`} style={styles.faqEditor}>
              <View style={styles.faqEditorHeader}>
                <Text style={styles.faqNumber}>Question {index + 1}</Text>
                <TouchableOpacity onPress={() => removeFaq(index)} activeOpacity={0.8}>
                  <Ionicons name="trash-outline" size={20} color="#D92D3F" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.copyQuestionInput}
                value={faq.question}
                onChangeText={value => updateFaq(index, 'question', value)}
                placeholder="Enter question"
                placeholderTextColor="#98A1B3"
              />
              <TextInput
                style={styles.copyParagraphInput}
                value={faq.paragraph}
                onChangeText={value => updateFaq(index, 'paragraph', value)}
                placeholder="Enter answer"
                placeholderTextColor="#98A1B3"
                multiline
                textAlignVertical="top"
              />
            </View>
          ))}
          <TouchableOpacity style={styles.addFaqButton} onPress={addFaq} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={21} color="#315DE8" />
            <Text style={styles.addFaqText}>Add Question</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ContactUsScreen;

const styles = StyleSheet.create({
  container: {paddingHorizontal: 8, paddingBottom: 18},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 10, marginTop: 12},
  backButton: {width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  title: {flex: 1, fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#000000'},
  headerSpacer: {width: 32},
  contactContent: {marginHorizontal: 8, marginTop: 22},
  callHeading: {marginBottom: 12, fontSize: 22, fontWeight: '800', color: '#10204B'},
  contactField: {flexDirection: 'row', alignItems: 'center', minHeight: 68, marginBottom: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5EAF2'},
  fieldText: {flex: 1, marginLeft: 13},
  fieldLabel: {fontSize: 11, fontWeight: '700', color: '#7A86A2'},
  fieldValue: {marginTop: 5, fontSize: 13, fontWeight: '700', color: '#1F2A44'},
  fieldInput: {minHeight: 36, paddingHorizontal: 0, paddingVertical: 4, fontSize: 13, color: '#1F2A44'},
  addressInput: {minHeight: 56, textAlignVertical: 'top'},
  editButton: {alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 4, borderRadius: 9, borderWidth: 1, borderColor: '#315DE8'},
  editButtonText: {fontSize: 13, fontWeight: '800', color: '#315DE8'},
  updateButton: {alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 4, borderRadius: 9, backgroundColor: '#315DE8'},
  updateButtonText: {fontSize: 13, fontWeight: '800', color: '#FFFFFF'},
  copySection: {marginTop: 22},
  copyHeading: {marginBottom: 12, fontSize: 16, fontWeight: '800', color: '#10204B'},
  faqEditor: {marginBottom: 16, padding: 12, borderRadius: 10, backgroundColor: '#F8FAFF', borderWidth: 1, borderColor: '#E5EAF2'},
  faqEditorHeader: {marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  faqNumber: {fontSize: 14, fontWeight: '800', color: '#315DE8'},
  copyQuestionInput: {minHeight: 48, marginBottom: 10, paddingHorizontal: 14, borderRadius: 9, borderWidth: 1, borderColor: '#E5EAF2', backgroundColor: '#FFFFFF', color: '#1F2A44', fontSize: 14},
  copyParagraphInput: {minHeight: 110, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 9, borderWidth: 1, borderColor: '#E5EAF2', backgroundColor: '#FFFFFF', color: '#1F2A44', fontSize: 14},
  addFaqButton: {minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#315DE8'},
  addFaqText: {marginLeft: 8, fontSize: 13, fontWeight: '800', color: '#315DE8'},
});
