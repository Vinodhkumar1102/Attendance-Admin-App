import React from 'react';
import {ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {generatePDF} from 'react-native-html-to-pdf';
import Share from 'react-native-share';

const API_BASE_URL = 'https://attendance-backend-1-2bdo.onrender.com';

const formatGeneratedDate = value => value
  ? new Intl.DateTimeFormat('en-US', {month: 'short', day: '2-digit', year: 'numeric'}).format(new Date(value))
  : '--';

const getAvatarUri = avatar => {
  if (!avatar?.path) {
    return null;
  }

  return avatar.path.startsWith('http') ? avatar.path : `${API_BASE_URL}${avatar.path}`;
};

const getPayPeriod = payMonth => {
  const [monthName, yearText] = String(payMonth || '').split(' ');
  const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(monthName);
  const year = Number(yearText);
  if (monthIndex < 0 || !Number.isInteger(year)) return '--';
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const shortMonth = monthName.slice(0, 3);
  return `01 ${shortMonth} ${year} - ${String(lastDay).padStart(2, '0')} ${shortMonth} ${year}`;
};

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const numberToWords = value => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convertBelowThousand = number => {
    if (number < 10) return ones[number];
    if (number < 20) return teens[number - 10];
    if (number < 100) return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${ones[number % 10]}` : ''}`;
    return `${ones[Math.floor(number / 100)]} Hundred${number % 100 ? ` ${convertBelowThousand(number % 100)}` : ''}`;
  };
  const numericValue = Math.max(0, Math.floor(Number(value) || 0));
  if (!numericValue) return 'Rupees Zero Only';
  const parts = [];
  const crore = Math.floor(numericValue / 10000000);
  const lakh = Math.floor((numericValue % 10000000) / 100000);
  const thousand = Math.floor((numericValue % 100000) / 1000);
  const remainder = numericValue % 1000;
  if (crore) parts.push(`${convertBelowThousand(crore)} Crore`);
  if (lakh) parts.push(`${convertBelowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${convertBelowThousand(thousand)} Thousand`);
  if (remainder) parts.push(convertBelowThousand(remainder));
  return `Rupees ${parts.join(' ')} Only`;
};

class PayrollReviewScreen extends React.Component {
  state = {
    status: this.props.payroll.status || 'Pending',
    utrNumber: this.props.payroll.utrNumber || '',
    menuVisible: false,
    isSaving: false,
    paymentLocked: this.props.payroll.status === 'Paid',
    paidDate: this.props.payroll.paidDate || null,
  };

