import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {generatePDF} from 'react-native-html-to-pdf';
import Share from 'react-native-share';

const API_BASE_URL ='https://attendance-backend-1-2bdo.onrender.com';
const getMonthLabel = date => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
};

const getMonthQuery = monthLabel => {
  const [monthName, yearText] = monthLabel.split(' ');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return {
    month: monthNames.indexOf(monthName) + 1,
    year: Number(yearText),
  };
};

const getDateKey = value => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatAttendanceTime = value => (
  value ? new Date(value).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--'
);

const getCheckInMarkerStyle = value => {
  if (!value) {
    return null;
  }

  const checkIn = new Date(value);
  const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
  return checkInMinutes >= 9 * 60 + 45 ? styles.lateMarker : styles.ontimeMarker;
};

const formatWorkingHours = minutes => {
  const totalMinutes = Number(minutes) || 0;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`;
};

const getStatusLabel = status => status || 'Unknown';

const getEmployeeInitial = employee => (employee?.fullName || 'E').charAt(0).toUpperCase();

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getMonthlyAttendanceCounts = records => records.reduce((counts, record) => {
  const status = getStatusLabel(record.status);
  if (status === 'Present') {
    counts.present += 1;
  } else if (status === 'Half Day') {
    counts.halfDay += 1;
  } else if (status === 'Work From Home') {
    counts.present += 1;
  } else if (status === 'Leave') {
    counts.leave += 1;
  } else if (status === 'Absent') {
    counts.absent += 1;
  }
  return counts;
}, {present: 0, leave: 0, absent: 0, late: 0, halfDay: 0});

const getAvailableMonthOptions = joinDate => {
  if (!joinDate || Number.isNaN(new Date(joinDate).getTime())) {
    joinDate = new Date(new Date().getFullYear(), 0, 1);
  }

  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const startDate = joinDate ? new Date(joinDate) : currentMonthStart;
  const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const options = [];
  let cursor = new Date(startMonth);

  while (cursor <= currentMonthStart) {
    options.push(getMonthLabel(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return options;
};

const AdminAttendanceReportScreen = ({adminToken, onBack}) => {
  const [viewFilter, setViewFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showDepartmentMenu, setShowDepartmentMenu] = useState(false);
  const [showEmployeeMenu, setShowEmployeeMenu] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const [monthSummary, setMonthSummary] = useState({workingDays: 0, holidayCount: 0, absentDays: 0});
  const [companyProfile, setCompanyProfile] = useState({});
  const [monthHolidays, setMonthHolidays] = useState([]);

  const departmentMenuOptions = departmentOptions.length ? departmentOptions : ['All Departments'];
  const filteredEmployees = departmentFilter === 'All Departments'
    ? allEmployees
    : allEmployees.filter(employee => employee.departmentName === departmentFilter);
  const selectedEmployee = filteredEmployees.find(employee => (employee.employeeId || employee._id) === selectedEmployeeId)
    || null;
  const attendanceCounts = getMonthlyAttendanceCounts(attendanceRecords);
  const attendanceRows = (() => {
    if (!selectedEmployee || !viewFilter || viewFilter === 'Select Month') {
      return [];
    }

    const {month, year} = getMonthQuery(viewFilter);
    const recordsByDate = new Map(attendanceRecords.map(record => [record.date, record]));
    const holidaysByDate = new Map(monthHolidays.map(holiday => [holiday.date, holiday]));
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
    const todayKey = getDateKey(today);
    const todayRecord = recordsByDate.get(todayKey);
    const todayHoliday = holidaysByDate.has(todayKey);
    const isSundayToday = today.getDay() === 0;
    const lastDay = isCurrentMonth
      ? todayRecord || todayHoliday || isSundayToday ? today.getDate() : today.getDate() - 1
      : new Date(year, month, 0).getDate();
    const joiningDateKey = selectedEmployee.joiningDate
      ? getDateKey(selectedEmployee.joiningDate)
      : '';
    const rows = [];

    for (let day = 1; day <= lastDay; day += 1) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (joiningDateKey && dateKey < joiningDateKey) {
        continue;
      }

      const date = new Date(year, month - 1, day);
      const record = recordsByDate.get(dateKey);
      const holiday = holidaysByDate.get(dateKey);
      rows.push({
        date: dateKey,
        checkIn: record?.checkIn || null,
        checkOut: record?.checkOut || null,
        status: record?.status || (date.getDay() === 0 || holiday ? 'Holiday' : 'Absent'),
        workingMinutes: record?.workingMinutes || 0,
      });
    }

    return rows;
  })();
  const earliestJoiningDate = filteredEmployees
    .map(employee => employee.joiningDate)
    .filter(Boolean)
    .sort((firstDate, secondDate) => new Date(firstDate) - new Date(secondDate))[0];
  const monthMenuOptions = getAvailableMonthOptions(selectedEmployee?.joiningDate || earliestJoiningDate);

  useEffect(() => {
    if (!monthMenuOptions.length) {
      setViewFilter('Select Month');
      return;
    }

    setViewFilter(current => {
      if (current && monthMenuOptions.includes(current)) {
        return current;
      }

      return monthMenuOptions[monthMenuOptions.length - 1];
    });
  }, [monthMenuOptions]);

  useEffect(() => {
    if (!selectedEmployee || !viewFilter || viewFilter === 'Select Month') {
      setAttendanceRecords([]);
      setMonthSummary({workingDays: 0, holidayCount: 0, absentDays: 0});
      setMonthHolidays([]);
      setAttendanceError('');
      return;
    }

    const {month, year} = getMonthQuery(viewFilter);
    const loadAttendance = async () => {
      setAttendanceLoading(true);
      setAttendanceError('');

      try {
        const query = `employeeId=${encodeURIComponent(selectedEmployee.employeeId || selectedEmployee._id)}&year=${year}&month=${month}`;
        const response = await fetch(`${API_BASE_URL}/api/attendance/admin-employee-records?${query}`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        });
        const result = await response.json();

        if (!response.ok || !Array.isArray(result.records)) {
          setAttendanceRecords([]);
          setMonthSummary({workingDays: 0, holidayCount: 0, absentDays: 0});
          setMonthHolidays([]);
          setAttendanceError(result.message || 'Unable to load attendance');
          return;
        }

        setAttendanceRecords(result.records);
        setMonthSummary({
          workingDays: result.workingDays || 0,
          holidayCount: result.holidayCount || 0,
          absentDays: result.absentDays || 0,
        });
        setMonthHolidays(Array.isArray(result.holidays) ? result.holidays : []);
      } catch (error) {
        setAttendanceRecords([]);
        setMonthSummary({workingDays: 0, holidayCount: 0, absentDays: 0});
        setMonthHolidays([]);
        setAttendanceError('Unable to load attendance');
      } finally {
        setAttendanceLoading(false);
      }
    };

    loadAttendance();
  }, [adminToken, selectedEmployee, viewFilter]);

  const handleDownloadReport = async () => {
    if (!selectedEmployee || !viewFilter) {
      Alert.alert('Attendance report', 'Select an employee and month first.');
      return;
    }

    const {year, month} = getMonthQuery(viewFilter);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0).getDate();
    const recordsByDate = new Map(attendanceRecords.map(record => [record.date, record]));
    const holidaysByDate = new Map(monthHolidays.map(holiday => [holiday.date, holiday]));
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const joiningDateKey = selectedEmployee.joiningDate
      ? new Date(selectedEmployee.joiningDate).toISOString().slice(0, 10)
      : '';
    const rows = Array.from({length: monthEnd}, (_, index) => {
      const day = index + 1;
      const date = new Date(year, month - 1, day);
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = recordsByDate.get(dateKey);
      const holiday = holidaysByDate.get(dateKey);
      const isIncompleteDate = dateKey > todayKey || (joiningDateKey && dateKey < joiningDateKey);
      const status = isIncompleteDate ? '' : record?.status || (date.getDay() === 0 || holiday ? 'Holiday' : 'Absent');
      const remarks = isIncompleteDate ? '' : holiday?.description || (date.getDay() === 0 ? 'Sunday' : '');
      return `
        <tr>
          <td>${dateKey}</td>
          <td>${date.toLocaleDateString([], {weekday: 'short'})}</td>
          <td>${isIncompleteDate ? '' : escapeHtml(formatAttendanceTime(record?.checkIn))}</td>
          <td>${isIncompleteDate ? '' : escapeHtml(formatAttendanceTime(record?.checkOut))}</td>
          <td class="status-${status.toLowerCase().replace(/\s/g, '-')}">${escapeHtml(status).toUpperCase()}</td>
          <td>${isIncompleteDate ? '' : escapeHtml(formatWorkingHours(record?.workingMinutes))}</td>
          <td>${escapeHtml(remarks)}</td>
        </tr>
      `;
    }).join('');
    const reportEndDate = new Date(year, month, 0).toLocaleDateString([], {day: '2-digit', month: 'short', year: 'numeric'});
    const reportStartDate = monthStart.toLocaleDateString([], {day: '2-digit', month: 'short', year: 'numeric'});
    const employeeAvatarUrl = selectedEmployee.avatar?.path
      ? `${API_BASE_URL}${selectedEmployee.avatar.path}`
      : '';
    const companyAvatarUrl = companyProfile.avatar?.path
      ? `${API_BASE_URL}${companyProfile.avatar.path}`
      : '';
    const html = `
      <html>
        <head>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #17213D; margin: 0; font-size: 9px; }
            .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #172B9B; padding-bottom: 10px; }
            .company-header { display: flex; align-items: center; }
            .company-avatar { width: 60px; height: 60px; object-fit: contain; margin-right: 10px; }
            .company-avatar-fallback { width: 55px; height: 55px; border-radius: 50%; background: #E2EBFF; color: #172B9B; font-size: 20px; font-weight: bold; display: flex; align-items: center; justify-content: center; margin-right: 10px; }
            .brand { color: #172B9B; font-size: 19px; font-weight: bold; }
            .company-description { color: #47516A; font-size: 15px; max-width: 260px; margin-top: 4px; line-height: 1.4; }
            .report-title { color: #168143; font-size: 20px; font-weight: bold; text-align: right; }
            .period { color: #47516A; font-size: 11px; text-align: right; margin-top: 5px; }
            .employee { display: flex; justify-content: space-between; border: 1px solid #DDE5F0; border-radius: 5px; margin-top: 12px; padding: 10px; }
            .employee-left { display: flex; align-items: center; width: 42%; }
            .employee-avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-right: 12px; }
            .employee-avatar-fallback { width: 86px; height: 86px; border-radius: 50%; background: #E2EBFF; color: #1E3A5F; font-size: 32px; font-weight: bold; display: flex; align-items: center; justify-content: center; margin-right: 12px; }
            .employee-name { color: #178A40; font-size: 25px; font-weight: bold; }
            .employee p { margin: 3px 0; color: #47516A; font-size: 15px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; line-height: 1.7; color: #47516A; font-size: 16px; }
            .details b { color: #17213D; }
            .summary { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; margin-top: 10px; }
            .summary-card { border: 1px solid #DDE5F0; border-radius: 4px; padding: 6px; min-height: 42px; }
            .summary-card b { display: block; font-size: 12px; margin-top: 5px; }
            .present { color: #168143; background: #F1FBF4; }
            .leave { color: #D52B35; background: #FFF3F4; }
            .absent { color: #B42318; background: #FEECEB; }
            .late { color: #D67800; background: #FFF9EF; }
            .half-day { color: #1761D1; background: #F1F6FF; }
            .working { color: #5A52B5; background: #F4F4FF; }
            .holiday { color: #16839A; background: #F1FAFC; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
            th { background: #172B9B; color: white; text-align: center; font-size: 10px; }
            th, td { padding: 5px 4px; border: 1px solid #DDE5F0; font-size: 10px; overflow: hidden; text-align: center; vertical-align: middle; }
            td { white-space: nowrap; }
            .status-present { color: #168143; font-weight: bold; }
            .status-late { color: #D67800; font-weight: bold; }
            .status-half-day { color: #1761D1; font-weight: bold; }
            .status-work-from-home { color: #1769E0; font-weight: bold; }
            .status-leave, .status-absent { color: #D52B35; font-weight: bold; }
            .status-holiday { color: #16839A; font-weight: bold; }
            .report-footer { margin-top: 18px; text-align: right; color: #47516A; font-size: 9px; line-height: 1.6; }
            .footer-company { color: #172B9B; font-size: 11px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="top">
            <div class="company-header">${companyAvatarUrl ? `<img class="company-avatar" src="${escapeHtml(companyAvatarUrl)}" />` : `<div class="company-avatar-fallback">${escapeHtml((companyProfile.companyName || 'C').charAt(0).toUpperCase())}</div>`}<div><div class="brand">${escapeHtml(companyProfile.companyName || 'VibeWork Solutions')}</div><div class="company-description">${escapeHtml(companyProfile.description || '')}</div></div></div>
            <div><div class="report-title">ATTENDANCE REPORT</div><div class="period">${reportStartDate} - ${reportEndDate}</div></div>
          </div>
          <div class="employee">
            <div class="employee-left">${employeeAvatarUrl ? `<img class="employee-avatar" src="${escapeHtml(employeeAvatarUrl)}" />` : `<div class="employee-avatar-fallback">${escapeHtml(getEmployeeInitial(selectedEmployee))}</div>`}<div><div class="employee-name">${escapeHtml(selectedEmployee.fullName || 'Employee')}</div><p>${escapeHtml(selectedEmployee.employeeId || '')}</p><p>${escapeHtml(selectedEmployee.designation || 'Employee')}</p><p>${escapeHtml(selectedEmployee.departmentName || departmentFilter)}</p></div></div>
            <div class="details"><span><b>Date of Joining</b><br>${escapeHtml(selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : '--')}</span><span><b>Reporting Manager</b><br>${escapeHtml(companyProfile.managerName || '--')}</span><span><b>Office Location</b><br>${escapeHtml(selectedEmployee.officeLocation || '--')}</span><span><b>Contact</b><br>${escapeHtml(selectedEmployee.phoneNumber || '--')}</span></div>
          </div>
          <div class="summary">
            <div class="summary-card present">Present<b>${attendanceCounts.present}</b>Days</div>
            <div class="summary-card leave">Leave<b>${attendanceCounts.leave}</b>Days</div>
            <div class="summary-card absent">Absent<b>${monthSummary.absentDays}</b>Days</div>
            <div class="summary-card half-day">Half Day<b>${attendanceCounts.halfDay}</b>Days</div>
            <div class="summary-card working">Working Days<b>${monthSummary.workingDays}</b>Days</div>
            <div class="summary-card holiday">Holidays<b>${monthSummary.holidayCount}</b>Days</div>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Day</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Working Hours</th><th>Remarks</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="report-footer">
            <div class="footer-company">${escapeHtml(companyProfile.companyName || 'VibeWork Solutions')}</div>
            <div>${escapeHtml(companyProfile.email || '')}</div>
            <div>${escapeHtml(companyProfile.phone || '')}</div>
          </div>
        </body>
      </html>
    `;

    try {
      const file = await generatePDF({
        html,
        fileName: `${selectedEmployee.employeeId || 'employee'}-${viewFilter.replace(/\s/g, '-')}`,
        baseURL: 'file:///android_asset/',
      });
      if (!file?.filePath) {
        throw new Error('PDF file path was not returned');
      }
      await Share.open({
        url: file.filePath.startsWith('file://') ? file.filePath : `file://${file.filePath}`,
        type: 'application/pdf',
        title: 'Download attendance report',
        failOnCancel: false,
      });
    } catch (error) {
      Alert.alert('Attendance report', 'Unable to create the PDF report.');
    }
  };

  const loadEmployees = useCallback(async (chosenDepartment = 'All Departments') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees`, {
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      const result = await response.json();

      if (!response.ok || !Array.isArray(result)) {
        setAllEmployees([]);
        return;
      }

      const normalizedEmployees = chosenDepartment === 'All Departments'
        ? result
        : result.filter(employee => employee.departmentName === chosenDepartment);

      setAllEmployees(normalizedEmployees);
    } catch (error) {
      setAllEmployees([]);
    }
  }, [adminToken]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/departments`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        });
        const result = await response.json();

        if (response.ok && Array.isArray(result)) {
          const departments = result
            .map(item => item.departmentName)
            .filter(Boolean);
          setDepartmentOptions(['All Departments', ...departments]);
          return;
        }

        setDepartmentOptions(['All Departments']);
      } catch (error) {
        setDepartmentOptions(['All Departments']);
      }
    };

    if (adminToken) {
      loadDepartments();
      loadEmployees();
    }
  }, [adminToken, loadEmployees]);

  useEffect(() => {
    if (!adminToken) {
      return;
    }

    const loadCompanyProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/company-profile`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        });
        const result = await response.json();
        if (response.ok) {
          setCompanyProfile(result || {});
        }
      } catch (error) {
        setCompanyProfile({});
      }
    };

    loadCompanyProfile();
  }, [adminToken]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" />

      <View style={styles.navbar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.title}>Attendance Report</Text>
      </View>

      <View style={styles.controlsWrap}>
        <View style={styles.filterGroup}>
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Month</Text>
            <TouchableOpacity
              style={styles.filterCard}
              activeOpacity={0.85}
              onPress={() => {
                setShowDepartmentMenu(false);
                setShowViewMenu(current => !current);
              }}
            >
              <View style={styles.filterValueRow}>
                <Text style={styles.filterValue} numberOfLines={1}>{viewFilter || 'Select Month'}</Text>
                <Ionicons name="chevron-down" size={16} color="#4B556B" />
              </View>
            </TouchableOpacity>
            {showViewMenu && (
              <View style={styles.dropdownMenu}>
                {monthMenuOptions.map(item => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.dropdownOption, viewFilter === item && styles.dropdownOptionSelected]}
                    onPress={() => {
                      setViewFilter(item);
                      setShowViewMenu(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dropdownText, viewFilter === item && styles.dropdownTextSelected]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Department</Text>
            <TouchableOpacity
              style={styles.filterCard}
              activeOpacity={0.85}
              onPress={() => {
                setShowViewMenu(false);
                setShowDepartmentMenu(current => !current);
              }}
            >
              <View style={styles.filterValueRow}>
                <Text style={styles.filterValue} numberOfLines={1}>{departmentFilter}</Text>
                <Ionicons name="chevron-down" size={16} color="#4B556B" />
              </View>
            </TouchableOpacity>
            {showDepartmentMenu && (
              <View style={styles.dropdownMenu}>
                {departmentMenuOptions.map(item => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.dropdownOption, departmentFilter === item && styles.dropdownOptionSelected]}
                    onPress={() => {
                      setDepartmentFilter(item);
                      setShowDepartmentMenu(false);
                      setShowEmployeeMenu(false);
                      setSelectedEmployeeId('');
                      setAttendanceRecords([]);
                      setMonthSummary({workingDays: 0, holidayCount: 0});
                      setMonthHolidays([]);
                      loadEmployees(item);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dropdownText, departmentFilter === item && styles.dropdownTextSelected]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.employeeSection}>
          <Text style={styles.filterLabel}>Selected Department Employees</Text>
          <View style={styles.employeeBox}>
            {filteredEmployees.length ? (
              <TouchableOpacity
                style={styles.employeeSelector}
                activeOpacity={0.85}
                onPress={() => {
                  setShowViewMenu(false);
                  setShowDepartmentMenu(false);
                  setShowEmployeeMenu(current => !current);
                }}
              >
                <View style={styles.employeeSelectorContent}>
                  {selectedEmployee ? (
                    <View style={styles.selectedEmployeeSummary}>
                      {selectedEmployee.avatar?.path ? (
                        <Image
                          source={{uri: `${API_BASE_URL}${selectedEmployee.avatar.path}`}}
                          style={styles.selectedEmployeeAvatar}
                        />
                      ) : (
                        <View style={styles.selectedEmployeeAvatarFallback}>
                          <Text style={styles.selectedEmployeeAvatarFallbackText}>
                            {(selectedEmployee.fullName || 'E').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}

                      <View style={styles.selectedEmployeeTextWrap}>
                        <Text style={styles.selectedEmployeeName} numberOfLines={1}>
                          {selectedEmployee.fullName || 'Employee'}
                        </Text>
                        <Text style={styles.selectedEmployeeIdText} numberOfLines={1}>
                          {selectedEmployee.employeeId || 'Employee ID'}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.employeeSelectorText} numberOfLines={1}>
                      {filteredEmployees.length} employee{filteredEmployees.length === 1 ? '' : 's'}
                    </Text>
                  )}
                  <Ionicons name="chevron-down" size={16} color="#4B556B" />
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={styles.emptyText}>No employees</Text>
            )}

            {showEmployeeMenu && filteredEmployees.length > 0 && (
              <View style={styles.employeeDropdownMenu}>
                {filteredEmployees.map(employee => (
                  <TouchableOpacity
                    key={employee.employeeId || employee._id}
                    style={[
                      styles.employeeDropdownItem,
                      selectedEmployeeId === (employee.employeeId || employee._id) && styles.employeeDropdownItemSelected,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedEmployeeId(employee.employeeId || employee._id);
                      setShowEmployeeMenu(false);
                    }}
                  >
                    <View style={styles.employeeDropdownRow}>
                      {employee.avatar?.path ? (
                        <Image
                          source={{uri: `${API_BASE_URL}${employee.avatar.path}`}}
                          style={styles.employeeDropdownAvatar}
                        />
                      ) : (
                        <View style={styles.employeeDropdownAvatarFallback}>
                          <Text style={styles.employeeDropdownAvatarFallbackText}>
                            {(employee.fullName || 'E').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}

                      <View style={styles.employeeDropdownInfo}>
                        <Text style={styles.employeeDropdownName} numberOfLines={1}>
                          {employee.fullName || 'Employee'}
                        </Text>
                        <Text style={styles.employeeDropdownId} numberOfLines={1}>
                          {employee.employeeId || 'Employee ID'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.attendanceSection}>
        {selectedEmployee && (
          <View style={styles.employeeDetailsCard}>
            <View style={styles.employeeDetailsTopRow}>
              {selectedEmployee.avatar?.path ? (
                <Image
                  source={{uri: `${API_BASE_URL}${selectedEmployee.avatar.path}`}}
                  style={styles.employeeDetailsAvatar}
                />
              ) : (
                <View style={styles.employeeDetailsAvatarFallback}>
                  <Text style={styles.employeeDetailsAvatarText}>{getEmployeeInitial(selectedEmployee)}</Text>
                </View>
              )}
              <View style={styles.employeeDetailsInfo}>
                <Text style={styles.employeeDetailsName} numberOfLines={1}>{selectedEmployee.fullName || 'Employee'}</Text>
                <Text style={styles.employeeDetailsMeta} numberOfLines={1}>
                  {selectedEmployee.employeeId || 'Employee ID'}  •  {selectedEmployee.designation || 'Employee'}
                </Text>
                <Text style={styles.employeeDetailsDepartment} numberOfLines={1}>
                  {selectedEmployee.departmentName || departmentFilter}
                </Text>
              </View>
              <Text style={styles.employeeActiveBadge}>Active</Text>
            </View>

            <View style={styles.employeeStatsRow}>
              <View style={[styles.employeeStatCard, styles.presentStatCard]}>
                <Text style={styles.presentStatLabel}>Present</Text>
                <Text style={styles.presentStatValue}>{attendanceCounts.present}</Text>
                <Text style={styles.statUnit}>Days</Text>
              </View>
              <View style={[styles.employeeStatCard, styles.leaveStatCard]}>
                <Text style={styles.leaveStatLabel}>Leave</Text>
                <Text style={styles.leaveStatValue}>{attendanceCounts.leave}</Text>
                <Text style={styles.statUnit}>Days</Text>
              </View>
              <View style={[styles.employeeStatCard, styles.absentStatCard]}>
                <Text style={styles.absentStatLabel}>Absent</Text>
                <Text style={styles.absentStatValue}>{monthSummary.absentDays}</Text>
                <Text style={styles.statUnit}>Days</Text>
              </View>
              <View style={[styles.employeeStatCard, styles.halfDayStatCard]}>
                <Text style={styles.halfDayStatLabel}>Half Day</Text>
                <Text style={styles.halfDayStatValue}>{attendanceCounts.halfDay}</Text>
                <Text style={styles.statUnit}>Days</Text>
              </View>
              <View style={[styles.employeeStatCard, styles.workingDaysStatCard]}>
                <Text style={styles.workingDaysStatLabel}>Working Days</Text>
                <Text style={styles.workingDaysStatValue}>{monthSummary.workingDays}</Text>
                <Text style={styles.statUnit}>Days</Text>
              </View>
              <View style={[styles.employeeStatCard, styles.holidaysStatCard]}>
                <Text style={styles.holidaysStatLabel}>Holidays</Text>
                <Text style={styles.holidaysStatValue}>{monthSummary.holidayCount}</Text>
                <Text style={styles.statUnit}>Days</Text>
              </View>
            </View>
          </View>
        )}
        <Text style={styles.attendanceHeading}>
          Attendance
        </Text>
        {attendanceLoading ? (
          <Text style={styles.emptyText}>Loading attendance...</Text>
        ) : attendanceError ? (
          <Text style={styles.errorText}>{attendanceError}</Text>
        ) : !selectedEmployee ? (
          <Text style={styles.emptyText}>Select an employee to view attendance</Text>
        ) : attendanceRows.length === 0 ? (
          <Text style={styles.emptyText}>No attendance for {viewFilter}</Text>
        ) : (
          <View style={styles.attendanceList}>
            <View style={styles.attendanceHeader}>
              <Text style={[styles.attendanceHeaderText, styles.dateColumn]}>Date</Text>
              <Text style={[styles.attendanceHeaderText, styles.timeColumn]}>Check In</Text>
              <Text style={[styles.attendanceHeaderText, styles.timeColumn]}>Check Out</Text>
              <Text style={[styles.attendanceHeaderText, styles.statusColumn]}>Status</Text>
              <Text style={[styles.attendanceHeaderText, styles.hoursColumn]}>Working Hours</Text>
            </View>
            {attendanceRows.map(record => (
              <View key={record._id || record.date} style={styles.attendanceRow}>
                <View style={[styles.dateColumn, styles.dateCell]}>
                  <Text style={styles.attendanceCell}>{record.date}</Text>
                  {getCheckInMarkerStyle(record.checkIn) ? <View style={getCheckInMarkerStyle(record.checkIn)} /> : null}
                </View>
                <Text style={[styles.attendanceCell, styles.timeColumn]}>{formatAttendanceTime(record.checkIn)}</Text>
                <Text style={[styles.attendanceCell, styles.timeColumn, styles.checkOutCell]}>{formatAttendanceTime(record.checkOut)}</Text>
                <View style={[styles.statusColumn, styles.statusDataColumn]}>
                  <Text style={[styles.attendanceStatus, styles[`status${getStatusLabel(record.status).replace(/\s/g, '')}`]]}>
                    {getStatusLabel(record.status)}
                  </Text>
                </View>
                <Text style={[styles.attendanceCell, styles.hoursColumn]}>{formatWorkingHours(record.workingMinutes)}</Text>
              </View>
            ))}
          </View>
        )}
        {selectedEmployee && (
          <TouchableOpacity style={styles.downloadReportButton} onPress={handleDownloadReport} activeOpacity={0.85}>
            <Ionicons name="download-outline" size={22} color="#FFFFFF" />
            <Text style={styles.downloadReportText}>Download Report (PDF/Excel)</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  navbar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EEF5',
    backgroundColor: '#F6F8FC',
  },
  backButton: {
    position: 'absolute',
    left: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#202633',
    fontSize: 17,
    fontWeight: '800',
  },
  controlsWrap: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F6F8FC',
  },
  filterGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterContainer: {
    flex: 1,
    position: 'relative',
  },
  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE5F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 26,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  filterValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    color: '#202633',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    marginLeft: 2,
  },
  filterValue: {
    color: '#202633',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDE5F0',
    paddingVertical: 4,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 10,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownOptionSelected: {
    backgroundColor: '#EEF4FF',
  },
  dropdownText: {
    color: '#202633',
    fontSize: 12,
    fontWeight: '500',
  },
  dropdownTextSelected: {
    color: '#0F5ED7',
    fontWeight: '700',
  },
  employeeSection: {
    marginTop: 12,
  },
  employeeBox: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE5F0',
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  employeeSelector: {
    minHeight: 26,
    justifyContent: 'center',
  },
  employeeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  employeeSelectorText: {
    color: '#202633',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  selectedEmployeeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  selectedEmployeeAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2EBFF',
  },
  selectedEmployeeAvatarFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2EBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedEmployeeAvatarFallbackText: {
    color: '#1E3A5F',
    fontSize: 9,
    fontWeight: '800',
  },
  selectedEmployeeTextWrap: {
    flex: 1,
  },
  selectedEmployeeName: {
    color: '#202633',
    fontSize: 11,
    fontWeight: '700',
  },
  selectedEmployeeIdText: {
    color: '#5C6882',
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  employeeDropdownMenu: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDE5F0',
    paddingVertical: 2,
    maxHeight: 170,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 12,
  },
  employeeDropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5FA',
  },
  employeeDropdownItemSelected: {
    backgroundColor: '#EEF4FF',
  },
  employeeDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeDropdownAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2EBFF',
  },
  employeeDropdownAvatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2EBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeDropdownAvatarFallbackText: {
    color: '#1E3A5F',
    fontSize: 10,
    fontWeight: '800',
  },
  employeeDropdownInfo: {
    flex: 1,
  },
  employeeDropdownName: {
    color: '#202633',
    fontSize: 11,
    fontWeight: '700',
  },
  employeeDropdownId: {
    color: '#5C6882',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  attendanceSection: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  employeeDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 8,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  employeeDetailsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeDetailsAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E2EBFF',
  },
  employeeDetailsAvatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2EBFF',
  },
  employeeDetailsAvatarText: {
    color: '#1E3A5F',
    fontSize: 22,
    fontWeight: '800',
  },
  employeeDetailsInfo: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  employeeDetailsName: {
    color: '#202633',
    fontSize: 14,
    fontWeight: '800',
  },
  employeeDetailsMeta: {
    color: '#34405A',
    fontSize: 10,
    marginTop: 3,
  },
  employeeDetailsDepartment: {
    color: '#34405A',
    fontSize: 10,
    marginTop: 3,
  },
  employeeActiveBadge: {
    color: '#159447',
    backgroundColor: '#EAF8EE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  employeeStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  employeeStatCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 90,
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    padding: 6,
  },
  presentStatCard: {
    backgroundColor: '#F1FBF4',
    borderColor: '#DCEFE1',
  },
  leaveStatCard: {
    backgroundColor: '#FFF3F4',
    borderColor: '#F7DDE0',
  },
  absentStatCard: {
    backgroundColor: '#FEECEB',
    borderColor: '#F6D4D1',
  },
  lateStatCard: {
    backgroundColor: '#FFF9EF',
    borderColor: '#F6E8C9',
  },
  halfDayStatCard: {
    backgroundColor: '#F1F6FF',
    borderColor: '#DCE8FF',
  },
  workingDaysStatCard: {
    backgroundColor: '#F4F4FF',
    borderColor: '#E0E0FA',
  },
  holidaysStatCard: {
    backgroundColor: '#F1FAFC',
    borderColor: '#D8EEF2',
  },
  presentStatLabel: {color: '#178A40', fontSize: 9, fontWeight: '700'},
  leaveStatLabel: {color: '#E01B24', fontSize: 9, fontWeight: '700'},
  absentStatLabel: {color: '#B42318', fontSize: 9, fontWeight: '700'},
  lateStatLabel: {color: '#D67800', fontSize: 9, fontWeight: '700'},
  halfDayStatLabel: {color: '#1761D1', fontSize: 9, fontWeight: '700'},
  workingDaysStatLabel: {color: '#5A52B5', fontSize: 9, fontWeight: '700'},
  holidaysStatLabel: {color: '#16839A', fontSize: 9, fontWeight: '700'},
  presentStatValue: {color: '#159447', fontSize: 18, fontWeight: '800', marginTop: 1},
  leaveStatValue: {color: '#E01B24', fontSize: 18, fontWeight: '800', marginTop: 1},
  absentStatValue: {color: '#B42318', fontSize: 18, fontWeight: '800', marginTop: 1},
  lateStatValue: {color: '#F07B00', fontSize: 18, fontWeight: '800', marginTop: 1},
  halfDayStatValue: {color: '#1761D1', fontSize: 18, fontWeight: '800', marginTop: 1},
  workingDaysStatValue: {color: '#5A52B5', fontSize: 18, fontWeight: '800', marginTop: 1},
  holidaysStatValue: {color: '#16839A', fontSize: 18, fontWeight: '800', marginTop: 1},
  statUnit: {color: '#44506A', fontSize: 9, marginTop: -1},
  attendanceHeading: {
    color: '#202633',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  downloadReportButton: {
    minHeight: 40,
    marginTop: 10,
    marginHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#172B9B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  downloadReportText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  attendanceList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE5F0',
    overflow: 'hidden',
  },
  attendanceHeader: {
    minHeight: 34,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F4FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E9F2',
  },
  attendanceHeaderText: {
    color: '#47516A',
    fontSize: 9,
    fontWeight: '800',
  },
  attendanceRow: {
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5FA',
  },
  attendanceCell: {
    color: '#202633',
    fontSize: 9,
    fontWeight: '600',
    flexShrink: 0,
  },
  dateCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 6,
  },
  lateMarker: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F4C542',
  },
  ontimeMarker: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  checkOutCell: {
    paddingRight: 8,
  },
  attendanceStatus: {
    paddingHorizontal: 5,
    paddingLeft: 0,
    paddingVertical: 3,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '700',
  },
  dateColumn: {
    flex: 1.35,
  },
  timeColumn: {
    flex: 1,
  },
  statusColumn: {
    flex: 1.1,
    minWidth: 0,
  },
  statusHeaderColumn: {
    paddingLeft: 8,
  },
  statusDataColumn: {
    paddingRight: 8,
  },
  hoursColumn: {
    flex: 1.25,
    minWidth: 0,
  },
  statusPresent: {
    color: '#117A45',
    backgroundColor: '#E7F7EE',
  },
  statusLate: {
    color: '#A85B00',
    backgroundColor: '#FFF2D9',
  },
  statusHalfDay: {
    color: '#8D3E89',
    backgroundColor: '#F8E9F7',
  },
  statusWorkFromHome: {
    color: '#1769E0',
    backgroundColor: '#EAF1FF',
  },
  statusLeave: {
    color: '#B42318',
    backgroundColor: '#FEECEB',
  },
  statusHoliday: {
    color: '#345B9B',
    backgroundColor: '#EAF1FF',
  },
  errorText: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    color: '#8A93A6',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default AdminAttendanceReportScreen;
