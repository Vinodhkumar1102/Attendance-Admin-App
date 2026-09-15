import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  ScrollView,
  ToastAndroid,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {launchImageLibrary} from 'react-native-image-picker';

const API_BASE_URL = 'https://attendance-backend-1-2bdo.onrender.com';

const getAvatarUri = avatar => {
  if (!avatar) return null;
  if (avatar.uri) return avatar.uri;
  return avatar.path?.startsWith('http') ? avatar.path : `${API_BASE_URL}${avatar.path}`;
};

const permissionGroups = [
  {
    name: 'Dashboard',
    permissions: ['View Dashboard', 'Dashboard Analytics'],
  },
  {
    name: 'Employees',
    permissions: ['View Employees', 'Add Employee', 'Edit Employee', 'Delete Employee', 'Export Employees'],
  },
  {
    name: 'Departments',
    permissions: ['View Departments'],
  },
];

const permissionRecords = [
  {permission: 'view_dashboard', module: 'Dashboard', description: 'Can view dashboard'},
  {permission: 'dashboard_analytics', module: 'Dashboard', description: 'Can view dashboard analytics'},
  {permission: 'view_employees', module: 'Employees', description: 'Can view employees list'},
  {permission: 'add_employee', module: 'Employees', description: 'Can add new employees'},
  {permission: 'edit_employee', module: 'Employees', description: 'Can edit employee details'},
];