  savePaymentStatus = async () => {
    const {payroll} = this.props;
    const {status, utrNumber} = this.state;
    if (status === 'Paid' && !/^\d{12}$/.test(utrNumber)) {
      Alert.alert('Payment Status', 'Enter a valid 12-digit UTR number.');
      return;
    }

    this.setState({isSaving: true});
    try {
      const response = await fetch(`${API_BASE_URL}/api/payroll/${payroll.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.props.adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          utrNumber: status === 'Paid' ? utrNumber : '',
          paidDate: status === 'Paid' ? new Date().toISOString() : null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        Alert.alert('Payment Status', result.message || 'Unable to update payment status.');
        return;
      }
      this.props.onUpdated?.(result.payroll || {...payroll, status, utrNumber: status === 'Paid' ? utrNumber : ''});
      this.setState({
        paymentLocked: status === 'Paid',
        paidDate: status === 'Paid' ? result.payroll?.paidDate || new Date().toISOString() : null,
      });
      ToastAndroid.show('Payslip generated successfully', ToastAndroid.SHORT);
      this.props.onSaved?.();
    } catch (error) {
      Alert.alert('Payment Status', 'Unable to update payment status.');
    } finally {
      this.setState({isSaving: false});
    }
  };

  render() {
    const {payroll, onBack} = this.props;
    const {status, utrNumber, menuVisible, isSaving, paymentLocked, paidDate} = this.state;
    return (
  <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" />
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={22} color="#202633" />
      </TouchableOpacity>
      <Text style={styles.title}>Payslip Review</Text>
      <View style={styles.headerSpacer} />
    </View>
    <ScrollView contentContainerStyle={styles.reviewContent}>
      <View style={styles.reviewEmployee}>
        <View style={styles.reviewAvatar}>
          {getAvatarUri(payroll.avatar) ? (
            <Image source={{uri: getAvatarUri(payroll.avatar)}} style={styles.reviewAvatarImage} />
          ) : (
            <Text style={styles.avatarText}>{(payroll.employeeName || payroll.employeeId || '?').charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.reviewEmployeeDetails}>
          <Text style={styles.reviewEmployeeName}>{payroll.employeeName || payroll.employeeId}</Text>
          <Text style={styles.reviewEmployeeMeta}>{payroll.employeeId || '--'}</Text>
          <Text style={styles.reviewEmployeeMeta}>{payroll.departmentName || '--'}</Text>
          <Text style={styles.reviewEmployeeMeta}>{payroll.designation || '--'}</Text>
        </View>
        <View style={styles.reviewDates}>
          <Text style={styles.reviewDateLabel}>Month</Text>
          <Text style={styles.reviewDateValue}>{payroll.payMonth || '--'}</Text>
          <Text style={styles.reviewDateLabel}>Created Date</Text>
          <Text style={styles.reviewDateValue}>{formatGeneratedDate(payroll.paidDate || payroll.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.reviewBreakdown}>
        <View style={styles.breakdownColumn}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownHeaderText}>Earnings</Text>
            <Text style={styles.breakdownHeaderText}>Amount (₹)</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Salary</Text>
            <Text style={styles.breakdownAmount}>{Number(payroll.amount || 0).toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.breakdownColumn}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownHeaderText}>Deductions</Text>
            <Text style={styles.breakdownHeaderText}>Amount (₹)</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Leave Deduction</Text>
            <Text style={styles.breakdownAmount}>{Number(payroll.leaveDeduction || 0).toFixed(2)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.netSalaryReviewCard}>
        <View>
          <Text style={styles.netSalaryReviewLabel}>Net Salary</Text>
          <Text style={styles.netSalaryWords}>
            {payroll.netSalary === undefined || payroll.netSalary === null ? '--' : `(${numberToWords(payroll.netSalary)})`}
          </Text>
        </View>
        <Text style={styles.reviewNetValue}>{payroll.netSalary === undefined || payroll.netSalary === null ? '--' : `₹ ${Number(payroll.netSalary).toFixed(2)}`}</Text>
      </View>
      <Text style={styles.paymentHeading}>Payment Status</Text>
      <TouchableOpacity style={[styles.paymentSelect, paymentLocked && styles.disabledField]} onPress={() => !paymentLocked && this.setState({menuVisible: !menuVisible})} disabled={paymentLocked} activeOpacity={0.8}>
        <Text style={styles.paymentSelectText}>{status}</Text>
        <Ionicons name="chevron-down" size={14} color="#202633" />
      </TouchableOpacity>
      {menuVisible && (
        <View style={styles.paymentMenu}>
          {['Pending', 'Draft', 'Paid'].map(option => (
            <TouchableOpacity key={option} style={styles.paymentOption} onPress={() => this.setState({status: option, menuVisible: false})} activeOpacity={0.8}>
              <Text style={styles.paymentOptionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {status === 'Paid' && (
        <>
          <Text style={styles.paymentHeading}>UTR Number</Text>
          <TextInput
            style={styles.utrInput}
            value={utrNumber}
            onChangeText={value => this.setState({utrNumber: value.replace(/\D/g, '').slice(0, 12)})}
            editable={!paymentLocked}
            placeholder="Enter 12-digit UTR number"
            placeholderTextColor="#8D96A6"
            keyboardType="number-pad"
            maxLength={12}
          />
          <View style={styles.paidDateRow}>
            <Text style={styles.paidDateLabel}>Paid Date</Text>
            <Text style={styles.paidDateValue}>{formatGeneratedDate(paidDate)}</Text>
          </View>
        </>
      )}
      <TouchableOpacity style={[styles.paymentSaveButton, (isSaving || paymentLocked) && styles.disabledButton]} onPress={this.savePaymentStatus} disabled={isSaving || paymentLocked} activeOpacity={0.85}>
        <Text style={styles.paymentSaveButtonText}>{isSaving ? 'Saving...' : paymentLocked ? 'Payment Saved' : 'Save Payment Status'}</Text>
      </TouchableOpacity>
    </ScrollView>
  </SafeAreaView>
    );
  }
}

const PaymentDetailsScreen = ({payroll, onBack}) => (
  <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" />
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={22} color="#202633" />
      </TouchableOpacity>
      <Text style={styles.title}>Payment Details</Text>
      <View style={styles.headerSpacer} />
    </View>
    <ScrollView contentContainerStyle={styles.reviewContent}>
      <View style={styles.paymentDetailsHeader}>
        <Text style={styles.paymentDetailsName}>{payroll.employeeName || payroll.employeeId}</Text>
        <Text style={styles.paymentDetailsMeta}>{payroll.departmentName || '--'} • {payroll.employeeId || '--'}</Text>
      </View>
      <View style={styles.reviewCard}>
        <Text style={styles.reviewCardTitle}>Payment Details</Text>
        <Text style={styles.reviewRow}>Month <Text style={styles.reviewValue}>{payroll.payMonth || '--'}</Text></Text>
        <Text style={styles.reviewRow}>Salary <Text style={styles.reviewValue}>{Number(payroll.amount || 0).toFixed(2)}</Text></Text>
        <Text style={styles.reviewRow}>Leave Deduction <Text style={styles.reviewValue}>{Number(payroll.leaveDeduction || 0).toFixed(2)}</Text></Text>
        <Text style={styles.reviewRow}>Net Salary <Text style={styles.reviewNetValue}>{payroll.netSalary === undefined || payroll.netSalary === null ? '--' : Number(payroll.netSalary).toFixed(2)}</Text></Text>
        <Text style={styles.reviewRow}>Status <Text style={styles.reviewValue}>{payroll.status || 'Pending'}</Text></Text>
        <Text style={styles.reviewRow}>UTR Number <Text style={styles.reviewValue}>{payroll.utrNumber || '--'}</Text></Text>
        <Text style={styles.reviewRow}>Paid Date <Text style={styles.reviewValue}>{formatGeneratedDate(payroll.paidDate)}</Text></Text>
      </View>
    </ScrollView>
  </SafeAreaView>
);

class MonthlyPayrollScreen extends React.Component {
  state = {
    payrollStats: {employees: 0, generated: 0, pending: 0, paid: 0},
    savedPayrolls: [],
    isLoading: true,
    selectedMonth: 'All Months',
    monthMenuVisible: false,
    selectedPayroll: null,
    selectedPayment: null,
  };

  componentDidMount() {
    this.loadPayrollStats(this.props.adminToken);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.adminToken !== this.props.adminToken) {
      this.loadPayrollStats(this.props.adminToken);
    }
  }

  loadPayrollStats = async adminToken => {
    if (!adminToken) {
      this.setState({isLoading: false});
      return;
    }

    try {
      const headers = {Authorization: `Bearer ${adminToken}`};
      const [employeesResult, payrollResult] = await Promise.all([
        fetch(`${API_BASE_URL}/api/employees`, {headers})
          .then(async response => ({ok: response.ok, data: await response.json().catch(() => [])}))
          .catch(() => ({ok: false, data: []})),
        fetch(`${API_BASE_URL}/api/payroll`, {headers})
          .then(async response => ({ok: response.ok, data: await response.json().catch(() => [])}))
          .catch(() => ({ok: false, data: []})),
      ]);
      const employees = Array.isArray(employeesResult.data)
        ? employeesResult.data
        : Array.isArray(employeesResult.data?.employees) ? employeesResult.data.employees : [];
      const payrolls = payrollResult.data;
      const payrollRecords = Array.isArray(payrolls)
        ? payrolls
        : Array.isArray(payrolls?.payrolls) ? payrolls.payrolls : [];

      this.setState({
        savedPayrolls: payrollResult.ok ? payrollRecords : [],
        payrollStats: {
          employees: employeesResult.ok ? employees.length : 0,
          generated: payrollResult.ok ? payrollRecords.filter(payroll => payroll.status === 'Paid').length : 0,
          pending: payrollResult.ok ? payrollRecords.filter(payroll => ['Pending', 'Draft'].includes(payroll.status)).length : 0,
          paid: payrollResult.ok ? payrollRecords.filter(payroll => payroll.status === 'Paid').length : 0,
        },
        selectedMonth: payrollRecords.some(payroll => payroll.payMonth === this.state.selectedMonth)
          ? this.state.selectedMonth
          : 'All Months',
      });
    } catch (error) {
      this.setState({payrollStats: {employees: 0, generated: 0, pending: 0, paid: 0}, savedPayrolls: []});
    } finally {
      this.setState({isLoading: false});
    }
  };

  updateSavedPayroll = updatedPayroll => {
    this.setState(previousState => {
      const savedPayrolls = previousState.savedPayrolls.map(payroll => (
        payroll.id === updatedPayroll.id ? {...payroll, ...updatedPayroll} : payroll
      ));
      return {
        savedPayrolls,
        payrollStats: {
          ...previousState.payrollStats,
          generated: savedPayrolls.filter(payroll => payroll.status === 'Paid').length,
          pending: savedPayrolls.filter(payroll => ['Pending', 'Draft'].includes(payroll.status)).length,
          paid: savedPayrolls.filter(payroll => payroll.status === 'Paid').length,
        },
      };
    });
  };

  printPayroll = async payroll => {
    let companyProfile = {};
    try {
      const response = await fetch(`${API_BASE_URL}/api/company-profile`, {
        headers: {Authorization: `Bearer ${this.props.adminToken}`},
      });
      if (response.ok) {
        companyProfile = await response.json();
      }
    } catch (error) {
      companyProfile = {};
    }

    const netSalary = payroll.netSalary === undefined || payroll.netSalary === null
      ? '--'
      : `Rs. ${Number(payroll.netSalary).toFixed(2)}`;
    const companyLogo = getAvatarUri(companyProfile.avatar);
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: Arial; color: #202633; padding: 24px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #9AA4B2; padding-bottom: 14px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .logo { width: 110px; height: 76px; object-fit: contain; }
            .brand-name { color: #142B59; font-size: 18px; }
            .company { text-align: right; font-size: 16px; line-height: 1.7; }
            .title { text-align: center; color: #142B59; font-size: 26px; margin: 16px 0 3px; }
            .period { text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 20px; }
            .details { display: flex; justify-content: space-between; font-size: 16px; line-height: 2; }
            .employee-details { padding-left: 20px; }
            .label { display: inline-block; width: 130px; font-weight: bold; }
            .breakdown { display: flex; gap: 16px; margin-top: 22px; }
            .breakdown-column { flex: 1; border: 1px solid #D8E0EC; }
            .breakdown-header { display: flex; justify-content: space-between; padding: 12px; font-size: 16px; font-weight: bold; }
            .earnings-header { color: #168143; background: #F1FBF4; }
            .deductions-header { color: #B42318; background: #FFF4F2; }
            .breakdown-row { display: flex; justify-content: space-between; padding: 12px; border-top: 1px solid #E8EDF4; font-size: 16px; }
            .net { display: flex; justify-content: space-between; margin-top: 18px; padding: 14px; border: 1px solid #B9E1C4; color: #168143; font-size: 20px; font-weight: bold; background: #F1FBF4; }
            .net-words { margin-top: 6px; color: #526078; font-size: 14px; font-style: italic; }
            .signature { width: 220px; margin: 42px 0 0 auto; padding-top: 24px; text-align: center; color: #202633; font-size: 15px; font-weight: bold; }
            .signature-label { padding-top: 8px; border-top: 1px solid #202633; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">${companyLogo ? `<img class="logo" src="${escapeHtml(companyLogo)}" />` : '<div class="logo"></div>'}</div>
            <div class="company"><b>${escapeHtml(companyProfile.companyName || 'Company')}</b><br />${escapeHtml(companyProfile.address || '')}<br />Email: ${escapeHtml(companyProfile.email || '')}<br />Phone: ${escapeHtml(companyProfile.phone || '')}</div>
          </div>
          <div class="title">PAY SLIP</div>
          <div class="period">${escapeHtml(payroll.payMonth)}</div>
          <div class="details">
            <div class="employee-details"><div><span class="label">Employee Name</span>: ${escapeHtml(payroll.employeeName || payroll.employeeId)}</div><div><span class="label">Employee ID</span>: ${escapeHtml(payroll.employeeId)}</div><div><span class="label">Designation</span>: ${escapeHtml(payroll.designation || '--')}</div><div><span class="label">Department</span>: ${escapeHtml(payroll.departmentName || '--')}</div><div><span class="label">Phone Number</span>: ${escapeHtml(payroll.phoneNumber || '--')}</div></div>
            <div><div><span class="label">Office Location</span>: ${escapeHtml(payroll.officeLocation || '--')}</div><div><span class="label">Created Date</span>: ${escapeHtml(formatGeneratedDate(payroll.createdAt))}</div><div><span class="label">Pay Period</span>: ${escapeHtml(getPayPeriod(payroll.payMonth))}</div><div><span class="label">UTR Number</span>: ${escapeHtml(payroll.utrNumber || '--')}</div><div><span class="label">Paid Date</span>: ${escapeHtml(formatGeneratedDate(payroll.paidDate))}</div></div>
          </div>
          <div class="breakdown">
            <div class="breakdown-column">
              <div class="breakdown-header earnings-header"><span>EARNINGS</span><span>Amount (₹)</span></div>
              <div class="breakdown-row"><span>Salary</span><span>Rs. ${Number(payroll.amount || 0).toFixed(2)}</span></div>
              <div class="breakdown-row"><span>Special Allowance</span><span>Rs. 0.00</span></div>
            </div>
            <div class="breakdown-column">
              <div class="breakdown-header deductions-header"><span>DEDUCTIONS</span><span>Amount (₹)</span></div>
              <div class="breakdown-row"><span>Leave Deduction</span><span>Rs. ${Number(payroll.leaveDeduction || 0).toFixed(2)}</span></div>
              <div class="breakdown-row"><span>Professional Tax</span><span>Rs. 0.00</span></div>
            </div>
          </div>
          <div class="net"><span>Net Salary</span><span>${netSalary}</span></div>
          <div class="net-words">(${numberToWords(payroll.netSalary)})</div>
          <div class="signature">
            <div class="signature-label">Authorized Signatory</div>
          </div>
        </body>
      </html>
    `;

    try {
      const file = await generatePDF({
        html,
        fileName: `${payroll.employeeId || 'employee'}-${String(payroll.payMonth || 'payslip').replace(/\s+/g, '-')}`,
        baseURL: 'file:///android_asset/',
      });
      if (!file?.filePath) {
        throw new Error('PDF file path was not returned');
      }
      await Share.open({
        url: file.filePath.startsWith('file://') ? file.filePath : `file://${file.filePath}`,
        type: 'application/pdf',
        title: 'Print payslip',
        failOnCancel: false,
      });
    } catch (error) {
      Alert.alert('Print Payslip', 'Unable to create the payslip PDF.');
    }
  };

  render() {
    const {onBack, onCreatePayroll} = this.props;
    const {payrollStats, savedPayrolls, isLoading, selectedMonth, monthMenuVisible} = this.state;
    if (this.state.selectedPayroll) {
      return <PayrollReviewScreen adminToken={this.props.adminToken} payroll={this.state.selectedPayroll} onUpdated={this.updateSavedPayroll} onSaved={() => this.setState({selectedPayroll: null})} onBack={() => this.setState({selectedPayroll: null})} />;
    }
    if (this.state.selectedPayment) {
      return <PaymentDetailsScreen payroll={this.state.selectedPayment} onBack={() => this.setState({selectedPayment: null})} />;
    }
    const monthOptions = ['All Months', ...new Set(savedPayrolls.map(payroll => payroll.payMonth).filter(Boolean))];
    const visiblePayrolls = selectedMonth === 'All Months'
      ? savedPayrolls
      : savedPayrolls.filter(payroll => payroll.payMonth === selectedMonth);
    const paidAmount = visiblePayrolls
      .filter(payroll => payroll.status === 'Paid')
      .reduce((total, payroll) => total + Number(payroll.netSalary || 0), 0);

    return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FC" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.title}>Monthly Payroll</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.loadingBox}><ActivityIndicator size="small" color="#1769E0" /></View>
        ) : (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.employeesCard]}>
              <View style={styles.statText}><Text style={styles.statLabel}>Total Employees</Text><Text style={styles.statValue}>{payrollStats.employees}</Text></View>
              <View style={[styles.iconBox, styles.employeesIcon]}><Ionicons name="people-outline" size={24} color="#1769E0" /></View>
            </View>
            <View style={[styles.statCard, styles.generatedCard]}>
              <View style={styles.statText}><Text style={styles.statLabel}>Payslips Generated</Text><Text style={styles.statValue}>{payrollStats.generated}</Text></View>
              <View style={[styles.iconBox, styles.generatedIcon]}><Ionicons name="document-text-outline" size={24} color="#168143" /></View>
            </View>
            <View style={[styles.statCard, styles.pendingCard]}>
              <View style={styles.statText}><Text style={styles.statLabel}>Pending / Draft</Text><Text style={styles.statValue}>{payrollStats.pending}</Text></View>
              <View style={[styles.iconBox, styles.pendingIcon]}><Ionicons name="time-outline" size={24} color="#D67800" /></View>
            </View>
            <View style={[styles.statCard, styles.paidCard]}>
              <View style={styles.statText}><Text style={styles.statLabel}>Paid Amount</Text><Text style={styles.statValue}>₹{paidAmount.toFixed(2)}</Text></View>
              <View style={[styles.iconBox, styles.paidIcon]}><Ionicons name="checkmark-circle-outline" size={24} color="#168143" /></View>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.createButton} activeOpacity={0.85} onPress={onCreatePayroll}>
          <Ionicons name="add-circle-outline" size={21} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create Payroll</Text>
        </TouchableOpacity>

