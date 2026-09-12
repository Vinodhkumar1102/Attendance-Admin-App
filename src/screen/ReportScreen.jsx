import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const reports = [
  {label: 'Attendance Report', icon: 'calendar-outline', color: '#20B15A'},
  {label: 'Leave Report', icon: 'clipboard-outline', color: '#FF8A00'},
  {label: 'Monthly Payroll', icon: 'cash-outline', color: '#1769E0'},
  {label: 'Employee Report', icon: 'people-outline', color: '#1769E0'},
];

const ReportScreen = ({onBack, onOpenAttendanceReport, onOpenLeaveReport, onOpenMonthlyPayroll, activeReport, onActiveReportChange}) => {
  const [localActiveReport, setLocalActiveReport] = useState(null);
  const selectedReport = activeReport ?? localActiveReport;

  const handleReportPress = report => {
    setLocalActiveReport(report.label);
    onActiveReportChange?.(report.label);

    if (report.label === 'Attendance Report') {
      onOpenAttendanceReport?.();
    }
    if (report.label === 'Leave Report') {
      onOpenLeaveReport?.();
    }
    if (report.label === 'Monthly Payroll') {
      onOpenMonthlyPayroll?.();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.reportList}>
        {reports.map(report => (
          <TouchableOpacity
            key={report.label}
            style={[styles.reportRow, selectedReport === report.label && styles.activeReportRow]}
            onPress={() => handleReportPress(report)}
            activeOpacity={0.8}
          >
            <View style={[styles.reportIcon, {backgroundColor: selectedReport === report.label ? '#FFFFFF33' : `${report.color}22`}]}> 
              <Ionicons name={report.icon} size={18} color={selectedReport === report.label ? '#FFFFFF' : report.color} />
            </View>
            <Text style={[styles.reportLabel, selectedReport === report.label && styles.activeReportLabel]}>{report.label}</Text>
            <Ionicons name="chevron-forward" size={17} color={selectedReport === report.label ? '#FFFFFF' : '#98A1B3'} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default ReportScreen;

const styles = StyleSheet.create({
  container: {paddingHorizontal: 8, paddingBottom: 18},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 10, marginTop: 12},
  backButton: {width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  title: {flex: 1, fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#000000'},
  headerSpacer: {width: 32},
  dateRange: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 36, marginHorizontal: 8, marginTop: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 8, backgroundColor: '#FFFFFF'},
  dateRangeText: {fontSize: 10, color: '#5269A6'},
  reportList: {marginTop: 20, marginHorizontal: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFFFFF'},
  reportRow: {flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#EEF0F3'},
  activeReportRow: {backgroundColor: '#1D4ED8'},
  reportIcon: {width: 30, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center'},
  reportLabel: {flex: 1, marginLeft: 10, fontSize: 11, fontWeight: '700', color: '#1F2A44'},
  activeReportLabel: {color: '#FFFFFF'},
});
