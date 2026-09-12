import React from 'react';
import {Alert, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const API_BASE_URL = 'http://192.168.0.102:5000';
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getCompletedMonthOptions = joiningDate => {
  const currentDate = new Date();
  const lastCompletedMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const parsedJoiningDate = joiningDate ? new Date(joiningDate) : null;
  const startMonth = parsedJoiningDate && !Number.isNaN(parsedJoiningDate.getTime())
    ? new Date(parsedJoiningDate.getFullYear(), parsedJoiningDate.getMonth(), 1)
    : lastCompletedMonth;
  const options = [];

  for (let cursor = startMonth; cursor <= lastCompletedMonth; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    options.push(`${monthNames[cursor.getMonth()]} ${cursor.getFullYear()}`);
  }

  return options.reverse();
};

class CreatePayrollScreen extends React.Component {
  state = {
    departments: [],
    employees: [],
    payrolls: [],
    selectedDepartment: 'All Departments',
    departmentMenuVisible: false,
    selectedEmployeeId: '',
    employeeMenuVisible: false,
    selectedMonth: 'Select month',
    monthMenuVisible: false,
    attendanceSummary: null,
    attendanceLoading: false,
    salary: '',
    leaveDeduction: '',
    submittedNetSalary: null,
    isSubmitting: false,
  };

  componentDidMount() {
    this.loadPayrollOptions(this.props.adminToken);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.adminToken !== this.props.adminToken) {
      this.loadPayrollOptions(this.props.adminToken);
    }
  }

  loadPayrollOptions = async adminToken => {
    if (!adminToken) {
      return;
    }

    try {
      const headers = {Authorization: `Bearer ${adminToken}`};
      const [departmentResponse, employeeResponse, payrollResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/departments`, {headers}),
        fetch(`${API_BASE_URL}/api/employees`, {headers}),
        fetch(`${API_BASE_URL}/api/payroll`, {headers}),
      ]);
      const departmentResult = await departmentResponse.json();
      const employeeResult = await employeeResponse.json();
      const payrollResult = await payrollResponse.json();
      const departmentList = Array.isArray(departmentResult) ? departmentResult : departmentResult?.departments;
      const employeeList = Array.isArray(employeeResult) ? employeeResult : employeeResult?.employees;
      const payrollList = Array.isArray(payrollResult) ? payrollResult : payrollResult?.payrolls;

      this.setState({
        departments: departmentResponse.ok && Array.isArray(departmentList)
          ? departmentList.map(department => department.departmentName).filter(Boolean)
          : [],
        employees: employeeResponse.ok && Array.isArray(employeeList) ? employeeList : [],
        payrolls: payrollResponse.ok && Array.isArray(payrollList) ? payrollList : [],
      });
    } catch (error) {
      this.setState({departments: [], employees: [], payrolls: []});
    }
  };

  changeDepartment = department => {
    this.setState({
      selectedDepartment: department,
      selectedEmployeeId: '',
      departmentMenuVisible: false,
      employeeMenuVisible: false,
      selectedMonth: 'Select month',
      monthMenuVisible: false,
      attendanceSummary: null,
      salary: '',
      leaveDeduction: '',
      submittedNetSalary: null,
    });
  };

  loadAttendanceSummary = async (employeeId, monthLabel) => {
    const [monthName, yearText] = monthLabel.split(' ');
    const month = monthNames.indexOf(monthName) + 1;
    const year = Number(yearText);

    this.setState({attendanceLoading: true, attendanceSummary: null});
    try {
      const query = `employeeId=${encodeURIComponent(employeeId)}&year=${year}&month=${month}`;
      const response = await fetch(`${API_BASE_URL}/api/attendance/admin-employee-records?${query}`, {
        headers: {Authorization: `Bearer ${this.props.adminToken}`},
      });
      const result = await response.json();
      this.setState({attendanceSummary: response.ok ? result : null});
    } catch (error) {
      this.setState({attendanceSummary: null});
    } finally {
      this.setState({attendanceLoading: false});
    }
  };

  submitPayroll = async () => {
    const {adminToken} = this.props;
    const {selectedEmployeeId, selectedMonth, salary, leaveDeduction, attendanceSummary} = this.state;
    const amount = Number(salary);
    const deduction = Number(leaveDeduction || 0);

    if (!selectedEmployeeId || selectedMonth === 'Select month') {
      Alert.alert('Create Payroll', 'Select an employee and completed month first.');
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      Alert.alert('Create Payroll', 'Enter a valid salary.');
      return;
    }
    if (!Number.isFinite(deduction) || deduction < 0 || deduction > amount) {
      Alert.alert('Create Payroll', 'Leave deduction must be between 0 and the salary.');
      return;
    }

    this.setState({isSubmitting: true});
    try {
      const response = await fetch(`${API_BASE_URL}/api/payroll`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          payMonth: selectedMonth,
          amount,
          leaveDeduction: deduction,
          attendanceSummary: attendanceSummary || {},
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        Alert.alert('Create Payroll', result.message || 'Unable to create payslip.');
        return;
      }

      this.setState({submittedNetSalary: result.payroll?.netSalary ?? amount - deduction});
      ToastAndroid.show('Payroll generated successfully', ToastAndroid.SHORT);
      this.props.onSaved?.();
    } catch (error) {
      Alert.alert('Create Payroll', 'Unable to create payslip.');
    } finally {
      this.setState({isSubmitting: false});
    }
  };

  render() {
    const {onBack} = this.props;
    const {
      departments,
      employees,
      payrolls,
      selectedDepartment,
      departmentMenuVisible,
      selectedEmployeeId,
      employeeMenuVisible,
      selectedMonth,
      monthMenuVisible,
      attendanceSummary,
      attendanceLoading,
      salary,
      leaveDeduction,
      submittedNetSalary,
      isSubmitting,
    } = this.state;
    const visibleEmployees = selectedDepartment === 'All Departments'
      ? employees
      : employees.filter(employee => employee.departmentName === selectedDepartment);
    const selectedEmployee = visibleEmployees.find(employee => employee.employeeId === selectedEmployeeId);
    const completedMonths = getCompletedMonthOptions(selectedEmployee?.joiningDate);

    return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Payroll</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.departmentLabel}>Department</Text>
        <TouchableOpacity
          style={styles.departmentSelect}
          onPress={() => this.setState({departmentMenuVisible: !departmentMenuVisible})}
          activeOpacity={0.8}
        >
          <Text style={styles.departmentSelectText}>{selectedDepartment}</Text>
          <Ionicons name="chevron-down" size={14} color="#202633" />
        </TouchableOpacity>
        {departmentMenuVisible && (
          <View style={styles.departmentMenu}>
            {['All Departments', ...departments].map(department => (
              <TouchableOpacity
                key={department}
                style={styles.departmentOption}
                onPress={() => this.changeDepartment(department)}
                activeOpacity={0.8}
              >
                <Text style={styles.departmentOptionText}>{department}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.employeeHeading}>Employees</Text>
        <TouchableOpacity
          style={styles.employeeSelect}
          onPress={() => visibleEmployees.length && this.setState({employeeMenuVisible: !employeeMenuVisible})}
          activeOpacity={0.8}
        >
          <Text style={styles.employeeSelectText}>{selectedEmployee?.fullName || 'Select employee'}</Text>
          <Ionicons name="chevron-down" size={14} color="#202633" />
        </TouchableOpacity>
        {employeeMenuVisible && (
          <View style={styles.employeeMenu}>
            {visibleEmployees.map(employee => {
              const isGenerated = selectedMonth !== 'Select month'
                && payrolls.some(payroll => payroll.employeeId === employee.employeeId && payroll.payMonth === selectedMonth);
              return (
                <TouchableOpacity
                  key={employee._id || employee.employeeId}
                  style={styles.employeeOption}
                  onPress={() => {
                    if (isGenerated) {
                      return;
                    }
                    this.setState({
                      selectedEmployeeId: employee.employeeId,
                      employeeMenuVisible: false,
                      selectedMonth: 'Select month',
                      monthMenuVisible: false,
                      attendanceSummary: null,
                      salary: '',
                      leaveDeduction: '',
                      submittedNetSalary: null,
                    });
                  }}
                  disabled={isGenerated}
                  activeOpacity={0.8}
                >
                  <Text style={styles.departmentOptionText}>
                    {employee.fullName || 'Unnamed employee'} ({employee.employeeId || 'No ID'})
                  </Text>
                  {isGenerated && <Text style={styles.generatedText}>Created</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {!visibleEmployees.length && <Text style={styles.emptyEmployees}>No employees found</Text>}

        <Text style={styles.monthHeading}>Completed Month</Text>
        <TouchableOpacity
          style={styles.monthSelect}
          onPress={() => completedMonths.length && this.setState({monthMenuVisible: !monthMenuVisible})}
          activeOpacity={0.8}
        >
          <Text style={styles.monthSelectText}>{selectedMonth}</Text>
          <Ionicons name="chevron-down" size={14} color="#202633" />
        </TouchableOpacity>
        {monthMenuVisible && (
          <View style={styles.monthMenu}>
            {completedMonths.map(month => {
              const isGenerated = payrolls.some(payroll => (
                payroll.employeeId === selectedEmployeeId && payroll.payMonth === month
              ));
              return (
                <TouchableOpacity
                  key={month}
                  style={styles.employeeOption}
                  onPress={() => {
                    if (isGenerated) {
                      return;
                    }
                    this.setState({
                      selectedMonth: month,
                      monthMenuVisible: false,
                      salary: '',
                      leaveDeduction: '',
                      submittedNetSalary: null,
                    });
                    this.loadAttendanceSummary(selectedEmployeeId, month);
                  }}
                  disabled={isGenerated}
                  activeOpacity={0.8}
                >
                  <Text style={styles.departmentOptionText}>{month}</Text>
                  {isGenerated && <Text style={styles.generatedText}>Created</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {selectedEmployee && !completedMonths.length && <Text style={styles.emptyEmployees}>No completed months found</Text>}

        {attendanceLoading && <Text style={styles.loadingText}>Loading attendance...</Text>}
        {attendanceSummary && (
          <View style={styles.attendanceCard}>
            <Text style={styles.attendanceCardTitle}>Attendance Summary</Text>
            <View style={styles.attendanceGrid}>
              {[
                ['Working Days', attendanceSummary.workingDays],
                ['Present Days', attendanceSummary.presentDays],
                ['Absent Days', attendanceSummary.absentDays],
                ['Leave Days', attendanceSummary.leaveDays],
                ['Half Days', attendanceSummary.halfDayDays],
                ['Holidays', attendanceSummary.holidayCount],
              ].map(([label, value]) => (
                <View key={label} style={styles.attendanceStat}>
                  <Text style={styles.attendanceStatValue}>{value || 0}</Text>
                  <Text style={styles.attendanceStatLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedEmployee && selectedMonth !== 'Select month' && (
          <>
            <Text style={styles.salaryHeading}>Salary</Text>
            <TextInput
              style={styles.salaryInput}
              value={salary}
              onChangeText={value => this.setState({salary: value.replace(/[^0-9.]/g, ''), submittedNetSalary: null})}
              placeholder="Enter salary"
              placeholderTextColor="#8D96A6"
              keyboardType="decimal-pad"
            />
            <Text style={styles.salaryHeading}>Leave Deduction</Text>
            <TextInput
              style={styles.salaryInput}
              value={leaveDeduction}
              onChangeText={value => this.setState({leaveDeduction: value.replace(/[^0-9.]/g, ''), submittedNetSalary: null})}
              placeholder="Enter leave deduction"
              placeholderTextColor="#8D96A6"
              keyboardType="decimal-pad"
            />
            <View style={styles.netSalaryCard}>
              <Text style={styles.netSalaryLabel}>Net Salary</Text>
              <Text style={styles.netSalaryValue}>
                {submittedNetSalary === null ? '--' : Number(submittedNetSalary).toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.disabledButton]}
              onPress={this.submitPayroll}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.submitButtonText}>{isSubmitting ? 'Saving...' : 'Save Payroll'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    );
  }
}

export default CreatePayrollScreen;

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F6F8FC'},
  header: {height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16},
  backButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  title: {flex: 1, textAlign: 'center', color: '#202633', fontSize: 20, fontWeight: '800'},
  headerSpacer: {width: 44},
  content: {paddingHorizontal: 16, paddingTop: 8},
  departmentLabel: {marginBottom: 6, color: '#526078', fontSize: 12, fontWeight: '700'},
  departmentSelect: {height: 44, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF'},
  departmentSelectText: {color: '#202633', fontSize: 13, fontWeight: '600'},
  departmentMenu: {marginTop: 4, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', backgroundColor: '#FFFFFF'},
  departmentOption: {paddingHorizontal: 12, paddingVertical: 11},
  departmentOptionText: {color: '#202633', fontSize: 13},
  employeeHeading: {marginTop: 24, marginBottom: 8, color: '#202633', fontSize: 16, fontWeight: '800'},
  employeeSelect: {height: 44, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF'},
  employeeSelectText: {color: '#202633', fontSize: 13, fontWeight: '600'},
  employeeMenu: {marginTop: 4, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', backgroundColor: '#FFFFFF'},
  employeeOption: {paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  generatedText: {marginLeft: 8, color: '#168143', fontSize: 11, fontWeight: '800'},
  emptyEmployees: {color: '#71809C', fontSize: 13},
  monthHeading: {marginTop: 24, marginBottom: 8, color: '#202633', fontSize: 16, fontWeight: '800'},
  monthSelect: {height: 44, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF'},
  monthSelectText: {color: '#202633', fontSize: 13, fontWeight: '600'},
  monthMenu: {marginTop: 4, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', backgroundColor: '#FFFFFF'},
  loadingText: {marginTop: 16, color: '#71809C', fontSize: 13, textAlign: 'center'},
  attendanceCard: {marginTop: 20, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#D8E0EC', backgroundColor: '#FFFFFF'},
  attendanceCardTitle: {marginBottom: 12, color: '#202633', fontSize: 16, fontWeight: '800'},
  attendanceGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  attendanceStat: {width: '31%', minHeight: 58, padding: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F8FC'},
  attendanceStatValue: {color: '#1769E0', fontSize: 18, fontWeight: '800'},
  attendanceStatLabel: {marginTop: 3, color: '#526078', fontSize: 10, textAlign: 'center'},
  salaryHeading: {marginTop: 20, marginBottom: 8, color: '#202633', fontSize: 15, fontWeight: '800'},
  salaryInput: {height: 44, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', color: '#202633', fontSize: 13, backgroundColor: '#FFFFFF'},
  netSalaryCard: {marginTop: 20, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#B9E1C4', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1FBF4'},
  netSalaryLabel: {color: '#168143', fontSize: 15, fontWeight: '800'},
  netSalaryValue: {color: '#168143', fontSize: 20, fontWeight: '800'},
  submitButton: {height: 48, marginTop: 16, marginBottom: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1769E0'},
  disabledButton: {opacity: 0.6},
  submitButtonText: {color: '#FFFFFF', fontSize: 14, fontWeight: '800'},
});
