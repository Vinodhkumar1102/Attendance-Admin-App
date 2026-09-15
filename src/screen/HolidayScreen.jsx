import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';

const API_BASE_URL = 'https://attendance-backend-1-2bdo.onrender.com';

const holidayDateKey = value => String(value).slice(0, 10);

const formatDate = value => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}).format(new Date(value));

const AddHolidayScreen = ({adminToken, onBack, onSaved}) => {
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const saveHoliday = async () => {
    if (!date || !description.trim()) {
      Alert.alert('Holiday', 'Select a date and enter a description');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`${API_BASE_URL}/api/holidays`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({date, description: description.trim()}),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to save holiday');
      }

      if (Platform.OS === 'android') {
        ToastAndroid.show('Holiday added successfully', ToastAndroid.SHORT);
      }
      onSaved(result);
    } catch (error) {
      Alert.alert('Holiday', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Holiday</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Holiday details</Text>
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.selectInput} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
          <Text style={[styles.selectText, !date && styles.placeholderText]}>
            {date ? formatDate(date) : 'Select day, month and year'}
          </Text>
          <Ionicons name="calendar-outline" size={19} color="#1769E0" />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date ? new Date(date) : new Date()}
            mode="date"
            display="calendar"
            onChange={handleDateChange}
          />
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter holiday description"
          placeholderTextColor="#8D96A6"
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.saveButton} onPress={saveHoliday} disabled={isSaving} activeOpacity={0.85}>
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Save Holiday'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const HolidayScreen = ({onBack, adminToken, onHolidaySaved, onHolidayDeleted}) => {
  const [holidays, setHolidays] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [holidayTab, setHolidayTab] = useState('upcoming');

  const loadHolidays = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/holidays`, {
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to load holidays');
      }
      setHolidays(result);
    } catch (error) {
      Alert.alert('Holidays', error.message);
    }
  }, [adminToken]);

  const deleteHoliday = useCallback(async (holidayId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/holidays/${holidayId}`, {
        method: 'DELETE',
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to delete holiday');
      }

      setHolidays(current => current.filter(h => h._id !== holidayId));
      onHolidayDeleted?.(holidayId);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Holiday deleted successfully', ToastAndroid.SHORT);
      }
    } catch (error) {
      Alert.alert('Delete Holiday', error.message);
    }
  }, [adminToken, onHolidayDeleted]);

  useEffect(() => {
    if (adminToken) {
      loadHolidays();
    }
  }, [adminToken, loadHolidays]);

  if (isAdding) {
    return (
      <AddHolidayScreen
        adminToken={adminToken}
        onBack={() => setIsAdding(false)}
        onSaved={holiday => {
          setHolidays(current => [...current, holiday].sort((first, second) => new Date(first.date) - new Date(second.date)));
            onHolidaySaved?.(holiday);
          setIsAdding(false);
        }}
      />
    );
  }

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const visibleHolidays = holidays
    .filter(holiday => holidayTab === 'upcoming'
      ? holidayDateKey(holiday.date) >= todayKey
      : holidayDateKey(holiday.date) < todayKey)
    .sort((first, second) => holidayDateKey(first.date).localeCompare(holidayDateKey(second.date)));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.title}>Holidays</Text>
        <View style={styles.headerSpacer} />
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => setIsAdding(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Holiday</Text>
      </TouchableOpacity>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, holidayTab === 'upcoming' && styles.activeTab]}
          onPress={() => setHolidayTab('upcoming')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, holidayTab === 'upcoming' && styles.activeTabText]}>Upcoming Holidays</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, holidayTab === 'completed' && styles.activeTab]}
          onPress={() => setHolidayTab('completed')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, holidayTab === 'completed' && styles.activeTabText]}>Completed Holidays</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.holidayList}>
        {visibleHolidays.length ? visibleHolidays.map(holiday => (
          <View key={holiday._id} style={styles.holidayRow}>
            <View style={styles.calendarIcon}>
              <Ionicons name="calendar-outline" size={19} color="#5269A6" />
            </View>
            <View style={styles.holidayInfo}>
              <Text style={styles.holidayName}>{holiday.description}</Text>
              <Text style={styles.holidayDate}>{formatDate(holiday.date)}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert('Delete Holiday', 'Are you sure you want to delete this holiday?', [
                  {text: 'Cancel', onPress: () => {}, style: 'cancel'},
                  {text: 'Delete', onPress: () => deleteHoliday(holiday._id), style: 'destructive'},
                ]);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="#DC3545" />
            </TouchableOpacity>
          </View>
        )) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={30} color="#9BA6B8" />
            <Text style={styles.emptyTitle}>
              {holidayTab === 'upcoming' ? 'No upcoming holidays' : 'No completed holidays'}
            </Text>
            <Text style={styles.emptyText}>
              {holidayTab === 'upcoming' ? 'Add a holiday to see it here.' : 'Completed holidays will appear here.'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default HolidayScreen;

const styles = StyleSheet.create({
  container: {paddingHorizontal: 8, paddingBottom: 24},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 10, marginTop: 12},
  backButton: {width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  title: {flex: 1, fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#000000'},
  headerSpacer: {width: 32},
  addButton: {height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8, marginTop: 14, borderRadius: 8, backgroundColor: '#1769E0'},
  addButtonText: {marginLeft: 6, fontSize: 12, fontWeight: '800', color: '#FFFFFF'},
  tabs: {flexDirection: 'row', marginHorizontal: 8, marginTop: 12, padding: 3, borderRadius: 9, backgroundColor: '#EEF1F6'},
  tab: {flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 36, borderRadius: 7},
  activeTab: {backgroundColor: '#FFFFFF', elevation: 1},
  tabText: {fontSize: 10, fontWeight: '700', color: '#67748E', textAlign: 'center'},
  activeTabText: {color: '#1769E0'},
  formCard: {marginHorizontal: 8, marginTop: 14, padding: 16, borderRadius: 14, backgroundColor: '#FFFFFF'},
  formTitle: {marginBottom: 8, fontSize: 16, fontWeight: '800', color: '#202633'},
  label: {marginTop: 12, marginBottom: 5, fontSize: 10, fontWeight: '700', color: '#5269A6'},
  selectInput: {height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 8},
  selectText: {fontSize: 12, color: '#202633'},
  placeholderText: {color: '#8D96A6'},
  descriptionInput: {height: 90, paddingHorizontal: 10, paddingTop: 10, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 8, fontSize: 12, color: '#202633'},
  saveButton: {height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18, borderRadius: 8, backgroundColor: '#1769E0'},
  saveText: {marginLeft: 6, fontSize: 12, fontWeight: '800', color: '#FFFFFF'},
  holidayList: {marginHorizontal: 8, marginTop: 14, borderRadius: 9, overflow: 'hidden', backgroundColor: '#FFFFFF'},
  holidayRow: {flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#EEF0F3'},
  calendarIcon: {width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4FF'},
  holidayInfo: {flex: 1, marginLeft: 10},
  holidayName: {fontSize: 12, fontWeight: '700', color: '#1F2A44'},
  holidayDate: {fontSize: 10, color: '#67748E', marginTop: 4},
  deleteButton: {width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE5E5'},
  emptyState: {alignItems: 'center', paddingVertical: 42},
  emptyTitle: {marginTop: 10, fontSize: 13, fontWeight: '800', color: '#364154'},
  emptyText: {marginTop: 4, fontSize: 11, color: '#67748E'},
});
