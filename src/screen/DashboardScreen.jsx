import React, {useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ADMIN_NOTIFICATIONS_ENABLED_KEY = 'admin_notifications_enabled';
import EmployeeScreen from './EmployeeScreen';
import DepartmentScreen from './DepartmentScreen';
import AttendanceScreen from './AttendanceScreen';
import LeaveScreen from './LeaveScreen';
import MoreScreen from './MoreScreen';
import NotificationScreen from './NotificationScreen';

const API_BASE_URL = 'https://attendance-backend-1-2bdo.onrender.com';

const dateKey = (year, month, day) => (
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
);

const holidayDateKey = value => String(value).slice(0, 10);

const formatHolidayDate = value => {
  const [year, month, day] = holidayDateKey(value).split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

const formatLeaveDate = value => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
}).format(new Date(value));

const formatCheckInTime = value => value
  ? new Intl.DateTimeFormat('en-US', {hour: '2-digit', minute: '2-digit'}).format(new Date(value))
  : '--';

const getEmployeeAttendanceStatus = employee => {
  if (employee.status === 'Leave' || employee.status === 'Work From Home') {
    return 'Leave';
  }

  if (employee.status === 'Holiday') {
    return 'Holiday';
  }

  if (employee.status === 'Absent') {
    return 'Absent';
  }

  if (!employee.inTime && !employee.outTime) {
    return 'Absent';
  }

  if (employee.outTime) {
    const checkOut = new Date(employee.outTime);
    if (Number.isNaN(checkOut.getTime())) {
      return '--';
    }

    const checkOutMinutes = checkOut.getHours() * 60 + checkOut.getMinutes();
    return checkOutMinutes < 14 * 60 ? 'Half Day' : 'Present';
  }

  return '--';
};

const isLateCheckIn = employee => {
  if (!employee?.inTime) {
    return false;
  }

  const checkIn = new Date(employee.inTime);
  if (Number.isNaN(checkIn.getTime())) {
    return false;
  }

  return (checkIn.getHours() * 60 + checkIn.getMinutes()) >= 9 * 60 + 45;
};

const getAvatarUri = avatar => {
  if (!avatar?.path) {
    return null;
  }

  return avatar.path.startsWith('http') ? avatar.path : `${API_BASE_URL}${avatar.path}`;
};

const tabs = [
  {label: 'Dashboard', icon: 'home-outline'},
  {label: 'Attendance', icon: 'calendar-outline'},
  {label: 'Employees', icon: 'people-outline'},
  {label: 'Leave', icon: 'document-text-outline'},
  {label: 'Department', icon: 'business-outline'},
  {label: 'More', icon: 'menu-outline'},
];

