// @refresh reset
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import NotificationScreen from './NotificationScreen';
import ReportScreen from './ReportScreen';
import CompanyProfileScreen from './CompanyProfileScreen';
import HolidayScreen from './HolidayScreen';
import AccountSettingsScreen from './AccountSettingsScreen';
import AdminNotificationSettingsScreen from './AdminNotificationSettingsScreen';
import AboutUsScreen from './AboutUsScreen';
import ContactUsScreen from './ContactUsScreen';
import AdminTermsAndConditionsScreen from './conditions/AdminTermsAndConditionsScreen';
import AdminAttendanceReportScreen from './AdminAttendanceReportScreen';
import AdminLeaveReportScreen from './AdminLeaveReportScreen';
import MonthlyPayrollScreen from './MonthlyPayrollScreen';
import CreatePayrollScreen from './CreatePayrollScreen';

const sections = [
  {
    title: 'MANAGEMENT',
    items: [
      {label: 'Notifications', icon: 'notifications-outline'},
      {label: 'Reports', icon: 'document-text-outline'},
    ],
  },
  {
    title: 'COMPANY',
    items: [
      {label: 'Company Profile', icon: 'briefcase-outline'},
      {label: 'Holidays', icon: 'calendar-outline'},
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      {label: 'Account Settings', icon: 'person-circle-outline'},
    ],
  },
];

const MoreScreen = ({adminToken, onLogout, onHolidaySaved, onHolidayDeleted, themeMode = 'light', onToggleTheme, selectedMenu, onSelectedMenuChange, onOpenLeave, onOpenAttendance}) => {
  const [activeScreen, setActiveScreen] = useState(null);
  const selectedReport = activeScreen?.startsWith('reports:')
    ? activeScreen.slice('reports:'.length)
    : null;

  if (activeScreen === 'notifications') {
    return (
      <NotificationScreen
        adminToken={adminToken}
        onBack={() => setActiveScreen(null)}
        onOpenLeave={status => {
          setActiveScreen(null);
          onOpenLeave?.(status || 'Pending');
        }}
        onOpenAttendance={() => {
          setActiveScreen(null);
          onOpenAttendance?.();
        }}
      />
    );
  }

  if (activeScreen === 'notificationSettings') {
    return <AdminNotificationSettingsScreen onBack={() => setActiveScreen('account:Notification Settings')} />;
  }

  if (activeScreen === 'reports' || activeScreen?.startsWith('reports:')) {
    return (
      <ReportScreen
        activeReport={selectedReport}
        onActiveReportChange={report => setActiveScreen(`reports:${report}`)}
        onBack={() => setActiveScreen(null)}
        onOpenAttendanceReport={() => setActiveScreen('attendanceReport:Attendance Report')}
        onOpenLeaveReport={() => setActiveScreen('leaveReport:Leave Report')}
        onOpenMonthlyPayroll={() => setActiveScreen('monthlyPayroll:Monthly Payroll')}
      />
    );
  }

  if (activeScreen?.startsWith('attendanceReport')) {
    return <AdminAttendanceReportScreen adminToken={adminToken} onBack={() => setActiveScreen('reports:Attendance Report')} />;
  }
  if (activeScreen?.startsWith('leaveReport')) {
    return <AdminLeaveReportScreen adminToken={adminToken} onBack={() => setActiveScreen('reports:Leave Report')} />;
  }
  if (activeScreen?.startsWith('monthlyPayroll')) {
    return <MonthlyPayrollScreen adminToken={adminToken} onBack={() => setActiveScreen('reports:Monthly Payroll')} onCreatePayroll={() => setActiveScreen('createPayroll:Monthly Payroll')} />;
  }
  if (activeScreen?.startsWith('createPayroll')) {
    return <CreatePayrollScreen adminToken={adminToken} onBack={() => setActiveScreen('monthlyPayroll:Monthly Payroll')} onSaved={() => setActiveScreen('monthlyPayroll:Monthly Payroll')} />;
  }
  if (activeScreen === 'company') {
    return <CompanyProfileScreen adminToken={adminToken} onLogout={onLogout} onBack={() => setActiveScreen(null)} />;
  }

  if (activeScreen === 'holidays') {
    return <HolidayScreen adminToken={adminToken} onBack={() => setActiveScreen(null)} onHolidaySaved={onHolidaySaved} onHolidayDeleted={onHolidayDeleted} />;
  }

  if (activeScreen === 'account' || activeScreen?.startsWith('account:')) {
    return (
      <AccountSettingsScreen
        adminToken={adminToken}
        themeMode={themeMode}
        onToggleTheme={onToggleTheme}
        activeSetting={activeScreen?.startsWith('account:') ? activeScreen.slice('account:'.length) : null}
        onActiveSettingChange={setting => setActiveScreen(`account:${setting}`)}
        onBack={() => setActiveScreen(null)}
        onOpenAboutUs={() => setActiveScreen('about:About Us')}
        onOpenContactUs={() => setActiveScreen('contact:Contact Us')}
        onOpenTerms={() => setActiveScreen('terms:Terms & Conditions')}
        onOpenNotificationSettings={() => setActiveScreen('notificationSettings')}
        onLogout={onLogout}
      />
    );
  }

  if (activeScreen?.startsWith('about')) {
    return <AboutUsScreen adminToken={adminToken} onBack={() => setActiveScreen('account:About Us')} />;
  }

  if (activeScreen?.startsWith('contact')) {
    return <ContactUsScreen adminToken={adminToken} onBack={() => setActiveScreen('account:Contact Us')} />;
  }

  if (activeScreen?.startsWith('terms')) {
    return <AdminTermsAndConditionsScreen onBack={() => setActiveScreen('account:Terms & Conditions')} />;
  }

  return (
    <View style={[styles.container, themeMode === 'dark' && styles.darkContainer]}>
      {sections.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map(item => (
              (() => {
                const menuKey = item.label.toLowerCase().replace(/[^a-z]+(.)/g, (_, character) => character.toUpperCase());
                const isActive = selectedMenu === menuKey;

                return (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuRow, isActive && styles.activeMenuRow]}
                activeOpacity={0.8}
                onPress={() => {
                  onSelectedMenuChange?.(menuKey);
                  if (item.label === 'Notifications') {
                    setActiveScreen('notifications');
                  }
                  if (item.label === 'Reports') {
                    setActiveScreen('reports');
                  }
                  if (item.label === 'Company Profile') {
                    setActiveScreen('company');
                  }
                  if (item.label === 'Holidays') {
                    setActiveScreen('holidays');
                  }
                  if (item.label === 'Account Settings') {
                    setActiveScreen('account');
                  }
                }}
              >
                <Ionicons name={item.icon} size={18} color={isActive ? '#FFFFFF' : '#5269A6'} />
                <Text style={[styles.menuLabel, isActive && styles.activeMenuLabel]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={17} color="#98A1B3" />
              </TouchableOpacity>
                );
              })()
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

export default MoreScreen;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingBottom: 18,
  },
  darkContainer: {backgroundColor: '#101827'},
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#7A86A2',
  },
  sectionCard: {
    marginHorizontal: 8,
    overflow: 'hidden',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 45,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  activeMenuRow: {
    backgroundColor: '#1D4ED8',
  },
  menuLabel: {
    flex: 1,
    marginLeft: 14,
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2A44',
  },
  activeMenuLabel: {
    color: '#FFFFFF',
  },
});
