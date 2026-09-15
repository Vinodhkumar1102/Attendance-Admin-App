import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const API_BASE_URL ='https://attendance-backend-11.onrender.com';

const formatTime = value => value
  ? new Date(value).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})
  : '--';

const formatWorkedHours = minutes => minutes ? `${String(Math.floor(minutes / 60)).padStart(2, '0')}h ${String(minutes % 60).padStart(2, '0')}m` : '--';

const getDateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatDate = date => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
}).format(date);

const getAvatarUri = avatar => {
  if (!avatar?.path) {
    return null;
  }

  return avatar.path.startsWith('http') ? avatar.path : `${API_BASE_URL}${avatar.path}`;
};

const getStatusDotStyle = (status, record) => {
  if (record?.inTime && !record?.outTime) {
    return isLateCheckIn(record.inTime) ? styles.lateStatusDot : null;
  }

  if (status === 'Late' || status === 'Half Day') {
    return styles.lateStatusDot;
  }

  if (status === 'Absent') {
    return styles.absentStatusDot;
  }

  if (status === 'Leave') {
    return styles.leaveStatusDot;
  }

  return styles.presentStatusDot;
};

const getStatusTextStyle = status => {
  if (status === 'Late') {
    return styles.lateStatusText;
  }

  if (status === 'Half Day') {
    return styles.halfDayStatusText;
  }

  if (status === 'Absent') {
    return styles.absentStatusText;
  }

  if (status === 'Leave') {
    return styles.leaveStatusText;
  }

  return styles.presentStatusText;
};

const isLateCheckIn = value => {
  if (!value) {
    return false;
  }

  const checkIn = new Date(value);
  return !Number.isNaN(checkIn.getTime())
    && (checkIn.getHours() * 60 + checkIn.getMinutes()) >= 9 * 60 + 45;
};

const getDisplayedStatus = record => {
  if (record?.inTime && !record?.outTime) {
    return '--';
  }

  if (record?.outTime) {
    const checkOut = new Date(record.outTime);
    if (!Number.isNaN(checkOut.getTime())) {
      return (checkOut.getHours() * 60 + checkOut.getMinutes()) < 14 * 60 ? 'Half Day' : 'Present';
    }
  }

  return record?.status || 'Absent';
};

const AttendanceScreen = ({adminToken, themeMode = 'light'}) => {
  const [searchText, setSearchText] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [departmentMenuVisible, setDepartmentMenuVisible] = useState(false);

  useEffect(() => {
    const loadAttendance = async () => {
      setAttendanceLoading(true);
      setAttendanceRecords([]);
      try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/admin-records?date=${getDateKey(selectedDate)}`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        });
        const result = await response.json();
        if (response.ok && Array.isArray(result.records)) {
          setAttendanceRecords(result.records);
        }
      } catch (error) {
        setAttendanceRecords([]);
      } finally {
        setAttendanceLoading(false);
      }
    };

    if (adminToken) {
      loadAttendance();
    }
  }, [adminToken, selectedDate]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/departments`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        });
        const result = await response.json();
        if (response.ok && Array.isArray(result)) {
          setDepartments(result.map(department => department.departmentName).filter(Boolean));
        }
      } catch (error) {
        setDepartments([]);
      }
    };

    if (adminToken) {
      loadDepartments();
    }
  }, [adminToken]);

  const visibleRecords = attendanceRecords.filter(record => (
    `${record.name} ${record.id}`.toLowerCase().includes(searchText.toLowerCase())
    && (selectedDepartment === 'All Departments' || record.department === selectedDepartment)
  ));
  const presentCount = visibleRecords.filter(record => getDisplayedStatus(record) === 'Present').length;
  const lateCount = visibleRecords.filter(record => isLateCheckIn(record.inTime)).length;
  const halfDayCount = visibleRecords.filter(record => getDisplayedStatus(record) === 'Half Day').length;
  const absentCount = visibleRecords.filter(record => record.status === 'Absent').length;
  const leaveCount = visibleRecords.filter(record => record.status === 'Leave').length;

  const changeDate = offset => setSelectedDate(current => new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset));

  return (
    <View style={[styles.container, themeMode === 'dark' && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <TouchableOpacity style={styles.calendarButton} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={21} color="#202633" />
        </TouchableOpacity>
      </View>

      <View style={styles.dateNavigation}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={18} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(1)} activeOpacity={0.8}>
          <Ionicons name="chevron-forward" size={18} color="#202633" />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#7B8495" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search employee..."
            placeholderTextColor="#8D96A6"
          />
        </View>
        <TouchableOpacity style={styles.departmentSelect} onPress={() => setDepartmentMenuVisible(current => !current)} activeOpacity={0.8}>
          <Text style={styles.departmentSelectText}>{selectedDepartment}</Text>
          <Ionicons name="chevron-down" size={14} color="#202633" />
        </TouchableOpacity>
      </View>
      {departmentMenuVisible && (
        <View style={styles.departmentMenu}>
          {['All Departments', ...departments].map(department => (
            <TouchableOpacity
              key={department}
              style={styles.departmentOption}
              onPress={() => {
                setSelectedDepartment(department);
                setDepartmentMenuVisible(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.departmentOptionText}>{department}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, styles.presentText]}>Present</Text>
          <Text style={styles.summaryValue}>{presentCount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, styles.lateText]}>Late</Text>
          <Text style={styles.summaryValue}>{lateCount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, styles.absentText]}>Absent</Text>
          <Text style={styles.summaryValue}>{absentCount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, styles.leaveText]}>Leave</Text>
          <Text style={styles.summaryValue}>{leaveCount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, styles.halfDayText]}>Half Day</Text>
          <Text style={styles.summaryValue}>{halfDayCount}</Text>
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.columnText, styles.employeeColumn]}>Employee</Text>
          <Text style={[styles.columnText, styles.timeColumn]}>In Time</Text>
          <Text style={[styles.columnText, styles.timeColumn]}>Out Time</Text>
          <Text style={[styles.columnText, styles.hoursColumn]}>Worked Hours</Text>
          <Text style={[styles.columnText, styles.statusHeaderColumn]}>Status</Text>
        </View>

        {attendanceLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading attendance...</Text>
          </View>
        ) : visibleRecords.map(record => {
          const displayedStatus = getDisplayedStatus(record);

          return (
          <View key={record.id} style={styles.recordRow}>
            <View style={styles.employeeCell}>
              <View style={[styles.avatar, {backgroundColor: record.color || '#1769E0'}]}>
                {getAvatarUri(record.avatar) ? (
                  <Image source={{uri: getAvatarUri(record.avatar)}} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{record.name.charAt(0)}</Text>
                )}
              </View>
              <View style={styles.employeeDetails}>
                <Text style={styles.employeeName}>{record.name}</Text>
                <Text style={styles.employeeId}>{record.id}</Text>
              </View>
            </View>
            <Text style={[styles.timeText, styles.timeColumn]}>{formatTime(record.inTime)}</Text>
            <Text style={[styles.timeText, styles.timeColumn]}>{formatTime(record.outTime)}</Text>
            <Text style={[styles.timeText, styles.hoursColumn]}>{formatWorkedHours(record.workingMinutes)}</Text>
            <View style={styles.statusCell}>
              <View style={[styles.statusDot, getStatusDotStyle(displayedStatus, record)]} />
              <Text style={[styles.statusText, getStatusTextStyle(displayedStatus)]} numberOfLines={1}>
                {displayedStatus}
              </Text>
            </View>
          </View>
          );
        })}
      </View>
    </View>
  );
};

