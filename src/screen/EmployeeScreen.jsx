import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  ScrollView,
  ToastAndroid,
  PermissionsAndroid,
  Platform,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {pick, types} from '@react-native-documents/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_BASE_URL = 'https://attendance-backend-11.onrender.com';

const getAvatarUri = avatar => {
  if (!avatar) {
    return null;
  }

  if (avatar.uri) {
    return avatar.uri;
  }

  if (avatar.path) {
    return avatar.path.startsWith('http')
      ? avatar.path
      : `${API_BASE_URL}${avatar.path}`;
  }

  return null;
};

const formatDate = value => {
  if (!value) {
    return 'Not provided';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const EmployeeDetails = ({employee, onBack}) => {
  const resumeUrl = employee?.resume?.path && employee?.id
    ? `${API_BASE_URL}/api/employees/${employee.id}/resume/download`
    : null;

  const openResume = async () => {
    if (!resumeUrl) {
      Alert.alert('Resume', 'No resume attached for this employee.');
      return;
    }

    try {
      await Linking.openURL(resumeUrl);
    } catch (error) {
      Alert.alert('Resume', 'Unable to open the resume download link.');
    }
  };

  return (
    <View style={styles.detailsContainer}>
      <View style={styles.detailsHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.detailsHeaderTitle}>Employee Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.profileCard}>
        <View style={[styles.detailsAvatar, {backgroundColor: employee.color || '#1769E0'}]}>
          {getAvatarUri(employee.avatar) ? (
            <Image source={{uri: getAvatarUri(employee.avatar)}} style={styles.detailsAvatarImage} />
          ) : (
            <Text style={styles.detailsAvatarText}>{employee.name.charAt(0)}</Text>
          )}
        </View>
        <Text style={styles.detailsName}>{employee.name}</Text>
        <Text style={styles.detailsRole}>{employee.role}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Personal Information</Text>
        <View style={styles.infoRow}>
          <Ionicons name="card-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Employee ID</Text>
          <Text style={styles.infoValue}>{employee.id}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{employee.email || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Gender</Text>
          <Text style={styles.infoValue}>{employee.gender || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="heart-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Marital Status</Text>
          <Text style={styles.infoValue}>{employee.maritalStatus || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="water-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Blood Group</Text>
          <Text style={styles.infoValue}>{employee.bloodGroup || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Department</Text>
          <Text style={styles.infoValue}>{employee.department || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Office Location</Text>
          <Text style={styles.infoValue}>{employee.officeLocation || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="briefcase-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Designation</Text>
          <Text style={styles.infoValue}>{employee.designation || employee.role}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>{employee.phoneNumber || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="navigate-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>City / State</Text>
          <Text style={styles.infoValue}>
            {employee.city || 'Not provided'} / {employee.state || 'Not provided'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Relationship</Text>
          <Text style={styles.infoValue}>{employee.relationship || 'Not provided'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Date of Birth</Text>
          <Text style={styles.infoValue}>{formatDate(employee.dateOfBirth)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-number-outline" size={18} color="#1769E0" />
          <Text style={styles.infoLabel}>Joining Date</Text>
          <Text style={styles.infoValue}>{formatDate(employee.joiningDate)}</Text>
        </View>

        <View style={styles.resumeCard}>
          <Text style={styles.resumeTitle}>Resume</Text>
          {resumeUrl ? (
            <TouchableOpacity style={styles.downloadResumeButton} onPress={openResume} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={18} color="#1769E0" />
              <Text style={styles.downloadResumeText}>Download Resume</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resumeEmpty}>No resume attached</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const AddEmployeeScreen = ({onBack, initialEmployee = null, onSave, adminToken}) => {
  const [form, setForm] = useState({
    employeeId: initialEmployee?.id || 'Generated by server',
    fullName: initialEmployee?.name || '',
    gender: initialEmployee?.gender || 'Select gender',
    maritalStatus: initialEmployee?.maritalStatus || 'Select marital status',
    bloodGroup: initialEmployee?.bloodGroup || 'Select blood group',
    city: initialEmployee?.city || '',
    state: initialEmployee?.state || 'Select state',
    pincode: initialEmployee?.pincode || '',
    district: initialEmployee?.district || '',
    relationship: initialEmployee?.relationship || 'Select relationship',
    relationshipPhoneNumber: initialEmployee?.relationshipPhoneNumber || '',
    phoneNumber: initialEmployee?.phoneNumber || '',
    dateOfBirth: initialEmployee?.dateOfBirth || '',
    email: initialEmployee?.email || '',
    departmentName: initialEmployee?.departmentName || 'Select department',
    designation: initialEmployee?.designation || initialEmployee?.role || '',
    officeLocation: initialEmployee?.officeLocation || '',
    joiningDate: initialEmployee?.joiningDate || 'Select joining date',
    password: initialEmployee?.password || '',
    avatar: initialEmployee?.avatar
      ? {...initialEmployee.avatar, uri: getAvatarUri(initialEmployee.avatar)}
      : null,
    resume: initialEmployee?.resume
      ? {
          uri: initialEmployee.resume.path ? `${API_BASE_URL}${initialEmployee.resume.path}` : null,
          type: initialEmployee.resume.mimeType || 'application/pdf',
          name: initialEmployee.resume.originalName || initialEmployee.resume.fileName || 'resume.pdf',
          fileName: initialEmployee.resume.originalName || initialEmployee.resume.fileName || 'resume.pdf',
        }
      : null,
  });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showJoiningDatePicker, setShowJoiningDatePicker] = useState(false);

  const dropdownOptions = {
    state: states.map(state => state.name),
    district: districts,
    relationship: ['Family', 'Friends', 'Sisters', 'Brother'],
    gender: ['Male', 'Female', 'Other'],
    maritalStatus: ['Married', 'Unmarried', 'Divorced'],
    bloodGroup: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    department: departments.map(department => department.departmentName),
  };

  useEffect(() => {
    const loadOptions = async () => {
      const headers = {Authorization: `Bearer ${adminToken}`};
      const [statesResponse, departmentsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/employees/locations/states`, {headers}),
        fetch(`${API_BASE_URL}/api/departments`, {headers}),
      ]);
      setStates(await statesResponse.json());
      setDepartments(await departmentsResponse.json());
    };

    if (adminToken) {
      loadOptions().catch(() => Alert.alert('Employees', 'Unable to load states or departments'));
    }
  }, [adminToken]);

  const updateField = (field, value) => {
    setForm(currentForm => ({...currentForm, [field]: value}));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      updateField('dateOfBirth', selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleJoiningDateChange = (event, selectedDate) => {
    setShowJoiningDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      updateField('joiningDate', selectedDate.toISOString().split('T')[0]);
    }
  };

  const selectDropdownValue = value => {
    const selectedDropdown = openDropdown;
    updateField(selectedDropdown === 'department' ? 'departmentName' : selectedDropdown, value);
    setOpenDropdown(null);

    if (selectedDropdown === 'state') {
      updateField('district', '');
      updateField('city', '');
      updateField('pincode', '');
      setDistricts([]);
      const selectedState = states.find(state => state.name === value);
      if (selectedState) {
        fetch(`${API_BASE_URL}/api/employees/locations/states/${selectedState.code}/districts`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        })
          .then(async response => {
            const result = await response.json();
            if (!response.ok) {
              throw new Error(result.message || 'Unable to load districts');
            }
            return result;
          })
          .then(result => setDistricts(result.districts || []))
          .catch(error => Alert.alert('District', error.message || 'Unable to load districts'));
      }
    }
  };

  const requestImagePermission = async source => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const permissions = [PermissionsAndroid.PERMISSIONS.CAMERA];
    if (source === 'gallery') {
      permissions.push(
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      );
    }

    const result = await PermissionsAndroid.requestMultiple(permissions);
    return permissions.every(permission => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
  };

  const chooseAvatar = async source => {
    const hasPermission = await requestImagePermission(source);

    if (!hasPermission) {
      Alert.alert('Permission required', 'Allow camera or gallery access to choose an avatar.');
      return;
    }

    const picker = source === 'camera' ? launchCamera : launchImageLibrary;
    const result = await picker({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });

    if (!result.didCancel && result.assets?.[0]) {
      updateField('avatar', result.assets[0]);
    }
  };

  const openAvatarPicker = () => {
    Alert.alert('Choose avatar', 'Select an image source', [
      {text: 'Camera', onPress: () => chooseAvatar('camera')},
      {text: 'Gallery', onPress: () => chooseAvatar('gallery')},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const pickResume = async () => {
    try {
      const result = await pick({
        type: [
          types.pdf,
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        allowMultiSelection: false,
      });

      const selectedFile = Array.isArray(result) ? result[0] : result;
      updateField('resume', {
        uri: selectedFile.uri,
        type: selectedFile.type || 'application/pdf',
        name: selectedFile.name || 'resume.pdf',
        fileName: selectedFile.name || 'resume.pdf',
      });
    } catch (error) {
      if (error && error.code === 'DOCUMENT_PICKER_CANCELED') {
        return;
      }
      Alert.alert('Resume', 'Unable to attach resume. Please try again.');
    }
  };

  return (
    <View style={styles.addContainer}>
      <View style={styles.addHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.addTitle}>{initialEmployee ? 'Edit Employee' : 'Add Employee'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <TouchableOpacity style={styles.photoPicker} activeOpacity={0.8} onPress={openAvatarPicker}>
        {form.avatar?.uri ? (
          <Image source={{uri: form.avatar.uri}} style={styles.avatarPreview} />
        ) : (
          <Ionicons name="camera" size={27} color="#5873AA" />
        )}
      </TouchableOpacity>

      <View style={styles.form}>
        <Text style={styles.formLabel}>Employee ID</Text>
        <TextInput
          style={styles.formInput}
          value={form.employeeId}
          onChangeText={value => updateField('employeeId', value)}
          placeholder="Enter employee ID"
          placeholderTextColor="#8D96A6"
        />

        <Text style={styles.formLabel}>Full Name</Text>
        <TextInput
          style={styles.formInput}
          value={form.fullName}
          onChangeText={value => updateField('fullName', value)}
          placeholder="Enter full name"
          placeholderTextColor="#8D96A6"
        />

        <Text style={styles.formLabel}>Gender</Text>
        <TouchableOpacity style={styles.selectInput} activeOpacity={0.8} onPress={() => setOpenDropdown('gender')}>
          <Text style={[styles.selectText, form.gender === 'Select gender' && styles.placeholderText]}>{form.gender}</Text>
          <Ionicons name="chevron-down" size={18} color="#202633" />
        </TouchableOpacity>

        <Text style={styles.formLabel}>Marital Status</Text>
        <TouchableOpacity style={styles.selectInput} activeOpacity={0.8} onPress={() => setOpenDropdown('maritalStatus')}>
          <Text style={[styles.selectText, form.maritalStatus === 'Select marital status' && styles.placeholderText]}>{form.maritalStatus}</Text>
          <Ionicons name="chevron-down" size={18} color="#202633" />
        </TouchableOpacity>

        <Text style={styles.formLabel}>Blood Group</Text>
        <TouchableOpacity style={styles.selectInput} activeOpacity={0.8} onPress={() => setOpenDropdown('bloodGroup')}>
          <Text style={[styles.selectText, form.bloodGroup === 'Select blood group' && styles.placeholderText]}>{form.bloodGroup}</Text>
          <Ionicons name="chevron-down" size={18} color="#202633" />
        </TouchableOpacity>

        <Text style={styles.formLabel}>State</Text>
        <TouchableOpacity
          style={styles.selectInput}
          activeOpacity={0.8}
          onPress={() => setOpenDropdown('state')}
        >
          <Text style={styles.selectText}>{form.state}</Text>
          <Ionicons name="chevron-down" size={18} color="#202633" />
        </TouchableOpacity>

        <Text style={styles.formLabel}>District</Text>
        <TouchableOpacity
          style={[styles.selectInput, !districts.length ? styles.disabledInput : null]}
          activeOpacity={0.8}
          onPress={() => {
            if (districts.length) {
              setOpenDropdown('district');
            }
          }}
        >
          <Text style={[styles.selectText, !form.district && styles.placeholderText]}>
            {form.district || 'Select district'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#202633" />
        </TouchableOpacity>

        <Text style={styles.formLabel}>City / Area</Text>
        <TextInput
          style={styles.formInput}
          value={form.city}
          onChangeText={value => updateField('city', value)}
          placeholder="Enter city or area"
          placeholderTextColor="#8D96A6"
        />

        <Text style={styles.formLabel}>Pincode</Text>
        <TextInput
          style={styles.formInput}
          value={form.pincode}
          onChangeText={value => updateField('pincode', value)}
          placeholder="Enter pincode"
          placeholderTextColor="#8D96A6"
          keyboardType="number-pad"
          maxLength={6}
        />

        <Text style={styles.formLabel}>Relationship</Text>
        <TouchableOpacity
          style={styles.selectInput}
          activeOpacity={0.8}
          onPress={() => setOpenDropdown('relationship')}
        >
          <Text style={styles.selectText}>{form.relationship}</Text>
          <Ionicons name="chevron-down" size={18} color="#202633" />
        </TouchableOpacity>

        <Text style={styles.formLabel}>Relationship Phone Number</Text>
        <TextInput
          style={styles.formInput}
          value={form.relationshipPhoneNumber}
          onChangeText={value => updateField('relationshipPhoneNumber', value)}
          placeholder="+91 98765 43210"
          placeholderTextColor="#8D96A6"
          keyboardType="phone-pad"
        />

        <Text style={styles.formLabel}>Phone Number</Text>
        <TextInput
          style={styles.formInput}
          value={form.phoneNumber}
          onChangeText={value => updateField('phoneNumber', value)}
          placeholder="+91 98765 43210"
          placeholderTextColor="#8D96A6"
          keyboardType="phone-pad"
        />

        <Text style={styles.formLabel}>Date of Birth</Text>
        <TouchableOpacity
          style={styles.selectInput}
          activeOpacity={0.8}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={[styles.selectText, !form.dateOfBirth && styles.placeholderText]}>
            {form.dateOfBirth ? formatDate(form.dateOfBirth) : 'Select date of birth'}
          </Text>
          <Ionicons name="calendar-outline" size={18} color="#243B6B" />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={form.dateOfBirth ? new Date(form.dateOfBirth) : new Date(2000, 0, 1)}
            mode="date"
            display="calendar"
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

        <Text style={styles.formLabel}>Email</Text>
        <TextInput
          style={styles.formInput}
          value={form.email}
          onChangeText={value => updateField('email', value)}
          placeholder="employee@company.com"
          placeholderTextColor="#8D96A6"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.formLabel}>Department</Text>
        <TouchableOpacity style={styles.selectInput} activeOpacity={0.8} onPress={() => setOpenDropdown('department')}>
          <Text style={styles.selectText}>{form.departmentName}</Text>
          <Ionicons name="chevron-down" size={18} color="#202633" />
        </TouchableOpacity>

        <Text style={styles.formLabel}>Designation</Text>
        <TextInput
          style={styles.formInput}
          value={form.designation}
          onChangeText={value => updateField('designation', value)}
          placeholder="Software Engineer"
          placeholderTextColor="#8D96A6"
        />

        <Text style={styles.formLabel}>Office Location</Text>
        <TextInput
          style={styles.formInput}
          value={form.officeLocation}
          onChangeText={value => updateField('officeLocation', value)}
          placeholder="Enter office location"
          placeholderTextColor="#8D96A6"
        />

        <Text style={styles.formLabel}>Joining Date</Text>
        <TouchableOpacity
          style={styles.selectInput}
          activeOpacity={0.8}
          onPress={() => setShowJoiningDatePicker(true)}
        >
          <Text style={[styles.selectText, form.joiningDate === 'Select joining date' && styles.placeholderText]}>
            {form.joiningDate === 'Select joining date' ? form.joiningDate : formatDate(form.joiningDate)}
          </Text>
          <Ionicons name="calendar-outline" size={18} color="#243B6B" />
        </TouchableOpacity>
        {showJoiningDatePicker && (
          <DateTimePicker
            value={form.joiningDate && form.joiningDate !== 'Select joining date'
              ? new Date(form.joiningDate)
              : new Date()}
            mode="date"
            display="calendar"
            onChange={handleJoiningDateChange}
          />
        )}

        {!initialEmployee && (
          <>
            <Text style={styles.formLabel}>Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={form.password}
                onChangeText={value => updateField('password', value)}
                placeholder="Enter password"
                placeholderTextColor="#8D96A6"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(currentValue => !currentValue)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color="#68758C"
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.formLabel}>Resume</Text>
        <TouchableOpacity style={styles.resumeButton} activeOpacity={0.8} onPress={pickResume}>
          <Ionicons name="attach-outline" size={18} color="#1769E0" />
          <Text style={styles.resumeText}>
            {form.resume?.name ? `Resume: ${form.resume.name}` : 'Attach Resume'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveButton}
          activeOpacity={0.85}
          onPress={() => onSave?.(form)}
        >
          <Text style={styles.saveButtonText}>{initialEmployee ? 'Update Employee' : 'Save Employee'}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={Boolean(openDropdown)}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenDropdown(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setOpenDropdown(null)}
        >
          <View style={styles.dropdownMenu}>
            <View style={styles.dropdownHeader}>
              <View style={styles.dropdownHeaderIcon}>
                <Ionicons
                  name={openDropdown === 'state' ? 'map-outline' : 'location-outline'}
                  size={20}
                  color="#1769E0"
                />
              </View>
              <View style={styles.dropdownHeaderText}>
                <Text style={styles.dropdownTitle}>
                  Select {openDropdown === 'state' ? 'State' : openDropdown === 'district' ? 'District' : openDropdown}
                </Text>
                <Text style={styles.dropdownSubtitle}>
                  {dropdownOptions[openDropdown]?.length || 0} options available
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dropdownCloseButton}
                activeOpacity={0.8}
                onPress={() => setOpenDropdown(null)}
              >
                <Ionicons name="close" size={20} color="#67748E" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.dropdownScroll}
              contentContainerStyle={styles.dropdownScrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {openDropdown && dropdownOptions[openDropdown].length > 0 ? (
                dropdownOptions[openDropdown].map(option => {
                  const selectedValue = openDropdown === 'department'
                    ? form.departmentName
                    : form[openDropdown];
                  const isSelected = selectedValue === option;

                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.dropdownOption, isSelected && styles.dropdownOptionSelected]}
                      activeOpacity={0.8}
                      onPress={() => selectDropdownValue(option)}
                    >
                      <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextSelected]}>
                        {option}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#1769E0" />}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.dropdownEmpty}>
                  <Ionicons name="file-tray-outline" size={28} color="#9BA6B8" />
                  <Text style={styles.dropdownEmptyTitle}>No options available</Text>
                  <Text style={styles.dropdownEmptyText}>
                    {openDropdown === 'district' ? 'Select a state first.' : 'Options will appear here.'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const EmployeeScreen = ({adminToken, themeMode = 'light'}) => {
  const [searchText, setSearchText] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [showDepartmentFilter, setShowDepartmentFilter] = useState(false);
  const [employeeList, setEmployeeList] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const request = React.useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${adminToken}`,
        ...(options.headers || {}),
      },
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Employee request failed');
    }

    return result;
  }, [adminToken]);

  const mapEmployee = employee => ({
    ...employee,
    name: employee.fullName,
    id: employee.employeeId,
    role: employee.designation,
    department: employee.departmentName,
    color: '#1769E0',
    avatar: employee.avatar
      ? {...employee.avatar, uri: getAvatarUri(employee.avatar)}
      : null,
  });

  const loadEmployees = React.useCallback(async () => {
    try {
      const result = await request('/api/employees');
      setEmployeeList(result.map(mapEmployee));
    } catch (error) {
      Alert.alert('Employees', error.message);
    }
  }, [request]);

  const loadDepartmentOptions = React.useCallback(async () => {
    try {
      const result = await request('/api/departments');
      setDepartmentOptions(result.map(department => department.departmentName));
    } catch (error) {
      Alert.alert('Departments', error.message);
    }
  }, [request]);

  useEffect(() => {
    if (adminToken) {
      loadEmployees();
      loadDepartmentOptions();
    }
  }, [adminToken, loadEmployees, loadDepartmentOptions]);

  const saveEmployee = async form => {
    try {
      const body = new FormData();
      const fields = {
        fullName: form.fullName,
        gender: form.gender === 'Select gender' ? '' : form.gender,
        maritalStatus: form.maritalStatus === 'Select marital status' ? '' : form.maritalStatus,
        bloodGroup: form.bloodGroup === 'Select blood group' ? '' : form.bloodGroup,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        district: form.district,
        relationship: form.relationship,
        relationshipPhoneNumber: form.relationshipPhoneNumber,
        phoneNumber: form.phoneNumber,
        dateOfBirth: form.dateOfBirth,
        email: form.email,
        departmentName: form.departmentName,
        designation: form.designation,
        officeLocation: form.officeLocation,
        joiningDate: form.joiningDate,
        password: form.password,
      };

      Object.entries(fields).forEach(([key, value]) => body.append(key, value || ''));

      if (form.avatar?.uri) {
        body.append('avatar', {
          uri: form.avatar.uri,
          type: form.avatar.type || 'image/jpeg',
          name: form.avatar.fileName || 'avatar.jpg',
        });
      }

      if (form.resume?.uri) {
        body.append('resume', {
          uri: form.resume.uri,
          type: form.resume.type || 'application/pdf',
          name: form.resume.fileName || 'resume.pdf',
        });
      }

      const result = editingEmployee
        ? await request(`/api/employees/${editingEmployee.id}`, {method: 'PUT', body})
        : await request('/api/employees', {method: 'POST', body});
      const mappedResult = mapEmployee(result);

      setEmployeeList(current => editingEmployee
        ? current.map(item => item.id === mappedResult.id ? mappedResult : item)
        : [...current, mappedResult]);
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          editingEmployee ? 'Employee updated successfully' : 'Employee added successfully',
          ToastAndroid.SHORT,
        );
      } else {
        Alert.alert('Employees', editingEmployee ? 'Employee updated successfully' : 'Employee added successfully');
      }
      setEditingEmployee(null);
      setIsAddingEmployee(false);
    } catch (error) {
      Alert.alert('Employees', error.message);
    }
  };

  const visibleEmployees = employeeList.filter(employee => {
    const matchesSearch = `${employee.name} ${employee.id} ${employee.role}`
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const matchesDepartment = departmentFilter === 'All Departments'
      || employee.department === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  if (selectedEmployee) {
    return (
      <EmployeeDetails
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
      />
    );
  }

  if (editingEmployee) {
    return (
      <AddEmployeeScreen
        adminToken={adminToken}
        initialEmployee={editingEmployee}
        onBack={() => setEditingEmployee(null)}
        onSave={saveEmployee}
      />
    );
  }

  if (isAddingEmployee) {
    return (
      <AddEmployeeScreen
        adminToken={adminToken}
        onBack={() => setIsAddingEmployee(false)}
        onSave={saveEmployee}
      />
    );
  }

  return (
    <View style={[styles.container, themeMode === 'dark' && styles.darkContainer]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Employees</Text>
          <Text style={styles.countText}>{employeeList.length} Employees</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => setIsAddingEmployee(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#7B8495" />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search employees..."
          placeholderTextColor="#8D96A6"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={styles.departmentFilter}
        activeOpacity={0.8}
        onPress={() => setShowDepartmentFilter(true)}
      >
        <Ionicons name="business-outline" size={18} color="#1769E0" />
        <Text style={styles.departmentFilterText}>{departmentFilter}</Text>
        <Ionicons name="chevron-down" size={18} color="#67748E" />
      </TouchableOpacity>

      <Modal
        visible={showDepartmentFilter}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDepartmentFilter(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDepartmentFilter(false)}
        >
          <View style={styles.departmentFilterMenu}>
            <Text style={styles.departmentFilterTitle}>Filter by Department</Text>
            <ScrollView style={styles.departmentFilterScroll} showsVerticalScrollIndicator>
              {['All Departments', ...departmentOptions].map(option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.departmentFilterOption, departmentFilter === option && styles.departmentFilterOptionSelected]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setDepartmentFilter(option);
                    setShowDepartmentFilter(false);
                  }}
                >
                  <Text style={[styles.departmentFilterOptionText, departmentFilter === option && styles.departmentFilterOptionTextSelected]}>
                    {option}
                  </Text>
                  {departmentFilter === option && <Ionicons name="checkmark-circle" size={20} color="#1769E0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.employeeList}>
        {visibleEmployees.map(employee => (
          <TouchableOpacity
            key={employee.id}
            style={styles.employeeCard}
            activeOpacity={0.85}
          >
            <View style={[styles.avatar, {backgroundColor: employee.color || '#1769E0'}]}>
              {getAvatarUri(employee.avatar) ? (
                <Image source={{uri: getAvatarUri(employee.avatar)}} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{employee.name.charAt(0)}</Text>
              )}
            </View>

            <View style={styles.employeeInfo}>
              <Text style={styles.employeeName}>{employee.name}</Text>
              <Text style={styles.employeeId}>{employee.id}</Text>
              <Text style={styles.employeeRole}>{employee.role}</Text>
            </View>

            <View style={styles.employeeActions}>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                accessibilityLabel={`View ${employee.name}`}
                onPress={() => setSelectedEmployee(employee)}
              >
                <Ionicons name="eye-outline" size={19} color="#1769E0" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                accessibilityLabel={`Edit ${employee.name}`}
                onPress={() => setEditingEmployee(employee)}
              >
                <Ionicons name="create-outline" size={19} color="#FF8A00" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.8}
                accessibilityLabel={`Delete ${employee.name}`}
                onPress={() => {
                  Alert.alert(
                    'Delete employee',
                    `Remove ${employee.name}?`,
                    [
                      {text: 'Cancel', style: 'cancel'},
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await request(`/api/employees/${employee.id}`, {method: 'DELETE'});
                            setEmployeeList(currentEmployees => currentEmployees.filter(item => item.id !== employee.id));
                            if (Platform.OS === 'android') {
                              ToastAndroid.show('Employee deleted successfully', ToastAndroid.SHORT);
                            } else {
                              Alert.alert('Employees', 'Employee deleted successfully');
                            }
                          } catch (error) {
                            Alert.alert('Employees', error.message);
                          }
                        },
                      },
                    ],
                  );
                }}
              >
                <Ionicons name="trash-outline" size={19} color="#F04444" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default EmployeeScreen;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingBottom: 12,
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
  countText: {
    marginTop: 3,
    fontSize: 12,
    color: '#67748E',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1769E0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  departmentFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  departmentFilterText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#202633',
  },
  departmentFilterMenu: {
    width: '100%',
    maxHeight: 480,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  departmentFilterTitle: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#202633',
  },
  departmentFilterScroll: {
    maxHeight: 390,
  },
  departmentFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  departmentFilterOptionSelected: {
    backgroundColor: '#EDF4FF',
  },
  departmentFilterOptionText: {
    flex: 1,
    fontSize: 12,
    color: '#364154',
  },
  departmentFilterOptionTextSelected: {
    fontWeight: '800',
    color: '#1769E0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 7,
    paddingVertical: 0,
    fontSize: 12,
    color: '#000000',
  },
  employeeList: {
    marginTop: 8,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 96,
    marginHorizontal: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E7EAF0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  employeeInfo: {
    flex: 1,
    marginLeft: 10,
  },
  employeeName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  employeeId: {
    marginTop: 2,
    fontSize: 9,
    color: '#000000',
  },
  employeeRole: {
    marginTop: 2,
    fontSize: 10,
    color: '#000000',
  },
  employeeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FB',
  },
  addContainer: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  addHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  addTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000000',
  },
  photoPicker: {
    width: 68,
    height: 68,
    marginTop: 14,
    alignSelf: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#AFC1E2',
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFE',
  },
  avatarPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  form: {
    marginTop: 4,
  },
  formLabel: {
    marginTop: 9,
    marginBottom: 4,
    fontSize: 10,
    color: '#000000',
  },
  formInput: {
    height: 34,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 11,
    color: '#000000',
  },
  readOnlyInput: {
    color: '#67748E',
    backgroundColor: '#F3F5F8',
  },
  multilineInput: {
    height: 52,
    textAlignVertical: 'top',
    paddingTop: 9,
  },
  placeholderText: {
    color: '#8D96A6',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 34,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  disabledInput: {
    backgroundColor: '#F3F5F8',
  },
  selectText: {
    fontSize: 11,
    color: '#000000',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingLeft: 10,
    paddingRight: 9,
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 11,
    color: '#000000',
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#AFC1E2',
    borderRadius: 8,
    backgroundColor: '#F8FAFE',
  },
  resumeText: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: '700',
    color: '#1769E0',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  dropdownMenu: {
    width: '100%',
    maxHeight: 520,
    paddingTop: 16,
    paddingBottom: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F3',
  },
  dropdownHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF4FF',
  },
  dropdownHeaderText: {
    flex: 1,
    marginLeft: 10,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#202633',
  },
  dropdownSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#67748E',
  },
  dropdownCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FB',
  },
  dropdownScroll: {
    maxHeight: 430,
  },
  dropdownScrollContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  dropdownOptionSelected: {
    backgroundColor: '#EDF4FF',
  },
  dropdownOptionText: {
    flex: 1,
    fontSize: 13,
    color: '#364154',
  },
  dropdownOptionTextSelected: {
    fontWeight: '800',
    color: '#1769E0',
  },
  dropdownEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    paddingHorizontal: 20,
  },
  dropdownEmptyTitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '800',
    color: '#364154',
  },
  dropdownEmptyText: {
    marginTop: 4,
    fontSize: 11,
    color: '#67748E',
    textAlign: 'center',
  },
  dropdownOptionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F3',
  },
  saveButton: {
    height: 42,
    marginTop: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1769E0',
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 6,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  detailsAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  detailsAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detailsAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  detailsHeaderTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '800',
    color: '#202633',
    textAlign: 'center',
  },
  detailsName: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '800',
    color: '#202633',
    textAlign: 'center',
    fontFamily: 'System',
  },
  detailsRole: {
    marginTop: 4,
    fontSize: 12,
    color: '#67748E',
    textAlign: 'center',
  },
  detailsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },
  detailsStatsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  detailsStatBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  detailsStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1769E0',
  },
  detailsStatLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#67748E',
    textAlign: 'center',
  },
  infoCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  infoTitle: {
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '800',
    color: '#202633',
  },
  resumeCard: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F3',
  },
  resumeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#202633',
    marginBottom: 10,
  },
  downloadResumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: 8,
    backgroundColor: '#EDF4FF',
  },
  downloadResumeText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#1769E0',
  },
  resumeEmpty: {
    fontSize: 11,
    color: '#67748E',
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F3',
  },
  infoLabel: {
    flex: 1,
    marginLeft: 10,
    fontSize: 11,
    color: '#67748E',
  },
  infoValue: {
    maxWidth: 145,
    fontSize: 11,
    fontWeight: '700',
    color: '#202633',
    textAlign: 'right',
  },
});