        <Text style={styles.monthLabel}>Month</Text>
        <TouchableOpacity
          style={styles.monthSelect}
          onPress={() => this.setState({monthMenuVisible: !monthMenuVisible})}
          activeOpacity={0.8}
        >
          <Text style={styles.monthSelectText}>{selectedMonth}</Text>
          <Ionicons name="chevron-down" size={14} color="#202633" />
        </TouchableOpacity>
        {monthMenuVisible && (
          <View style={styles.monthMenu}>
            {monthOptions.map(month => (
              <TouchableOpacity
                key={month}
                style={styles.monthOption}
                onPress={() => this.setState({selectedMonth: month, monthMenuVisible: false})}
                activeOpacity={0.8}
              >
                <Text style={styles.monthOptionText}>{month}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.savedHeading}>Saved Payrolls</Text>
        {visiblePayrolls.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.payrollScrollContent}>
            <View style={styles.payrollTable}>
              <View style={[styles.payrollTableRow, styles.payrollTableHeader]}>
                <Text style={[styles.payrollCell, styles.employeeCell]}>Employee</Text>
                <Text style={[styles.payrollCell, styles.departmentCell]}>Department</Text>
                <Text style={[styles.payrollCell, styles.monthCell]}>Month</Text>
                <Text style={[styles.payrollCell, styles.salaryCell]}>Net Salary</Text>
                <Text style={[styles.payrollCell, styles.dateCell]}>Created On</Text>
                <Text style={[styles.payrollCell, styles.statusCell]}>Status</Text>
                <Text style={[styles.payrollCell, styles.actionCell]}>Action</Text>
              </View>
              {visiblePayrolls.map(payroll => (
                <View key={payroll.id || `${payroll.employeeId}-${payroll.payMonth}`} style={styles.payrollTableRow}>
                  <View style={[styles.employeeCell, styles.employeeInfo]}>
                    <View style={styles.avatar}>
                      {getAvatarUri(payroll.avatar) ? (
                        <Image source={{uri: getAvatarUri(payroll.avatar)}} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>{(payroll.employeeName || payroll.employeeId || '?').charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <Text style={styles.employeeName} numberOfLines={1}>{payroll.employeeName || payroll.employeeId}</Text>
                  </View>
                  <Text style={[styles.payrollValue, styles.departmentCell]} numberOfLines={1}>{payroll.departmentName || '--'}</Text>
                  <Text style={[styles.payrollValue, styles.monthCell]}>{payroll.payMonth || '--'}</Text>
                  <Text style={[styles.payrollValue, styles.salaryCell]}>
                    {payroll.netSalary === undefined || payroll.netSalary === null ? '--' : Number(payroll.netSalary).toFixed(2)}
                  </Text>
                  <Text style={[styles.payrollValue, styles.dateCell]}>{formatGeneratedDate(payroll.createdAt)}</Text>
                  <Text style={[styles.payrollValue, styles.statusCell]}>
                    {payroll.status === 'Paid' ? `Paid (${formatGeneratedDate(payroll.paidDate)})` : payroll.status || 'Pending'}
                  </Text>
                  <View style={[styles.payrollValue, styles.actionCell, styles.actionIcons]}>
                    <TouchableOpacity style={styles.actionIcon} onPress={() => this.setState({selectedPayroll: payroll})} accessibilityLabel={`View payroll for ${payroll.employeeName || payroll.employeeId}`} activeOpacity={0.7}>
                      <Ionicons name="eye-outline" size={17} color="#1769E0" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIcon} onPress={() => this.printPayroll(payroll)} accessibilityLabel={`Print payroll for ${payroll.employeeName || payroll.employeeId}`} activeOpacity={0.7}>
                      <Ionicons name="print-outline" size={17} color="#168143" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <Text style={styles.emptyPayrolls}>No saved payrolls found for this month</Text>
        )}
      </ScrollView>
    </SafeAreaView>
    );
  }
}

export default MonthlyPayrollScreen;

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F6F8FC'},
  header: {height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16},
  backButton: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  title: {flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#202633'},
  headerSpacer: {width: 44},
  content: {paddingHorizontal: 16, paddingTop: 8},
  loadingBox: {height: 108, alignItems: 'center', justifyContent: 'center'},
  statsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 5},
  statCard: {width: '48.5%', minHeight: 82, padding: 6, borderRadius: 9, borderWidth: 1, position: 'relative'},
  employeesCard: {backgroundColor: '#EEF5FF', borderColor: '#D5E5FF'},
  generatedCard: {backgroundColor: '#F1FBF4', borderColor: '#DCEFE1'},
  pendingCard: {backgroundColor: '#FFF9EF', borderColor: '#F6E8C9'},
  paidCard: {backgroundColor: '#F1FBF4', borderColor: '#DCEFE1'},
  iconBox: {position: 'absolute', top: 6, left: 6, width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  employeesIcon: {backgroundColor: '#DCEAFF'},
  generatedIcon: {backgroundColor: '#DDF4E4'},
  pendingIcon: {backgroundColor: '#FFEBC7'},
  paidIcon: {backgroundColor: '#DDF4E4'},
  statText: {flex: 1, minWidth: 0, alignItems: 'center'},
  statValue: {marginTop: 4, color: '#202633', fontSize: 22, fontWeight: '800', textAlign: 'center'},
  statLabel: {color: '#526078', fontSize: 10, fontWeight: '700', textAlign: 'center'},
  createButton: {height: 48, marginTop: 18, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1769E0'},
  createButtonText: {marginLeft: 8, color: '#FFFFFF', fontSize: 14, fontWeight: '800'},
  savedHeading: {marginTop: 24, marginBottom: 10, color: '#202633', fontSize: 16, fontWeight: '800'},
  payrollTable: {borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', backgroundColor: '#FFFFFF', overflow: 'hidden'},
  payrollScrollContent: {minWidth: 720},
  payrollTableRow: {minHeight: 54, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: '#E8EDF4', flexDirection: 'row', alignItems: 'center'},
  payrollTableHeader: {minHeight: 42, borderTopWidth: 0, backgroundColor: '#F6F8FC'},
  payrollCell: {color: '#202633', fontSize: 10, fontWeight: '800'},
  payrollValue: {color: '#526078', fontSize: 10},
  employeeCell: {width: 135},
  departmentCell: {width: 105},
  monthCell: {width: 95},
  salaryCell: {width: 100},
  dateCell: {width: 115},
  statusCell: {width: 75},
  actionCell: {width: 75, alignItems: 'flex-end'},
  actionIcons: {flexDirection: 'row', alignItems: 'center'},
  actionIcon: {marginLeft: 10},
  employeeInfo: {flexDirection: 'row', alignItems: 'center', overflow: 'hidden'},
  avatar: {width: 28, height: 28, marginRight: 7, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DCEAFF', overflow: 'hidden'},
  avatarImage: {width: 28, height: 28},
  avatarText: {color: '#1769E0', fontSize: 12, fontWeight: '800'},
  employeeName: {flex: 1, color: '#526078', fontSize: 10},
  emptyPayrolls: {color: '#71809C', fontSize: 13},
  monthLabel: {marginTop: 20, marginBottom: 6, color: '#526078', fontSize: 12, fontWeight: '700'},
  monthSelect: {height: 44, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF'},
  monthSelectText: {color: '#202633', fontSize: 13, fontWeight: '600'},
  monthMenu: {marginTop: 4, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', backgroundColor: '#FFFFFF'},
  monthOption: {paddingHorizontal: 12, paddingVertical: 11},
  monthOptionText: {color: '#202633', fontSize: 13},
  reviewContent: {padding: 16},
  paymentDetailsHeader: {padding: 16, borderRadius: 10, backgroundColor: '#FFFFFF'},
  paymentDetailsName: {color: '#202633', fontSize: 18, fontWeight: '800'},
  paymentDetailsMeta: {marginTop: 5, color: '#71809C', fontSize: 12},
  reviewEmployee: {padding: 16, borderRadius: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF'},
  reviewAvatar: {width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DCEAFF', overflow: 'hidden'},
  reviewAvatarImage: {width: 42, height: 42},
  reviewEmployeeDetails: {flex: 1, marginLeft: 12},
  reviewEmployeeName: {color: '#202633', fontSize: 15, fontWeight: '800'},
  reviewEmployeeMeta: {marginTop: 4, color: '#71809C', fontSize: 12},
  reviewDates: {width: 112, marginLeft: 12},
  reviewDateLabel: {marginTop: 2, color: '#71809C', fontSize: 10},
  reviewDateValue: {marginTop: 3, marginBottom: 8, color: '#202633', fontSize: 12, fontWeight: '700'},
  reviewCard: {marginTop: 16, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#D8E0EC', backgroundColor: '#FFFFFF'},
  reviewNetValue: {color: '#168143', fontWeight: '800'},
  reviewBreakdown: {marginTop: 16, flexDirection: 'row', gap: 12},
  breakdownColumn: {flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#D8E0EC', overflow: 'hidden', backgroundColor: '#FFFFFF'},
  breakdownHeader: {minHeight: 38, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F6F8FC'},
  breakdownHeaderText: {color: '#202633', fontSize: 10, fontWeight: '800'},
  breakdownRow: {minHeight: 42, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  breakdownLabel: {color: '#526078', fontSize: 11},
  breakdownAmount: {color: '#202633', fontSize: 11, fontWeight: '700'},
  netSalaryReviewCard: {marginTop: 16, padding: 14, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1FBF4'},
  netSalaryReviewLabel: {color: '#168143', fontSize: 15, fontWeight: '800'},
  paymentHeading: {marginTop: 18, marginBottom: 7, color: '#202633', fontSize: 14, fontWeight: '800'},
  paymentSelect: {height: 44, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF'},
  paymentSelectText: {color: '#202633', fontSize: 13, fontWeight: '600'},
  paymentMenu: {marginTop: 4, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', backgroundColor: '#FFFFFF'},
  paymentOption: {paddingHorizontal: 12, paddingVertical: 11},
  paymentOptionText: {color: '#202633', fontSize: 13},
  utrInput: {height: 44, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#D8E0EC', color: '#202633', fontSize: 13, backgroundColor: '#FFFFFF'},
  paidDateRow: {marginTop: 10, paddingHorizontal: 12, minHeight: 40, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1FBF4'},
  paidDateLabel: {color: '#526078', fontSize: 12, fontWeight: '700'},
  paidDateValue: {color: '#168143', fontSize: 12, fontWeight: '800'},
  paymentSaveButton: {height: 46, marginTop: 18, marginBottom: 20, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1769E0'},
  paymentSaveButtonText: {color: '#FFFFFF', fontSize: 14, fontWeight: '800'},
  disabledButton: {opacity: 0.6},
  disabledField: {opacity: 0.6},
  netSalaryWords: {marginTop: 4, color: '#526078', fontSize: 10, fontStyle: 'italic'},
  reviewCardTitle: {marginBottom: 12, color: '#202633', fontSize: 16, fontWeight: '800'},
  reviewRow: {paddingVertical: 7, color: '#526078', fontSize: 13},
  reviewValue: {color: '#202633', fontWeight: '700'},
});