const DashboardScreen = ({adminToken, onLogout, themeMode = 'light', onToggleTheme, notificationTarget, notificationRefreshKey, onNotificationTargetHandled}) => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [employeeCount, setEmployeeCount] = useState(0);
  const [attendanceSummary, setAttendanceSummary] = useState({present: 0, halfDay: 0, late: 0, absent: 0, leave: 0});
  const [checkedInEmployees, setCheckedInEmployees] = useState([]);
  const [absentEmployees, setAbsentEmployees] = useState([]);
  const [leaveEmployees, setLeaveEmployees] = useState([]);
  const [selectedCheckedInEmployee, setSelectedCheckedInEmployee] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [departmentUsers, setDepartmentUsers] = useState([]);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllLeaveRequests, setShowAllLeaveRequests] = useState(false);
  const [companyProfileName, setCompanyProfileName] = useState('Manager');
  const [selectedMoreMenu, setSelectedMoreMenu] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedHolidayId, setSelectedHolidayId] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationLeaveStatus, setNotificationLeaveStatus] = useState('Pending');
  const [adminNotificationsEnabled, setAdminNotificationsEnabled] = useState(true);
  const [adminNotificationCount, setAdminNotificationCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const dashboardScrollRef = useRef(null);
  const eventsOffset = useRef(0);

  useEffect(() => {
    if (!notificationTarget) {
      return;
    }

    if (notificationTarget.type === 'Attendance') {
      setActiveTab('Attendance');
    } else {
      setNotificationLeaveStatus(notificationTarget.status || 'Pending');
      setActiveTab('Leave');
    }
    onNotificationTargetHandled?.();
  }, [notificationTarget, onNotificationTargetHandled]);

  useEffect(() => {
    AsyncStorage.getItem(ADMIN_NOTIFICATIONS_ENABLED_KEY).then(enabledValue => {
      setAdminNotificationsEnabled(enabledValue !== 'false');
    }).catch(() => {
      setAdminNotificationsEnabled(true);
    });
  }, []);

  useEffect(() => {
    if (!adminToken || adminNotificationsEnabled === false) {
      setAdminNotificationCount(0);
      return undefined;
    }

    let cancelled = false;
    const loadUnreadNotificationCount = async () => {
      try {
        const [response, storedReadIds, storedDeletedIds] = await Promise.all([
          fetch('https://attendance-backend-1-2bdo.onrender.com/api/admin/notifications', {headers: {Authorization: `Bearer ${adminToken}`}}),
          AsyncStorage.getItem('admin_read_notification_ids'),
          AsyncStorage.getItem('admin_deleted_notification_ids'),
        ]);
        const result = await response.json().catch(() => ({notifications: []}));
        const notifications = Array.isArray(result?.notifications) ? result.notifications : [];
        const readIds = storedReadIds ? JSON.parse(storedReadIds) : [];
        const deletedIds = storedDeletedIds ? JSON.parse(storedDeletedIds) : [];
        const count = notifications.filter(notification => {
          const id = notification.id || `admin-notification-${notification.referenceId || ''}`;
          return notification.unread !== false && !readIds.includes(id) && !deletedIds.includes(id);
        }).length;
        if (!cancelled) {
          setAdminNotificationCount(count);
        }
      } catch (error) {
        if (!cancelled) {
          setAdminNotificationCount(0);
        }
      }
    };

    loadUnreadNotificationCount();
    return () => {
      cancelled = true;
    };
  }, [adminToken, adminNotificationsEnabled, notificationRefreshKey]);

  const handleHolidaySaved = holiday => {
    setHolidays(current => current.some(item => item._id === holiday._id)
      ? current
      : [...current, holiday]);
  };

  const handleHolidayDeleted = holidayId => {
    setHolidays(current => current.filter(item => item._id !== holidayId));
  };

  const calendarDays = (() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array(firstWeekday).fill(null),
      ...Array.from({length: daysInMonth}, (_, index) => index + 1),
    ];
  })();

  const calendarMonth = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(calendarDate);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === calendarDate.getFullYear()
    && today.getMonth() === calendarDate.getMonth();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const upcomingHolidays = holidays
    .filter(holiday => holidayDateKey(holiday.date) >= todayKey)
    .sort((first, second) => holidayDateKey(first.date).localeCompare(holidayDateKey(second.date)));
  const visibleEvents = showAllEvents ? upcomingHolidays : upcomingHolidays.slice(0, 3);
  const visibleLeaveRequests = showAllLeaveRequests ? leaveRequests : leaveRequests.slice(0, 3);
  const notificationCount = adminNotificationsEnabled
    ? adminNotificationCount
    : 0;
  const attendanceTotal = employeeCount || 0;
  const halfDayCount = Math.max(
    attendanceSummary.halfDay || 0,
    checkedInEmployees.filter(employee => getEmployeeAttendanceStatus(employee) === 'Half Day').length,
  );
  const lateCount = Math.max(
    attendanceSummary.late || 0,
    checkedInEmployees.filter(isLateCheckIn).length,
  );
  const attendanceBreakdownTotal = attendanceSummary.present
    + lateCount
    + halfDayCount
    + attendanceSummary.absent
    + attendanceSummary.leave;
  const graphTotal = attendanceBreakdownTotal || attendanceTotal;
  const presentPercentage = graphTotal
    ? Math.round((attendanceSummary.present / graphTotal) * 100)
    : 0;
  const latePercentage = graphTotal
    ? Math.round((lateCount / graphTotal) * 100)
    : 0;
  const halfDayPercentage = graphTotal
    ? Math.round((halfDayCount / graphTotal) * 100)
    : 0;
  const absentPercentage = graphTotal
    ? Math.round((attendanceSummary.absent / graphTotal) * 100)
    : 0;
  const leavePercentage = graphTotal
    ? Math.round((attendanceSummary.leave / graphTotal) * 100)
    : 0;

  const loadEmployeeCount = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees`, {
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      const employees = await response.json();
      if (response.ok && Array.isArray(employees)) {
        setEmployeeCount(employees.length);
      }
    } catch (error) {
      setEmployeeCount(0);
    }
  };

  const loadCompanyProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/company-profile`, {
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      const result = await response.json();
      if (response.ok && result) {
        const profileName = result.managerName || result.companyName || 'Manager';
        setCompanyProfileName(profileName);
      }
    } catch (error) {
      setCompanyProfileName('Manager');
    }
  };

  const loadAttendanceSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/admin-summary?date=${todayKey}`, {
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      const result = await response.json();
      if (response.ok) {
        setAttendanceSummary({
          present: result.present || 0,
          halfDay: result.halfDay || 0,
          late: result.late || 0,
          absent: result.absent || 0,
          leave: result.leave || 0,
        });
      }
    } catch (error) {
      setAttendanceSummary({present: 0, halfDay: 0, late: 0, absent: 0, leave: 0});
    }
  };

  const loadCheckedInEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/admin-records?date=${todayKey}`, {
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      const result = await response.json().catch(() => ({records: [], checkedInRecords: [], absentEmployees: []}));
      const records = Array.isArray(result?.records) ? result.records : [];
      const checkedIn = Array.isArray(result?.checkedInRecords)
        ? result.checkedInRecords
        : records.filter(record => record.status !== 'Absent');
      const absent = Array.isArray(result?.absentEmployees)
        ? result.absentEmployees
        : records.filter(record => record.status === 'Absent');
      const leave = Array.isArray(result?.leaveEmployees)
        ? result.leaveEmployees
        : records.filter(record => record.status === 'Leave');

      if (response.ok) {
        const fetchedHalfDayCount = records.filter(record => getEmployeeAttendanceStatus(record) === 'Half Day').length;
        setAttendanceSummary(current => ({...current, halfDay: fetchedHalfDayCount}));
        setCheckedInEmployees(checkedIn);
        setAbsentEmployees(absent);
        setLeaveEmployees(leave);
      }
    } catch (error) {
      setCheckedInEmployees([]);
      setAbsentEmployees([]);
      setLeaveEmployees([]);
    }
  };

  const loadDepartmentUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      const result = await response.json().catch(() => []);
      if (response.ok && Array.isArray(result)) {
        setDepartmentUsers(result);
      }
    } catch (error) {
      setDepartmentUsers([]);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      const [leaveResponse, employeeResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/leaves`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        }),
        fetch(`${API_BASE_URL}/api/employees`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        }),
      ]);

      const leaveResult = await leaveResponse.json().catch(() => ({leaves: []}));
      const employeeResult = await employeeResponse.json().catch(() => []);
      const allLeaves = Array.isArray(leaveResult)
        ? leaveResult
        : Array.isArray(leaveResult?.leaves)
          ? leaveResult.leaves
          : [];

      const pendingLeaves = allLeaves.filter(leave => (leave?.status || '').toLowerCase() === 'pending');
      const employeeMap = new Map(
        Array.isArray(employeeResult)
          ? employeeResult.map(employee => [employee.employeeId, employee])
          : []
      );

      const mappedRequests = pendingLeaves.map(leave => {
        const employee = employeeMap.get(leave.employeeId);
        return {
          ...leave,
          id: leave.id || leave._id,
          employeeName: leave.employeeName || employee?.fullName || employee?.name || leave.employeeId || 'Employee',
          avatar: leave.avatar || employee?.avatar || null,
        };
      });

      setLeaveRequests(mappedRequests);
    } catch (error) {
      setLeaveRequests([]);
    }
  };

  const loadHolidays = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/holidays`, {
        headers: {Authorization: `Bearer ${adminToken}`},
      });
      const result = await response.json();
      if (response.ok && Array.isArray(result)) {
        setHolidays(result);
      }
    } catch (error) {
      setHolidays([]);
    }
  };

  const refreshDashboardData = async () => {
    if (!adminToken || refreshing) {
      return;
    }

    setRefreshing(true);
    try {
      await Promise.all([
        loadEmployeeCount(),
        loadCompanyProfile(),
        loadAttendanceSummary(),
        loadCheckedInEmployees(),
        loadDepartmentUsers(),
        loadLeaveRequests(),
        loadHolidays(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadEmployeeCount();
      loadCompanyProfile();
      loadAttendanceSummary();
      loadCheckedInEmployees();
    }
  }, [adminToken, todayKey]);

  useEffect(() => {
    if (adminToken) {
      loadDepartmentUsers();
    }
  }, [adminToken]);

  useEffect(() => {
    if (adminToken) {
      loadLeaveRequests();
    }
  }, [adminToken]);

  const updateLeaveRequestStatus = async (leaveId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leaves/${leaveId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({status}),
      });
      const result = await response.json();
      if (response.ok && result.leave) {
        setLeaveRequests(current => current.map(request => {
          const matches = request.id === leaveId || request._id === leaveId;
          if (!matches) {
            return request;
          }

          return {
            ...request,
            ...result.leave,
            id: result.leave.id || result.leave._id || request.id,
            employeeName: request.employeeName || result.leave.employeeName || request.employeeId || 'Employee',
            avatar: request.avatar || result.leave.avatar || null,
          };
        }));
      }
    } catch (error) {
      // Keep the request unchanged when the update cannot reach the server.
    }
  };

  useEffect(() => {
    if (adminToken) {
      loadHolidays();
    }
  }, [adminToken]);

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const renderDashboardContent = () => (
    <>
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greetingText}>
            <Text style={styles.greetingPrefix}>{getGreetingText()}, </Text>
            <Text style={styles.greetingName}>{companyProfileName}</Text>
            <Text style={styles.greetingSuffix}> 👋</Text>
          </Text>
          <Text style={styles.subtitle}>Here's today's overview</Text>
        </View>

        <TouchableOpacity
          style={styles.notificationButton}
          activeOpacity={0.8}
          onPress={() => {
            setActiveTab('More');
            setShowNotifications(true);
          }}
        >
          <Ionicons name="notifications-outline" size={24} color="#1F2A44" />
          {notificationCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.dateText}>{new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(today)}</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.employeeIcon]}>
              <Ionicons name="people" size={21} color="#FFFFFF" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Employees</Text>
              <Text style={styles.statValue}>{employeeCount}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.presentIcon]}>
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Present</Text>
              <Text style={styles.statValue}>{attendanceSummary.present}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.lateIcon]}>
              <Ionicons name="time" size={21} color="#FFFFFF" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Late</Text>
              <Text style={styles.statValue}>{lateCount}</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.absentIcon]}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Absent</Text>
              <Text style={styles.statValue}>{attendanceSummary.absent}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.leaveIcon]}>
              <Ionicons name="document-text" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Leave</Text>
              <Text style={styles.statValue}>{attendanceSummary.leave}</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, styles.halfDayIcon]}>
              <Ionicons name="time" size={21} color="#FFFFFF" />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>Half Day</Text>
              <Text style={styles.statValue}>{halfDayCount}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.attendanceCard}>
        <View style={styles.attendanceHeader}>
          <Text style={styles.attendanceTitle}>Today's Attendance</Text>
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.attendanceBody}>
          <View style={styles.progressList}>
            <View style={styles.progressRow}>
              <View style={[styles.progressDot, styles.presentDot]} />
              <Text style={styles.progressLabel}>Present</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.presentFill, {width: `${presentPercentage}%`}]} />
              </View>
              <Text style={styles.progressValue}>{presentPercentage}%</Text>
            </View>

            <View style={styles.progressRow}>
              <View style={[styles.progressDot, styles.lateDot]} />
              <Text style={styles.progressLabel}>Late</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.lateFill, {width: `${latePercentage}%`}]} />
              </View>
              <Text style={styles.progressValue}>{latePercentage}%</Text>
            </View>

            <View style={styles.progressRow}>
              <View style={[styles.progressDot, styles.halfDayDot]} />
              <Text style={styles.progressLabel}>Half Day</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.halfDayFill, {width: `${halfDayPercentage}%`}]} />
              </View>
              <Text style={styles.progressValue}>{halfDayPercentage}%</Text>
            </View>

            <View style={styles.progressRow}>
              <View style={[styles.progressDot, styles.absentDot]} />
              <Text style={styles.progressLabel}>Absent</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.absentFill, {width: `${absentPercentage}%`}]} />
              </View>
              <Text style={styles.progressValue}>{absentPercentage}%</Text>
            </View>

            <View style={styles.progressRow}>
              <View style={[styles.progressDot, styles.leaveDot]} />
              <Text style={styles.progressLabel}>Leave</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.leaveFill, {width: `${leavePercentage}%`}]} />
              </View>
              <Text style={styles.progressValue}>{leavePercentage}%</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.checkedInCard}>
        <Text style={styles.checkedInTitle}>Checked In Today</Text>
        {checkedInEmployees.length ? checkedInEmployees.map((employee, index) => (
          <TouchableOpacity
            key={employee.id}
            style={[styles.checkedInEmployeeRow, selectedCheckedInEmployee === employee.id && styles.selectedCheckedInRow]}
            onPress={() => setSelectedCheckedInEmployee(current => current === employee.id ? null : employee.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.attendanceStatusMarker, isLateCheckIn(employee) ? styles.lateStatusMarker : styles.ontimeStatusMarker]} />
            <View style={[styles.checkedInAvatar, index % 2 ? styles.secondAvatar : styles.firstAvatar]}>
              {getAvatarUri(employee.avatar) ? (
                <Image source={{uri: getAvatarUri(employee.avatar)}} style={styles.checkedInAvatarImage} />
              ) : (
                <Text style={styles.checkedInInitial}>{employee.name.charAt(0)}</Text>
              )}
            </View>
            <View style={styles.checkedInEmployeeDetails}>
              <Text style={styles.checkedInEmployeeName}>{employee.name}</Text>
              <Text style={styles.checkedInEmployeeId}>{employee.id}</Text>
            </View>
            <View style={styles.checkedInTimeContainer}>
              <View style={styles.attendanceTimeColumn}>
                <Text style={styles.checkedInTimeLabel}>Check in</Text>
                <Text style={[styles.checkedInTime, isLateCheckIn(employee) && styles.lateCheckInTime]}>
                  {formatCheckInTime(employee.inTime)}
                </Text>
              </View>
              <View style={styles.attendanceTimeColumn}>
                <Text style={styles.checkedInTimeLabel}>Check out</Text>
                <Text style={styles.checkedOutTime}>{formatCheckInTime(employee.outTime)}</Text>
              </View>
              <Text style={[
                styles.employeeStatusBadge,
                getEmployeeAttendanceStatus(employee) === 'Late' && styles.lateStatusBadge,
                getEmployeeAttendanceStatus(employee) === 'Half Day' && styles.halfDayStatusBadge,
                getEmployeeAttendanceStatus(employee) === 'Present' && styles.presentStatusBadge,
              ]}>
                {getEmployeeAttendanceStatus(employee)}
              </Text>
            </View>
          </TouchableOpacity>
        )) : (
          <Text style={[styles.checkedInSubtitle, styles.checkedInEmptyState]}>No employees checked in</Text>
        )}
      </View>

      <View style={styles.checkedInCard}>
        <Text style={styles.checkedInTitle}>On Leave Today</Text>
        {leaveEmployees.length ? leaveEmployees.map((employee, index) => (
          <View key={employee.id} style={styles.checkedInEmployeeRow}>
            <View style={[styles.checkedInAvatar, index % 2 ? styles.secondAvatar : styles.firstAvatar]}>
              {getAvatarUri(employee.avatar) ? (
                <Image source={{uri: getAvatarUri(employee.avatar)}} style={styles.checkedInAvatarImage} />
              ) : (
                <Text style={styles.checkedInInitial}>{employee.name.charAt(0)}</Text>
              )}
            </View>
            <View style={styles.checkedInEmployeeDetails}>
              <Text style={styles.checkedInEmployeeName}>{employee.name}</Text>
              <Text style={styles.checkedInEmployeeId}>{employee.id}</Text>
            </View>
            <Text style={[styles.employeeStatusBadge, styles.leaveStatusBadge]}>Leave</Text>
          </View>
        )) : (
          <Text style={[styles.checkedInSubtitle, styles.checkedInEmptyState]}>No employees on leave</Text>
        )}
      </View>

      <View style={styles.checkedInCard}>
        <Text style={styles.checkedInTitle}>Absent Today</Text>
        {absentEmployees.length ? absentEmployees.map((employee, index) => (
          <View key={employee.id} style={styles.checkedInEmployeeRow}>
            <View style={[styles.checkedInAvatar, index % 2 ? styles.secondAvatar : styles.firstAvatar]}>
              {getAvatarUri(employee.avatar) ? (
                <Image source={{uri: getAvatarUri(employee.avatar)}} style={styles.checkedInAvatarImage} />
              ) : (
                <Text style={styles.checkedInInitial}>{employee.name.charAt(0)}</Text>
              )}
            </View>
            <View style={styles.checkedInEmployeeDetails}>
              <Text style={styles.checkedInEmployeeName}>{employee.name}</Text>
              <Text style={styles.checkedInEmployeeId}>{employee.id}</Text>
            </View>
            <Text style={[styles.employeeStatusBadge, styles.absentStatusBadge]}>Absent</Text>
          </View>
        )) : (
          <Text style={[styles.checkedInSubtitle, styles.checkedInEmptyState]}>No absent employees</Text>
        )}
      </View>

      <View style={styles.leaveCard}>
        <View style={styles.attendanceHeader}>
          <Text style={styles.attendanceTitle}>Pending Leave Requests</Text>
          <TouchableOpacity onPress={() => setShowAllLeaveRequests(current => !current)} activeOpacity={0.8}>
            <Text style={styles.seeAllText}>{showAllLeaveRequests ? 'Show Less' : 'View All'}</Text>
          </TouchableOpacity>
        </View>

        {leaveRequests.length === 0 ? (
          <Text style={[styles.emptyLeaveText, styles.emptyLeaveState]}>No pending leave requests</Text>
        ) : visibleLeaveRequests.map((request, index) => (
          <React.Fragment key={request.id}>
            <View style={styles.leaveRequest}>
              <View style={[styles.leaveAvatar, index % 2 ? styles.secondAvatar : styles.firstAvatar]}>
                {getAvatarUri(request.avatar) ? (
                  <Image source={{uri: getAvatarUri(request.avatar)}} style={styles.leaveAvatarImage} />
                ) : (
                  <Ionicons name="person" size={19} color="#FFFFFF" />
                )}
              </View>
              <View style={styles.leaveDetails}>
                <Text style={styles.employeeName}>{request.employeeName || request.employeeId}</Text>
                <Text style={styles.leaveEmployeeId}>{request.employeeId}</Text>
                <Text style={styles.leaveDate}>
                  {formatLeaveDate(request.startDate)} - {formatLeaveDate(request.endDate)}
                </Text>
                {request.status !== 'Pending' && <Text style={styles.leaveStatus}>{request.status}</Text>}
              </View>
              {request.status === 'Pending' ? (
                <View style={styles.leaveActions}>
                  <TouchableOpacity style={styles.rejectButton} onPress={() => updateLeaveRequestStatus(request.id, 'Rejected')} activeOpacity={0.8}>
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveButton} onPress={() => updateLeaveRequestStatus(request.id, 'Approved')} activeOpacity={0.8}>
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[styles.leaveStatus, request.status === 'Approved' ? styles.approvedStatus : styles.rejectedStatus]}>{request.status}</Text>
              )}
            </View>
            {index < visibleLeaveRequests.length - 1 && <View style={styles.leaveDivider} />}
          </React.Fragment>
        ))}
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>Calendar</Text>
            <Text style={styles.calendarMonth}>{calendarMonth}</Text>
          <View style={styles.calendarActions}>
            <TouchableOpacity
              style={styles.calendarButton}
              activeOpacity={0.8}
              onPress={() => setCalendarDate(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            >
              <Ionicons name="chevron-back" size={14} color="#4B556B" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.calendarButton}
              activeOpacity={0.8}
              onPress={() => setCalendarDate(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            >
              <Ionicons name="chevron-forward" size={14} color="#4B556B" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekdayRow}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <Text key={day} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            const holiday = day && holidays.find(item => (
              holidayDateKey(item.date) === dateKey(calendarDate.getFullYear(), calendarDate.getMonth(), day)
            ));
            const dayStyles = [
              styles.calendarDay,
            ];
            const isToday = isCurrentMonth && day === today.getDate();
            const markerStyles = [
              styles.calendarMarker,
              holiday && styles.holidayDay,
              isToday && styles.selectedDay,
            ];
            const textStyles = [
              styles.calendarDayText,
              holiday && styles.holidayDayText,
              isToday && styles.selectedDayText,
            ];

            if (!holiday) {
              return (
                <View key={`${day}-${index}`} style={dayStyles}>
                  <View style={markerStyles}>
                    <Text style={textStyles}>{day || ''}</Text>
                  </View>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={`${day}-${index}`}
                style={dayStyles}
                activeOpacity={0.75}
                accessibilityLabel={`View holiday ${holiday.description}`}
                onPress={() => {
                  setSelectedHolidayId(holiday._id);
                  dashboardScrollRef.current?.scrollTo({y: eventsOffset.current, animated: true});
                }}
              >
                <View style={markerStyles}>
                  <Text style={textStyles}>{day}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View
        style={styles.eventsCard}
        onLayout={event => { eventsOffset.current = event.nativeEvent.layout.y; }}
      >
        <View style={styles.attendanceHeader}>
          <Text style={styles.attendanceTitle}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => setShowAllEvents(current => !current)} activeOpacity={0.8}>
            <Text style={styles.seeAllText}>{showAllEvents ? 'Show Less' : 'View All'}</Text>
          </TouchableOpacity>
        </View>

        {visibleEvents.length ? visibleEvents.map(holiday => (
          <View key={holiday._id} style={[styles.eventRow, selectedHolidayId === holiday._id && styles.eventRowSelected]}>
            <View style={[styles.eventIcon, styles.holidayEventIcon]}>
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.eventDetails}>
              <Text style={styles.eventTitle}>{holiday.description}</Text>
              <Text style={styles.eventDate}>{formatHolidayDate(holiday.date)}</Text>
            </View>
          </View>
        )) : (
          <Text style={styles.noEventsText}>No upcoming holidays</Text>
        )}
      </View>

    </>
  );

  const handleFooterTabPress = tab => {
    setShowNotifications(false);
    setActiveTab(tab);

    if (tab !== 'More') {
      setSelectedMoreMenu(null);
    }
  };

  const renderContent = () => {
    if (showNotifications) {
      return (
        <NotificationScreen
          adminToken={adminToken}
          onBack={() => setShowNotifications(false)}
          onNotificationRead={notificationId => {
            setAdminNotificationCount(current => Math.max(0, current - 1));
          }}
          onOpenLeave={status => {
            setShowNotifications(false);
            setNotificationLeaveStatus(status || 'Pending');
            setActiveTab('Leave');
          }}
          onOpenAttendance={() => {
            setShowNotifications(false);
            setActiveTab('Attendance');
          }}
        />
      );
    }

    if (activeTab === 'Dashboard') {
      return renderDashboardContent();
    }

    if (activeTab === 'Attendance') {
      return <AttendanceScreen adminToken={adminToken} themeMode={themeMode} />;
    }

    if (activeTab === 'Employees') {
      return <EmployeeScreen adminToken={adminToken} themeMode={themeMode} />;
    }

    if (activeTab === 'Leave') {
      return <LeaveScreen adminToken={adminToken} themeMode={themeMode} initialStatus={notificationLeaveStatus} />;
    }

    if (activeTab === 'Department') {
      return <DepartmentScreen adminToken={adminToken} themeMode={themeMode} />;
    }

    if (activeTab === 'More') {
      return <MoreScreen adminToken={adminToken} onLogout={onLogout} onHolidaySaved={handleHolidaySaved} onHolidayDeleted={handleHolidayDeleted} themeMode={themeMode} onToggleTheme={onToggleTheme} selectedMenu={selectedMoreMenu} onSelectedMenuChange={setSelectedMoreMenu} onOpenLeave={status => {
        setNotificationLeaveStatus(status || 'Pending');
        setSelectedMoreMenu(null);
        setActiveTab('Leave');
      }} onOpenAttendance={() => {
        setSelectedMoreMenu(null);
        setActiveTab('Attendance');
      }} />;
    }

    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderTitle}>{activeTab}</Text>
        <Text style={styles.placeholderText}>Details for {activeTab} screen</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, themeMode === 'dark' && styles.darkBackground]}>
      <View style={[styles.container, themeMode === 'dark' && styles.darkBackground]}>
        <View style={[styles.navbar, themeMode === 'dark' && styles.darkNavbar]} />

        <ScrollView
          ref={dashboardScrollRef}
          style={[styles.contentScroll, themeMode === 'dark' && styles.darkScroll]}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshDashboardData}
              colors={['#061B4F']}
              tintColor="#061B4F"
            />
          }
        >
          {renderContent()}
        </ScrollView>

        <View style={[styles.footer, themeMode === 'dark' && styles.darkSurface]}>
          {tabs.map(item => {
            const isActive = activeTab === item.label;

            return (
              <TouchableOpacity
                key={item.label}
                style={styles.footerItem}
                activeOpacity={0.8}
                delayPressIn={0}
                accessibilityRole="tab"
                accessibilityState={{selected: isActive}}
                onPressIn={() => handleFooterTabPress(item.label)}
                onPress={() => handleFooterTabPress(item.label)}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={isActive ? '#1D4ED8' : '#6E7A91'}
                />
                <Text
                  style={[
                    styles.footerLabel,
                    isActive && styles.footerLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  darkBackground: {backgroundColor: '#101827'},
  darkScroll: {backgroundColor: '#101827'},
  darkNavbar: {backgroundColor: '#183B7A'},
  darkSurface: {backgroundColor: '#1B2638'},
  container: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: 0,
    backgroundColor: '#F4F6FB',
    paddingBottom: 0,
  },
  navbar: {
    height: 32,
    marginBottom: 0,
    borderRadius: 0,
    backgroundColor: '#2563EB',
    shadowColor: '#1D4ED8',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 16,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 6,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10204B',
    lineHeight: 26,
  },
  greetingPrefix: {
    fontWeight: '700',
    color: '#10204B',
  },
  greetingName: {
    fontWeight: '800',
    color: '#1769E0',
  },
  greetingSuffix: {
    fontWeight: '700',
    color: '#10204B',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F04444',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    color: '#67748E',
    marginTop: 4,
  },
  dateText: {
    marginHorizontal: 24,
    marginTop: 14,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#4B556B',
  },
  statsGrid: {
    marginHorizontal: 18,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardEmpty: {
    flex: 1,
    marginHorizontal: 6,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeIcon: {
    backgroundColor: '#1769E0',
  },
  presentIcon: {
    backgroundColor: '#20B15A',
  },
  lateIcon: {
    backgroundColor: '#FF8A00',
  },
  absentIcon: {
    backgroundColor: '#F04444',
  },
  leaveIcon: {
    backgroundColor: '#1769E0',
  },
  halfDayIcon: {
    backgroundColor: '#F59E0B',
  },
  checkedInCard: {
    paddingVertical: 12,
    marginHorizontal: 24,
    marginTop: 0,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  checkedInTitle: {
    marginHorizontal: 14,
    fontSize: 12,
    fontWeight: '800',
    color: '#202633',
    textAlign: 'center',
    marginBottom: 2,
  },
  checkedInEmployeeRow: {
    position: 'relative',
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 4,
    paddingRight: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF1F6',
  },
  attendanceStatusMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  lateStatusMarker: {
    backgroundColor: '#F59E0B',
  },
  ontimeStatusMarker: {
    backgroundColor: '#22C55E',
  },
  selectedCheckedInRow: {
    backgroundColor: '#FFF4C2',
    borderRadius: 8,
    borderTopColor: '#F6D96B',
  },
  checkedInAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  checkedInAvatarImage: {
    width: '100%',
    height: '100%',
  },
  checkedInInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkedInEmployeeDetails: {
    flex: 1,
    minWidth: 0,
    marginLeft: 8,
    marginRight: 6,
  },
  checkedInEmployeeName: {
    color: '#202633',
    fontSize: 11,
    fontWeight: '700',
  },
  checkedInEmployeeId: {
    marginTop: 3,
    color: '#71809C',
    fontSize: 10,
  },
  checkedInTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 14,
  },
  attendanceTimeColumn: {
    width: 48,
    alignItems: 'flex-end',
  },
  checkedInTimeLabel: {
    color: '#71809C',
    fontSize: 9,
  },
  checkedInTime: {
    marginTop: 3,
    color: '#159447',
    fontSize: 10,
    fontWeight: '700',
  },
  checkedOutTime: {
    marginTop: 3,
    color: '#159447',
    fontSize: 10,
    fontWeight: '700',
  },
  lateCheckInTime: {
    color: '#D18B00',
  },
  employeeStatusBadge: {
    minWidth: 54,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
  },
  lateStatusBadge: {
    color: '#B86A00',
    backgroundColor: '#FFF0C2',
  },
  halfDayStatusBadge: {
    color: '#A16207',
    backgroundColor: '#FEF3C7',
  },
  presentStatusBadge: {
    color: '#16834B',
    backgroundColor: '#DDF7E8',
  },
  absentStatusBadge: {
    color: '#C24141',
    backgroundColor: '#FDE4E4',
  },
  leaveStatusBadge: {
    color: '#1769E0',
    backgroundColor: '#EAF1FF',
  },
  checkedInSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: '#71809C',
  },
  checkedInEmptyState: {
    minHeight: 58,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  statTextContainer: {
    marginLeft: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#252B38',
  },
  statValue: {
    marginTop: 4,
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '800',
    color: '#0F172A',
  },
  attendanceCard: {
    marginHorizontal: 24,
    marginTop: 4,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendanceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#202633',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1769E0',
  },
  attendanceBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  attendanceRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 5,
    borderColor: '#1769E0',
    borderRightColor: '#DCE5F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendancePercentage: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    color: '#101828',
  },
  attendanceRingLabel: {
    marginTop: 2,
    fontSize: 10,
    color: '#202633',
  },
  progressList: {
    flex: 1,
    marginLeft: 0,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  presentDot: {
    backgroundColor: '#20B15A',
  },
  lateDot: {
    backgroundColor: '#FFB52E',
  },
  halfDayDot: {
    backgroundColor: '#F59E0B',
  },
  absentDot: {
    backgroundColor: '#F04444',
  },
  leaveDot: {
    backgroundColor: '#1769E0',
  },
  progressLabel: {
    width: 42,
    fontSize: 11,
    color: '#303846',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    marginHorizontal: 8,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  presentFill: {
    backgroundColor: '#20B15A',
  },
  lateFill: {
    backgroundColor: '#FF8A00',
  },
  halfDayFill: {
    backgroundColor: '#F59E0B',
  },
  absentFill: {
    backgroundColor: '#F04444',
  },
  leaveFill: {
    backgroundColor: '#1769E0',
  },
  progressValue: {
    width: 34,
    flexShrink: 0,
    fontSize: 11,
    textAlign: 'right',
    color: '#303846',
  },
  leaveCard: {
    marginHorizontal: 24,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  leaveRequest: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  leaveAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  leaveAvatarImage: {
    width: '100%',
    height: '100%',
  },
  firstAvatar: {
    backgroundColor: '#1769E0',
  },
  secondAvatar: {
    backgroundColor: '#243B6B',
  },
  leaveDetails: {
    flex: 1,
    marginLeft: 10,
  },
  employeeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#202633',
  },
  leaveDate: {
    marginTop: 4,
    fontSize: 11,
    color: '#4B556B',
  },
  leaveEmployeeId: {
    marginTop: 2,
    fontSize: 10,
    color: '#71809C',
  },
  departmentUsersCard: {
    marginHorizontal: 24,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  departmentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  departmentUserAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  departmentUserAvatarImage: {
    width: '100%',
    height: '100%',
  },
  departmentUserInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  departmentUserDetails: {
    flex: 1,
    marginLeft: 10,
  },
  departmentUserName: {
    color: '#202633',
    fontSize: 12,
    fontWeight: '700',
  },
  departmentUserRole: {
    marginTop: 4,
    color: '#71809C',
    fontSize: 10,
  },
  noDepartmentUsersText: {
    marginTop: 14,
    color: '#71809C',
    fontSize: 11,
  },
  leaveStatus: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
  },
  approvedStatus: {
    color: '#20B15A',
  },
  rejectedStatus: {
    color: '#F04444',
  },
  emptyLeaveText: {
    marginTop: 14,
    color: '#71809C',
    fontSize: 11,
  },
  emptyLeaveState: {
    minHeight: 58,
    marginTop: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  leaveActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rejectButton: {
    minWidth: 48,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F2F4',
  },
  rejectText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3F4652',
  },
  approveButton: {
    minWidth: 54,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#20B15A',
  },
  approveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leaveDivider: {
    height: 1,
    marginTop: 12,
    marginLeft: 44,
    backgroundColor: '#EEF0F3',
  },
  calendarCard: {
    marginHorizontal: 24,
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAF2',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#202633',
  },
  calendarMonth: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
    color: '#4B556B',
  },
  calendarActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  calendarButton: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F7',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  weekdayText: {
    flex: 1,
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  calendarDay: {
    width: '14.2857%',
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMarker: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  selectedDay: {
    backgroundColor: '#1769E0',
  },
  calendarDayText: {
    fontSize: 10,
    color: '#303846',
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  holidayDay: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 11,
    backgroundColor: '#FFF8E7',
  },
  holidayDayText: {
    color: '#B45309',
    fontSize: 9,
    fontWeight: '800',
  },
  eventsCard: {
    marginHorizontal: 24,
    marginTop: 10,
    marginBottom: 6,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EAF2',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  eventRowSelected: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginHorizontal: -6,
    borderRadius: 8,
    backgroundColor: '#FFF8E7',
  },
  eventIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingIcon: {
    backgroundColor: '#7C4DCE',
  },
  payrollIcon: {
    backgroundColor: '#159A63',
  },
  policyIcon: {
    backgroundColor: '#D47C23',
  },
  reviewIcon: {
    backgroundColor: '#1769E0',
  },
  holidayEventIcon: {
    backgroundColor: '#F59E0B',
  },
  eventDetails: {
    marginLeft: 10,
  },
  eventTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#202633',
  },
  eventDate: {
    marginTop: 3,
    fontSize: 9,
    color: '#6B7280',
  },
  noEventsText: {
    marginTop: 14,
    fontSize: 11,
    color: '#67748E',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  placeholderTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#10204B',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#67748E',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 'auto',
    width: '100%',
    alignSelf: 'stretch',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 10,
  },
  footerLabel: {
    marginTop: 6,
    fontSize: 10,
    color: '#6E7A91',
    textAlign: 'center',
  },
  footerLabelActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
});
