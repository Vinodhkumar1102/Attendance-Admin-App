import React, {useCallback, useEffect, useState} from 'react';
import {
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const API_BASE_URL = 'https://attendance-backend-1-2bdo.onrender.com';

const AdminLeaveReportScreen = ({adminToken, onBack}) => (
  <LeaveReportContent adminToken={adminToken} onBack={onBack} />
);

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getMonthLabel = date => `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

const formatDate = value => value ? new Intl.DateTimeFormat('en-US', {month: 'short', day: '2-digit', year: 'numeric'}).format(new Date(value)) : '--';

const getAvatarUri = avatar => avatar?.path
  ? avatar.path.startsWith('http') ? avatar.path : `${API_BASE_URL}${avatar.path}`
  : null;

const getMonthOptions = joinDate => {
  const currentDate = new Date();
  const options = [];
  const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const parsedJoinDate = joinDate ? new Date(joinDate) : null;
  const startDate = parsedJoinDate && !Number.isNaN(parsedJoinDate.getTime())
    ? new Date(parsedJoinDate.getFullYear(), parsedJoinDate.getMonth(), 1)
    : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  let cursor = startDate;
  while (cursor <= currentMonth) {
    options.push(getMonthLabel(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return options.reverse();
};

const LeaveReportContent = ({adminToken, onBack}) => {
  const [month, setMonth] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [employee, setEmployee] = useState('');
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [openMenu, setOpenMenu] = useState('');

  const loadFilters = useCallback(async () => {
    try {
      const headers = {Authorization: `Bearer ${adminToken}`};
      const [departmentResponse, employeeResponse, leaveResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/departments`, {headers}),
        fetch(`${API_BASE_URL}/api/employees`, {headers}),
        fetch(`${API_BASE_URL}/api/leaves`, {headers}),
      ]);
      const departmentResult = await departmentResponse.json();
      const employeeResult = await employeeResponse.json();
      const leaveResult = await leaveResponse.json();
      setDepartments(Array.isArray(departmentResult) ? departmentResult.map(item => item.departmentName).filter(Boolean) : []);
      setEmployees(Array.isArray(employeeResult) ? employeeResult : []);
      setLeaves(Array.isArray(leaveResult.leaves) ? leaveResult.leaves : []);
    } catch (error) {
      setDepartments([]);
      setEmployees([]);
      setLeaves([]);
    }
  }, [adminToken]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  const visibleEmployees = department === 'All Departments'
    ? employees
    : employees.filter(item => item.departmentName === department);
  const selectedEmployee = visibleEmployees.find(item => (item.employeeId || item._id) === employee);
  const earliestJoiningDate = visibleEmployees
    .map(item => item.joiningDate)
    .filter(Boolean)
    .sort((first, second) => new Date(first) - new Date(second))[0];
  const monthOptions = getMonthOptions(selectedEmployee?.joiningDate || earliestJoiningDate);

  useEffect(() => {
    if (monthOptions.length && !monthOptions.includes(month)) {
      setMonth(monthOptions[0]);
    }
  }, [monthOptions, month]);

  const getMonthRange = monthLabel => {
    const [monthName, yearText] = monthLabel.split(' ');
    const monthIndex = monthNames.indexOf(monthName);
    const year = Number(yearText);
    return {
      start: new Date(year, monthIndex, 1),
      end: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
    };
  };

  const selectedMonthRange = month ? getMonthRange(month) : null;
  useEffect(() => {
    if (!employee || !month) {
      setAttendanceRecords([]);
      return;
    }

    const [monthName, yearText] = month.split(' ');
    const monthNumber = monthNames.indexOf(monthName) + 1;
    const loadAttendance = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/attendance/admin-employee-records?employeeId=${encodeURIComponent(employee)}&year=${yearText}&month=${monthNumber}`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        });
        const result = await response.json();
        setAttendanceRecords(response.ok && Array.isArray(result.records) ? result.records : []);
      } catch (error) {
        setAttendanceRecords([]);
      }
    };

    loadAttendance();
  }, [adminToken, employee, month]);

  const visibleLeaveRows = employee ? leaves.filter(leave => {
    const leaveEmployee = employees.find(item => item.employeeId === leave.employeeId);
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    const matchesEmployee = !employee || leave.employeeId === employee;
    const matchesDepartment = department === 'All Departments' || leaveEmployee?.departmentName === department;
    const matchesMonth = selectedMonthRange && leaveStart <= selectedMonthRange.end && leaveEnd >= selectedMonthRange.start;
    return matchesEmployee && matchesDepartment && matchesMonth;
  }) : [];
  const absentRows = employee ? attendanceRecords
    .filter(record => record.status === 'Absent')
    .map(record => ({
      id: `absent-${record.date}`,
      employeeId: employee,
      employeeName: selectedEmployee?.fullName || employee,
      avatar: selectedEmployee?.avatar || null,
      leaveType: 'Absent',
      startDate: record.date,
      endDate: record.date,
      totalDays: 1,
      status: 'Absent',
    })) : [];
  const visibleLeaves = [...visibleLeaveRows, ...absentRows]
    .sort((first, second) => new Date(first.startDate) - new Date(second.startDate));

  const renderMenu = (name, options, onSelect, renderOption) => (
    openMenu === name && (
      <View style={styles.dropdownMenu}>
        {options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={styles.dropdownOption}
            onPress={() => {
              onSelect(option.value);
              setOpenMenu('');
            }}
            activeOpacity={0.8}
          >
            {renderOption ? renderOption(option) : <Text style={styles.dropdownText}>{option.label}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    )
  );

  return (
  <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" />
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={21} color="#202633" />
      </TouchableOpacity>
      <Text style={styles.title}>Leave Report</Text>
      <View style={styles.headerSpacer} />
    </View>

    <View style={styles.filtersContainer}>
      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Month</Text>
          <TouchableOpacity style={styles.filterBox} onPress={() => setOpenMenu(openMenu === 'month' ? '' : 'month')} activeOpacity={0.85}>
            <Text style={styles.filterValue}>{month}</Text>
            <Ionicons name="chevron-down" size={16} color="#4B556B" />
          </TouchableOpacity>
          {renderMenu('month', monthOptions.map(item => ({label: item, value: item})), setMonth)}
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Department</Text>
          <TouchableOpacity style={styles.filterBox} onPress={() => setOpenMenu(openMenu === 'department' ? '' : 'department')} activeOpacity={0.85}>
            <Text style={styles.filterValue}>{department}</Text>
            <Ionicons name="chevron-down" size={16} color="#4B556B" />
          </TouchableOpacity>
          {renderMenu('department', [{label: 'All Departments', value: 'All Departments'}, ...departments.map(item => ({label: item, value: item}))], value => { setDepartment(value); setEmployee(''); })}
        </View>
      </View>
      <View style={styles.employeeFilterGroup}>
        <Text style={styles.filterLabel}>Employees</Text>
        <TouchableOpacity style={styles.filterBox} onPress={() => setOpenMenu(openMenu === 'employee' ? '' : 'employee')} activeOpacity={0.85}>
          <Text style={styles.filterValue}>{selectedEmployee?.fullName || (visibleEmployees.length ? 'Select Employee' : 'No employees')}</Text>
          <Ionicons name="chevron-down" size={16} color="#4B556B" />
        </TouchableOpacity>
        {renderMenu(
          'employee',
          visibleEmployees.map(item => ({label: `${item.fullName || 'Employee'} (${item.employeeId || item._id})`, value: item.employeeId || item._id, employee: item})),
          setEmployee,
          option => {
            const avatarUri = getAvatarUri(option.employee.avatar);
            return (
              <View style={styles.employeeOptionRow}>
                {avatarUri ? (
                  <Image source={{uri: avatarUri}} style={styles.employeeOptionAvatar} />
                ) : (
                  <View style={styles.employeeOptionAvatarFallback}>
                    <Text style={styles.employeeOptionInitial}>{(option.employee.fullName || 'E').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.employeeOptionInfo}>
                  <Text style={styles.employeeOptionName} numberOfLines={1}>{option.employee.fullName || 'Employee'}</Text>
                  <Text style={styles.employeeOptionId}>{option.employee.employeeId || option.employee._id}</Text>
                </View>
              </View>
            );
          },
        )}
      </View>
    </View>
    <View style={styles.resultsContainer}>
      {!employee ? (
        <Text style={styles.emptyText}>Select an employee to view leave attendance</Text>
      ) : visibleLeaves.length === 0 ? (
        <Text style={styles.emptyText}>No leave records for the selected filters</Text>
      ) : (
        <View style={styles.leaveTable}>
          <View style={styles.leaveTableHeader}>
            <Text style={[styles.leaveHeaderText, styles.numberColumn]}>#</Text>
            <Text style={[styles.leaveHeaderText, styles.employeeColumn]}>Employee</Text>
            <Text style={[styles.leaveHeaderText, styles.leaveTypeColumn]}>Leave Type</Text>
            <Text style={[styles.leaveHeaderText, styles.dateColumn]}>From Date</Text>
            <Text style={[styles.leaveHeaderText, styles.dateColumn]}>To Date</Text>
            <Text style={[styles.leaveHeaderText, styles.daysColumn]}>Days</Text>
            <Text style={[styles.leaveHeaderText, styles.statusColumn]}>Status</Text>
          </View>
          {visibleLeaves.map((leave, index) => {
            const leaveEmployee = employees.find(item => item.employeeId === leave.employeeId);
            const avatarUri = getAvatarUri(leave.avatar || leaveEmployee?.avatar);
            const name = leave.employeeName || leave.employeeId || 'Employee';
            return (
              <View key={leave.id} style={styles.leaveTableRow}>
                <Text style={[styles.leaveCell, styles.numberColumn]}>{index + 1}</Text>
                <View style={[styles.employeeTableCell, styles.employeeColumn]}>
                  {avatarUri ? <Image source={{uri: avatarUri}} style={styles.leaveAvatar} /> : <View style={styles.leaveAvatarFallback}><Text style={styles.leaveAvatarText}>{name.charAt(0).toUpperCase()}</Text></View>}
                  <Text style={styles.leaveEmployeeText} numberOfLines={2}>{name}</Text>
                </View>
                <Text style={[styles.leaveCell, styles.leaveTypeColumn]} numberOfLines={2}>{leave.leaveType || 'Leave'}</Text>
                <Text style={[styles.leaveCell, styles.dateColumn]}>{formatDate(leave.startDate)}</Text>
                <Text style={[styles.leaveCell, styles.dateColumn]}>{formatDate(leave.endDate)}</Text>
                <Text style={[styles.leaveCell, styles.daysColumn]}>{leave.totalDays || 0}</Text>
                <Text style={[styles.leaveStatusCell, leave.status === 'Absent' && styles.absentStatusCell, styles.statusColumn]}>{leave.status || 'Pending'}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F6F8FC'},
  header: {height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative', borderBottomWidth: 1, borderBottomColor: '#E9EEF5'},
  backButton: {position: 'absolute', left: 14, width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
  headerSpacer: {position: 'absolute', right: 14, width: 32, height: 32},
  title: {color: '#202633', fontSize: 18, fontWeight: '800'},
  filtersContainer: {paddingHorizontal: 14, paddingTop: 14},
  filterRow: {flexDirection: 'row', gap: 10},
  filterGroup: {flex: 1, position: 'relative'},
  employeeFilterGroup: {marginTop: 12, position: 'relative'},
  filterLabel: {color: '#202633', fontSize: 13, fontWeight: '700', marginBottom: 5},
  filterBox: {minHeight: 38, paddingHorizontal: 10, borderRadius: 11, borderWidth: 1, borderColor: '#DDE5F0', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1},
  filterValue: {flex: 1, color: '#202633', fontSize: 12, fontWeight: '600'},
  dropdownMenu: {position: 'absolute', top: 62, left: 0, right: 0, maxHeight: 190, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#DDE5F0', zIndex: 20, elevation: 4},
  dropdownOption: {paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1F5FA'},
  dropdownText: {color: '#202633', fontSize: 12, fontWeight: '600'},
  employeeOptionRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  employeeOptionAvatar: {width: 28, height: 28, borderRadius: 14, backgroundColor: '#E2EBFF'},
  employeeOptionAvatarFallback: {width: 28, height: 28, borderRadius: 14, backgroundColor: '#E2EBFF', alignItems: 'center', justifyContent: 'center'},
  employeeOptionInitial: {color: '#1E3A5F', fontSize: 12, fontWeight: '800'},
  employeeOptionInfo: {flex: 1},
  employeeOptionName: {color: '#202633', fontSize: 12, fontWeight: '700'},
  employeeOptionId: {color: '#69738C', fontSize: 10, marginTop: 2},
  resultsContainer: {paddingHorizontal: 14, paddingTop: 14},
  leaveTable: {backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#DDE5F0', overflow: 'hidden'},
  leaveTableHeader: {minHeight: 38, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F4FA', borderBottomWidth: 1, borderBottomColor: '#E4E9F2'},
  leaveHeaderText: {color: '#47516A', fontSize: 8, fontWeight: '800', textAlign: 'center'},
  leaveTableRow: {minHeight: 54, paddingHorizontal: 6, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5FA'},
  leaveCell: {color: '#202633', fontSize: 8, fontWeight: '600', textAlign: 'center'},
  employeeTableCell: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2},
  leaveAvatar: {width: 24, height: 24, borderRadius: 12, backgroundColor: '#E2EBFF', marginRight: 4},
  leaveAvatarFallback: {width: 24, height: 24, borderRadius: 12, backgroundColor: '#E2EBFF', alignItems: 'center', justifyContent: 'center', marginRight: 4},
  leaveAvatarText: {color: '#1E3A5F', fontSize: 10, fontWeight: '800'},
  leaveEmployeeText: {flex: 1, color: '#202633', fontSize: 8, fontWeight: '700'},
  leaveStatusCell: {color: '#C76400', backgroundColor: '#FFF1E2', borderRadius: 7, paddingHorizontal: 2, paddingVertical: 4, fontSize: 8, fontWeight: '800', textAlign: 'center'},
  absentStatusCell: {color: '#B42318', backgroundColor: '#FEECEB'},
  numberColumn: {flex: 0.35},
  employeeColumn: {flex: 1.6},
  leaveTypeColumn: {flex: 1.05},
  dateColumn: {flex: 1.1},
  daysColumn: {flex: 0.5},
  statusColumn: {flex: 0.85},
  leaveCard: {backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#DDE5F0', padding: 12, marginBottom: 10},
  leaveCardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  leaveEmployee: {color: '#202633', fontSize: 14, fontWeight: '800'},
  leaveDetail: {color: '#5C6882', fontSize: 11, marginTop: 5},
  leaveReason: {color: '#34405A', fontSize: 11, marginTop: 8},
  leaveStatus: {color: '#C76400', backgroundColor: '#FFF1E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: '800'},
  emptyText: {color: '#8A93A6', fontSize: 12, textAlign: 'center', marginTop: 24},
});

export default AdminLeaveReportScreen;