const AddUserScreen = ({onBack, onSave, initialUser = null, departments = []}) => {
  const [form, setForm] = useState({
    fullName: initialUser?.name || '',
    email: initialUser?.email || '',
    phone: initialUser?.phone || '',
    department: initialUser?.department || 'Select department',
    password: initialUser?.password || '',
    avatar: initialUser?.avatar || null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const updateField = (field, value) => {
    setForm(currentForm => ({...currentForm, [field]: value}));
  };

  const chooseAvatar = async () => {
    if (Platform.OS === 'android') {
      const permission = Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const result = await PermissionsAndroid.request(permission);
      if (result !== PermissionsAndroid.RESULTS.GRANTED && Platform.Version < 33) {
        Alert.alert('Permission required', 'Allow photo access to select a user avatar.');
        return;
      }
    }

    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.85, selectionLimit: 1});
    if (!result.didCancel && result.assets?.[0]) {
      updateField('avatar', result.assets[0]);
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.formHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.formTitle}>{initialUser ? 'Edit User' : 'Add New User'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.formSectionTitle}>Basic Information</Text>
      <TouchableOpacity style={styles.avatarPicker} onPress={chooseAvatar} activeOpacity={0.8}>
        {form.avatar?.uri ? (
          <Image source={{uri: form.avatar.uri}} style={styles.avatarImage} />
        ) : (
          <Ionicons name="camera-outline" size={24} color="#5269A6" />
        )}
        <View style={styles.avatarPickerText}>
          <Text style={styles.avatarTitle}>{form.avatar ? 'Change avatar' : 'Add avatar'}</Text>
          <Text style={styles.avatarSubtitle}>Choose a profile image</Text>
        </View>
        <Ionicons name="chevron-forward" size={17} color="#98A1B3" />
      </TouchableOpacity>
      <Text style={styles.formLabel}>Full Name *</Text>
      <TextInput style={styles.formInput} value={form.fullName} onChangeText={value => updateField('fullName', value)} placeholder="Enter full name" placeholderTextColor="#8D96A6" />

      <Text style={styles.formLabel}>Email Address *</Text>
      <TextInput style={styles.formInput} value={form.email} onChangeText={value => updateField('email', value)} placeholder="Enter email address" placeholderTextColor="#8D96A6" keyboardType="email-address" autoCapitalize="none" />

      <Text style={styles.formLabel}>Phone Number</Text>
      <TextInput style={styles.formInput} value={form.phone} onChangeText={value => updateField('phone', value)} placeholder="Enter phone number" placeholderTextColor="#8D96A6" keyboardType="phone-pad" />

      <Text style={styles.formLabel}>Password *</Text>
      <View style={styles.passwordContainer}>
        <TextInput style={styles.passwordInput} value={form.password} onChangeText={value => updateField('password', value)} placeholder="Enter password" placeholderTextColor="#8D96A6" secureTextEntry={!showPassword} />
        <TouchableOpacity onPress={() => setShowPassword(value => !value)} activeOpacity={0.8}>
          <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color="#68758C" />
        </TouchableOpacity>
      </View>

      <View style={styles.formTwoColumns}>
        <View style={styles.formHalf}>
          <Text style={styles.formLabel}>Department</Text>
          <TouchableOpacity style={styles.selectInput} activeOpacity={0.8} onPress={() => setOpenDropdown('department')}>
            <Text style={styles.selectText}>{form.department}</Text>
            <Ionicons name="chevron-down" size={15} color="#4B556B" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={() => onSave(form)} activeOpacity={0.8}>
          <Text style={styles.saveText}>{initialUser ? 'Update User' : 'Save User'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={Boolean(openDropdown)} transparent animationType="fade" onRequestClose={() => setOpenDropdown(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpenDropdown(null)}>
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownTitle}>Select {openDropdown}</Text>
            <ScrollView style={styles.dropdownScroll}>
              {departments.map(option => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownOption}
                  activeOpacity={0.8}
                  onPress={() => { updateField(openDropdown, option); setOpenDropdown(null); }}
                >
                  <Text style={styles.dropdownOptionText}>{option}</Text>
                  {form[openDropdown] === option && <Ionicons name="checkmark" size={18} color="#1769E0" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const UserDetailsScreen = ({user, onBack, onEdit, onDelete}) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([
    'View Dashboard',
    'View Employees',
    'Add Employee',
    'Edit Employee',
    'Delete Employee',
    'View Departments',
  ]);

  const togglePermission = permission => {
    setSelectedPermissions(currentPermissions => currentPermissions.includes(permission)
      ? currentPermissions.filter(item => item !== permission)
      : [...currentPermissions, permission]);
  };

  const filteredPermissionGroups = permissionGroups.map(group => ({
    ...group,
    permissions: group.permissions.filter(permission => permission.toLowerCase().includes(permissionSearch.toLowerCase())),
  })).filter(group => group.permissions.length > 0 || group.name.toLowerCase().includes(permissionSearch.toLowerCase()));

  return (
    <View style={styles.detailsContainer}>
      <View style={styles.detailsTopBar}>
        <TouchableOpacity style={styles.detailsTopBackButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <View style={styles.detailsTopText}>
          <Text style={styles.detailsHeading}>User Details</Text>
          <Text style={styles.detailsSubtitle}>View user information and activity</Text>
        </View>
        <View style={styles.detailsMenuButton} />
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.detailsBackButton} />
           <View style={styles.profileMenuButton} />
        </View>

        <View style={styles.profileIdentity}>
          <View style={[styles.profileAvatar, {backgroundColor: user.color}]}>
            {getAvatarUri(user.avatar) ? <Image source={{uri: getAvatarUri(user.avatar)}} style={styles.profileAvatarImage} /> : <Text style={styles.profileAvatarText}>{user.name.charAt(0)}</Text>}
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <View style={styles.profileTags}>
              <Text style={styles.departmentTag}>{user.department}</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsTabs}>
          {['Overview', 'Permission Manager'].map(tab => (
            <TouchableOpacity key={tab} style={styles.detailsTab} onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
              <Text style={[styles.detailsTabText, activeTab === tab && styles.detailsTabTextActive]}>{tab}</Text>
              {activeTab === tab && <View style={styles.detailsTabLine} />}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'Overview' ? (
          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}><Text style={styles.overviewLabel}>Phone</Text><Text style={styles.overviewValue}>{user.phone || 'Not provided'}</Text></View>
            <View style={styles.overviewItem}><Text style={styles.overviewLabel}>Joined Date</Text><Text style={styles.overviewValue}>{user.joinedDate ? new Date(user.joinedDate).toLocaleDateString('en-GB') : 'Not available'}</Text></View>
            <View style={styles.overviewItem}><Text style={styles.overviewLabel}>Last Login</Text><Text style={styles.overviewValue}>{user.lastLogin || 'Not available'}</Text></View>
          </View>
        ) : (
          <View style={styles.permissionManager}>
            <View style={styles.permissionSearchBox}>
              <Ionicons name="search-outline" size={16} color="#7B8495" />
              <TextInput
                style={styles.permissionSearchInput}
                value={permissionSearch}
                onChangeText={setPermissionSearch}
                placeholder="Search permissions..."
                placeholderTextColor="#8D96A6"
              />
            </View>

            {filteredPermissionGroups.map(group => (
              <View key={group.name} style={styles.permissionGroup}>
                <View style={styles.permissionGroupTitle}>
                  <Ionicons name="chevron-down" size={14} color="#5269A6" />
                  <Text style={styles.permissionGroupText}>{group.name}</Text>
                </View>
                {group.permissions.map(permission => {
                  const isSelected = selectedPermissions.includes(permission);

                  return (
                    <TouchableOpacity
                      key={permission}
                      style={styles.permissionRow}
                      onPress={() => togglePermission(permission)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.permissionCheckbox, isSelected && styles.permissionCheckboxActive]}>
                        {isSelected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.permissionText}>{permission}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <TouchableOpacity style={styles.savePermissionsButton} activeOpacity={0.85} onPress={() => setActiveTab('Overview')}>
              <Text style={styles.savePermissionsText}>Save Permissions</Text>
            </TouchableOpacity>

            <View style={styles.permissionsTable}>
              <View style={styles.permissionsTableHeader}>
                <Text style={[styles.permissionColumn, styles.permissionNameColumn]}>Permission</Text>
                <Text style={styles.permissionColumn}>Module</Text>
                <Text style={[styles.permissionColumn, styles.permissionDescriptionColumn]}>Description</Text>
                <Text style={[styles.permissionColumn, styles.permissionStatusColumn]}>Status</Text>
              </View>
              {permissionRecords.map(record => (
                <View key={record.permission} style={styles.permissionTableRow}>
                  <Text style={[styles.permissionCell, styles.permissionNameColumn]}>{record.permission}</Text>
                  <Text style={styles.permissionCell}>{record.module}</Text>
                  <Text style={[styles.permissionCell, styles.permissionDescriptionColumn]}>{record.description}</Text>
                  <View style={styles.permissionStatusColumn}>
                    <Text style={styles.permissionActiveBadge}>Active</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const UsersRolesScreen = ({onBack, adminToken}) => {
  const [userList, setUserList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const mapUser = user => ({
    ...user,
    id: user._id,
    name: user.fullName,
    department: user.department || 'Not assigned',
    avatar: user.avatar ? {...user.avatar, uri: getAvatarUri(user.avatar)} : null,
    color: '#1769E0',
    joinedDate: user.createdAt,
    lastLogin: 'Not available',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const headers = {Authorization: `Bearer ${adminToken}`};
        const [usersResponse, departmentsResponse] = await Promise.all([
          fetch('http://192.168.0.102:5000/api/users', {headers}),
          fetch('http://192.168.0.102:5000/api/departments', {headers}),
        ]);
        const usersResult = await usersResponse.json();
        const departmentsResult = await departmentsResponse.json();
        if (!usersResponse.ok) throw new Error(usersResult.message || 'Unable to load users');
        if (!departmentsResponse.ok) throw new Error(departmentsResult.message || 'Unable to load departments');
        setUserList(usersResult.map(mapUser));
        setDepartments(departmentsResult.map(department => department.departmentName));
      } catch (error) {
        Alert.alert('Users', error.message);
      }
    };
    if (adminToken) loadData();
  }, [adminToken]);

  const saveUser = async form => {
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key !== 'avatar' && key !== 'password') {
          body.append(key, value || '');
        }
      });
      if (form.password) {
        body.append('password', form.password);
      }
      if (form.avatar?.uri && !form.avatar.uri.startsWith('http')) {
        body.append('avatar', {
          uri: form.avatar.uri,
          type: form.avatar.type || 'image/jpeg',
          name: form.avatar.fileName || form.avatar.fileName || 'user-avatar.jpg',
        });
      }
      const response = await fetch(`http://192.168.0.102:5000/api/users${editingUser ? `/${editingUser.id}` : ''}`, {
        method: editingUser ? 'PUT' : 'POST',
        headers: {Authorization: `Bearer ${adminToken}`},
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save user');
      const updatedUser = mapUser(result);
      setUserList(currentUsers => editingUser
        ? currentUsers.map(user => user.id === updatedUser.id ? updatedUser : user)
        : [updatedUser, ...currentUsers]);
      setEditingUser(null);
      setShowAddUser(false);
      if (Platform.OS === 'android') {
        ToastAndroid.show(editingUser ? 'User updated successfully' : 'User created successfully', ToastAndroid.SHORT);
      }
    } catch (error) {
      Alert.alert('Users', error.message);
    }
  };

  const deleteUser = user => {
    Alert.alert('Delete user', `Remove ${user.name}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          fetch(`http://192.168.0.102:5000/api/users/${user.id}`, {method: 'DELETE', headers: {Authorization: `Bearer ${adminToken}`}})
            .then(async response => {
              const result = await response.json();
              if (!response.ok) throw new Error(result.message || 'Unable to delete user');
              setUserList(currentUsers => currentUsers.filter(item => item.id !== user.id));
              setSelectedUser(null);
              if (Platform.OS === 'android') ToastAndroid.show('User deleted successfully', ToastAndroid.SHORT);
            })
            .catch(error => Alert.alert('Users', error.message));
        },
      },
    ]);
  };

  if (selectedUser) {
    return (
      <UserDetailsScreen
        user={selectedUser}
        onBack={() => setSelectedUser(null)}
        onEdit={() => {
          setEditingUser(selectedUser);
          setSelectedUser(null);
        }}
        onDelete={() => deleteUser(selectedUser)}
      />
    );
  }

  if (showAddUser || editingUser) {
    return (
      <AddUserScreen
        departments={departments}
        initialUser={editingUser}
        onBack={() => { setShowAddUser(false); setEditingUser(null); }}
        onSave={saveUser}
      />
    );
  }

  const visibleUsers = userList.filter(user => {
    const matchesSearch = `${user.name} ${user.email} ${user.department}`
      .toLowerCase()
      .includes(searchText.toLowerCase());
    return matchesSearch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Users</Text>
          <Text style={styles.subtitle}>Manage system users and their access</Text>
        </View>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={() => setShowAddUser(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color="#7B8495" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search users by name, email or department..."
            placeholderTextColor="#8D96A6"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.headerLabel, styles.userColumn]}>User</Text>
        <Text style={styles.headerLabel}>Department</Text>
        <Text style={[styles.headerLabel, styles.actionsHeader]}>Actions</Text>
      </View>

      {visibleUsers.map(user => (
        <View key={user.email} style={styles.userCard}>
          <View style={styles.userColumn}>
            <View style={[styles.avatar, {backgroundColor: user.color}]}>
              {getAvatarUri(user.avatar) ? <Image source={{uri: getAvatarUri(user.avatar)}} style={styles.userAvatarImage} /> : <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>}
            </View>
            <View style={styles.userText}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
          </View>
          <Text style={styles.departmentText}>{user.department}</Text>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => setSelectedUser(user)}>
              <Ionicons name="eye-outline" size={15} color="#5269A6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => setEditingUser(user)}>
              <Ionicons name="create-outline" size={15} color="#5269A6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.8} onPress={() => deleteUser(user)}>
              <Ionicons name="trash-outline" size={15} color="#F04444" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Text style={styles.footerText}>Showing {visibleUsers.length} of {userList.length} users</Text>
    </View>
  );
};

export default UsersRolesScreen;

const styles = StyleSheet.create({
  container: {paddingHorizontal: 8, paddingBottom: 18},
  header: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 12},
  backButton: {width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  headerText: {flex: 1, marginLeft: 8},
  title: {fontSize: 20, fontWeight: '800', color: '#000000'},
  subtitle: {marginTop: 2, fontSize: 11, color: '#4B556B'},
  addButton: {width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1769E0'},
  controlsRow: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginTop: 12, gap: 5},
  searchBox: {flex: 1, flexDirection: 'row', alignItems: 'center', height: 36, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 8, backgroundColor: '#FFFFFF'},
  searchInput: {flex: 1, marginLeft: 5, paddingVertical: 0, fontSize: 9, color: '#000000'},
  filterButton: {flex: 0.58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 36, paddingHorizontal: 7, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 8, backgroundColor: '#FFFFFF'},
  filterButtonText: {fontSize: 9, color: '#202633'},
  listHeader: {flexDirection: 'row', alignItems: 'center', minHeight: 32, marginHorizontal: 8, marginTop: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#E7EAF0'},
  headerLabel: {flex: 0.8, fontSize: 9, fontWeight: '800', color: '#202633', textAlign: 'center'},
  userColumn: {flex: 1.8, flexDirection: 'row', alignItems: 'center', textAlign: 'left'},
  userCard: {position: 'relative', flexDirection: 'row', alignItems: 'center', minHeight: 62, marginHorizontal: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#EEF0F3', backgroundColor: '#FFFFFF'},
  avatar: {width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center'},
  userAvatarImage: {width: '100%', height: '100%', borderRadius: 15},
  avatarText: {fontSize: 13, fontWeight: '800', color: '#FFFFFF'},
  userText: {marginLeft: 6, flex: 1},
  userName: {fontSize: 10, fontWeight: '800', color: '#000000'},
  email: {marginTop: 2, fontSize: 8, color: '#4B556B'},
  roleText: {flex: 0.8, fontSize: 9, color: '#1769E0', textAlign: 'center'},
  departmentText: {flex: 0.95, fontSize: 9, color: '#000000', textAlign: 'center'},
  statusBadge: {flex: 0.8, paddingVertical: 4, borderRadius: 5, alignItems: 'center'},
  activeBadge: {backgroundColor: '#DDF7E8'},
  inactiveBadge: {backgroundColor: '#FFE1E1'},
  statusText: {fontSize: 9, fontWeight: '700'},
  activeText: {color: '#159A63'},
  inactiveText: {color: '#D63B3B'},
  actionsHeader: {flex: 0, width: 72},
  actions: {width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  actionButton: {width: 22, height: 28, alignItems: 'center', justifyContent: 'center'},
  footerText: {marginHorizontal: 12, marginTop: 12, fontSize: 9, color: '#67748E'},
  rowMenu: {position: 'absolute', right: 8, top: 48, zIndex: 2, flexDirection: 'row', gap: 12, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E5EC', shadowColor: '#000000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3},
  rowMenuEdit: {fontSize: 10, fontWeight: '700', color: '#1769E0'},
  rowMenuDelete: {fontSize: 10, fontWeight: '700', color: '#F04444'},
  detailsContainer: {paddingHorizontal: 8, paddingBottom: 18},
  detailsTopBar: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 12},
  detailsBadge: {width: 32, height: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4130D8'},
  detailsBadgeText: {fontSize: 18, fontWeight: '800', color: '#FFFFFF'},
  detailsTopText: {flex: 1, marginLeft: 8},
  detailsHeading: {fontSize: 17, fontWeight: '800', color: '#4130D8'},
  detailsSubtitle: {marginTop: 2, fontSize: 10, color: '#67748E'},
  detailsMenuButton: {width: 32, height: 32, alignItems: 'center', justifyContent: 'center'},
  profileCard: {marginTop: 4, borderRadius: 13, backgroundColor: '#FFFFFF', overflow: 'hidden', borderWidth: 1, borderColor: '#EEF0F4'},
  profileHeader: {flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 4},
  detailsBackButton: {width: 30, height: 30, alignItems: 'center', justifyContent: 'center'},
  profileMenuButton: {width: 30, height: 30, alignItems: 'center', justifyContent: 'center'},
  profileIdentity: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 4},
  profileAvatar: {width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center'},
  profileAvatarText: {fontSize: 32, fontWeight: '800', color: '#FFFFFF'},
  profileAvatarImage: {width: '100%', height: '100%', borderRadius: 36},
  profileText: {flex: 1, marginLeft: 12},
  profileName: {fontSize: 20, fontWeight: '800', color: '#10204B'},
  profileEmail: {marginTop: 4, fontSize: 10, color: '#67748E'},
  profileTags: {flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8},
  roleTag: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, fontSize: 10, fontWeight: '800', color: '#4130D8', backgroundColor: '#E9E4FF'},
  departmentTag: {fontSize: 10, fontWeight: '700', color: '#4B556B'},
  profileStatus: {paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start'},
  detailsTabs: {flexDirection: 'row', marginTop: 2, borderBottomWidth: 1, borderBottomColor: '#EEF0F4'},
  detailsTab: {flex: 1, alignItems: 'center', minHeight: 38, justifyContent: 'center'},
  detailsTabText: {fontSize: 11, color: '#4B556B'},
  detailsTabTextActive: {fontWeight: '800', color: '#4130D8'},
  detailsTabLine: {position: 'absolute', bottom: -1, left: 10, right: 10, height: 2, backgroundColor: '#7B6CFF'},
  overviewGrid: {flexDirection: 'row', flexWrap: 'wrap', padding: 10},
  overviewItem: {width: '50%', minHeight: 58},
  overviewLabel: {fontSize: 10, color: '#9AA3B6'},
  overviewValue: {marginTop: 6, fontSize: 12, fontWeight: '700', color: '#283653'},
  emptyDetails: {minHeight: 100, alignItems: 'center', justifyContent: 'center'},
  emptyDetailsText: {fontSize: 11, color: '#67748E'},
  permissionManager: {padding: 12},
  permissionSearchBox: {flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 8, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 7, backgroundColor: '#FFFFFF'},
  permissionSearchInput: {flex: 1, marginLeft: 5, paddingVertical: 0, fontSize: 11, color: '#000000'},
  permissionGroup: {marginTop: 12},
  permissionGroupTitle: {flexDirection: 'row', alignItems: 'center'},
  permissionGroupText: {marginLeft: 4, fontSize: 13, fontWeight: '800', color: '#1F2A44'},
  permissionRow: {flexDirection: 'row', alignItems: 'center', minHeight: 30, paddingLeft: 20},
  permissionCheckbox: {width: 16, height: 16, borderWidth: 1, borderColor: '#AAB4C8', borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  permissionCheckboxActive: {borderColor: '#4130D8', backgroundColor: '#4130D8'},
  permissionText: {marginLeft: 8, fontSize: 12, color: '#202633'},
  savePermissionsButton: {height: 38, marginTop: 16, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4130D8'},
  savePermissionsText: {fontSize: 11, fontWeight: '800', color: '#FFFFFF'},
  permissionsTable: {marginTop: 14, borderWidth: 1, borderColor: '#EEF0F4', borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFFFFF'},
  permissionsTableHeader: {flexDirection: 'row', alignItems: 'center', minHeight: 32, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#E7EAF0', backgroundColor: '#F8F9FC'},
  permissionTableRow: {flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#EEF0F3'},
  permissionColumn: {flex: 0.85, fontSize: 10, fontWeight: '800', color: '#202633', textAlign: 'center'},
  permissionNameColumn: {flex: 1.15, textAlign: 'left'},
  permissionDescriptionColumn: {flex: 1.2, textAlign: 'left'},
  permissionStatusColumn: {flex: 0.65, alignItems: 'center', justifyContent: 'center'},
  permissionCell: {flex: 0.85, fontSize: 9, lineHeight: 12, color: '#000000', textAlign: 'center'},
  permissionActiveBadge: {paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5, fontSize: 8, fontWeight: '700', color: '#159A63', backgroundColor: '#DDF7E8'},
  formContainer: {paddingHorizontal: 16, paddingBottom: 18},
  formHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12},
  formTitle: {fontSize: 18, fontWeight: '800', color: '#000000'},
  headerSpacer: {width: 32},
  formSectionTitle: {marginTop: 18, marginBottom: 4, fontSize: 11, fontWeight: '800', color: '#5269A6'},
  avatarPicker: {flexDirection: 'row', alignItems: 'center', minHeight: 64, marginTop: 8, padding: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: '#AFC1E2', borderRadius: 9, backgroundColor: '#F8FAFE'},
  avatarImage: {width: 44, height: 44, borderRadius: 22},
  avatarPickerText: {flex: 1, marginLeft: 10},
  avatarTitle: {fontSize: 11, fontWeight: '800', color: '#1769E0'},
  avatarSubtitle: {marginTop: 3, fontSize: 9, color: '#67748E'},
  formLabel: {marginTop: 9, marginBottom: 4, fontSize: 10, fontWeight: '600', color: '#1F2A44'},
  formInput: {height: 36, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 7, backgroundColor: '#FFFFFF', fontSize: 11, color: '#000000'},
  passwordContainer: {flexDirection: 'row', alignItems: 'center', height: 36, paddingLeft: 10, paddingRight: 9, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 7, backgroundColor: '#FFFFFF'},
  passwordInput: {flex: 1, paddingVertical: 0, fontSize: 11, color: '#000000'},
  formTwoColumns: {flexDirection: 'row', gap: 8},
  formHalf: {flex: 1},
  selectInput: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 36, paddingHorizontal: 9, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 7, backgroundColor: '#FFFFFF'},
  selectText: {fontSize: 10, color: '#4B556B'},
  statusOptions: {flexDirection: 'row', gap: 8},
  statusOption: {minWidth: 64, height: 26, paddingHorizontal: 12, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F3F7'},
  statusOptionActive: {backgroundColor: '#4130D8'},
  statusOptionText: {fontSize: 9, fontWeight: '700', color: '#4B556B'},
  statusOptionTextActive: {color: '#FFFFFF'},
  formActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 20},
  cancelButton: {minWidth: 88, height: 36, borderWidth: 1, borderColor: '#E1E5EC', borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  cancelText: {fontSize: 10, fontWeight: '700', color: '#4B556B'},
  saveButton: {minWidth: 102, height: 36, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4130D8'},
  saveText: {fontSize: 10, fontWeight: '800', color: '#FFFFFF'},
  modalBackdrop: {flex: 1, justifyContent: 'center', paddingHorizontal: 28, backgroundColor: 'rgba(0, 0, 0, 0.35)'},
  dropdownMenu: {maxHeight: 420, padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF'},
  dropdownTitle: {marginBottom: 8, fontSize: 14, fontWeight: '800', color: '#202633', textTransform: 'capitalize'},
  dropdownScroll: {maxHeight: 350},
  dropdownOption: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#EEF0F3'},
  dropdownOptionText: {fontSize: 12, color: '#364154'},
});