export default AttendanceScreen;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  darkContainer: {backgroundColor: '#101827'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  calendarButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 8,
  },
  dateArrow: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#202633',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginTop: 8,
    gap: 6,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    marginLeft: 5,
    paddingVertical: 0,
    fontSize: 10,
    color: '#000000',
  },
  departmentSelect: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 34,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  departmentMenu: {
    position: 'absolute',
    zIndex: 2,
    right: 16,
    top: 102,
    width: '42%',
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  departmentOption: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  departmentOptionText: {
    color: '#202633',
    fontSize: 10,
  },
  departmentSelectText: {
    fontSize: 9,
    color: '#202633',
  },
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: 8,
    marginTop: 10,
    gap: 5,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  summaryValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  presentText: {color: '#20B15A'},
  lateText: {color: '#FF8A00'},
  absentText: {color: '#F04444'},
  leaveText: {color: '#1769E0'},
  halfDayText: {color: '#F59E0B'},
  tableCard: {
    marginHorizontal: 8,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  loadingContainer: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#67748E',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 30,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E7EAF0',
  },
  columnText: {
    flex: 0.8,
    fontSize: 8,
    fontWeight: '800',
    color: '#202633',
    textAlign: 'center',
  },
  employeeColumn: {
    flex: 1,
    paddingLeft: 23,
    textAlign: 'left',
  },
  timeColumn: {
    width: 58,
    flex: 0,
  },
  hoursColumn: {
    width: 64,
    flex: 0,
  },
  statusHeaderColumn: {
    width: 58,
    flex: 0,
    textAlign: 'center',
  },
  statusCell: {
    width: 58,
    flex: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F3',
  },
  employeeCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  employeeDetails: {
    marginLeft: 6,
  },
  employeeName: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  employeeId: {
    marginTop: 2,
    fontSize: 8,
    color: '#67748E',
  },
  timeText: {
    fontSize: 8,
    color: '#000000',
    textAlign: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    maxWidth: 10,
    borderRadius: 5,
    alignSelf: 'center',
  },
  statusText: {
    maxWidth: 44,
    fontSize: 8,
    fontWeight: '800',
  },
  lateStatusText: {
    color: '#FF8A00',
  },
  halfDayStatusText: {
    color: '#B45309',
  },
  absentStatusText: {
    color: '#F04444',
  },
  leaveStatusText: {
    color: '#1769E0',
  },
  presentStatusText: {
    color: '#20B15A',
  },
  lateStatusDot: {
    backgroundColor: '#FF8A00',
  },
  absentStatusDot: {
    backgroundColor: '#F04444',
  },
  leaveStatusDot: {
    backgroundColor: '#1769E0',
  },
  presentStatusDot: {
    backgroundColor: '#20B15A',
  },
});
