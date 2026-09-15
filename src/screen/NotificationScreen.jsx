import React, {useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Animated,
  Image,
  PanResponder,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const API_BASE_URL = 'https://attendance-backend-11.onrender.com';
const ADMIN_NOTIFICATIONS_ENABLED_KEY = 'admin_notifications_enabled';

const notificationTabs = ['All', 'Unread'];

const formatRequestDate = value => {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
};

const SwipeNotificationRow = ({notification, onPress, onDelete}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(-82, Math.min(0, gesture.dx))),
    onPanResponderRelease: (_, gesture) => Animated.spring(translateX, {toValue: gesture.dx < -45 ? -82 : 0, useNativeDriver: true}).start(),
  })).current;

  return (
    <View style={styles.swipeContainer}>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete} activeOpacity={0.85}>
        <Ionicons name="trash-outline" size={19} color="#FFFFFF" />
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
      <Animated.View style={[styles.notificationRow, {transform: [{translateX}]}]} {...panResponder.panHandlers}>
        <TouchableOpacity style={styles.notificationRowContent} onPress={onPress} activeOpacity={0.8}>
          {notification.avatar?.path ? (
            <Image source={{uri: notification.avatar.path.startsWith('http') ? notification.avatar.path : `${API_BASE_URL}${notification.avatar.path}`}} style={styles.notificationAvatar} />
          ) : (
            <View style={[styles.notificationIcon, {backgroundColor: notification.color}]}>
              <Ionicons name={notification.icon} size={15} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <Text style={styles.notificationMessage}>{notification.message}</Text>
          </View>
          <View style={styles.notificationMeta}>
            <Text style={styles.notificationTime}>{notification.time}</Text>
            {notification.unread && <View style={styles.unreadDot} />}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const NotificationScreen = ({onBack, adminToken, onNotificationRead, onOpenLeave, onOpenAttendance}) => {
  const [activeTab, setActiveTab] = useState('All');
  const [notifications, setNotifications] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!adminToken) {
        return;
      }

      try {
        const storedNotificationsEnabled = await AsyncStorage.getItem(ADMIN_NOTIFICATIONS_ENABLED_KEY);
        const isEnabled = storedNotificationsEnabled !== 'false';
        setNotificationsEnabled(isEnabled);
        if (!isEnabled) {
          setNotifications([]);
          return;
        }

        const [storedReadIds, storedDeletedIds] = await Promise.all([
          AsyncStorage.getItem('admin_read_notification_ids'),
          AsyncStorage.getItem('admin_deleted_notification_ids'),
        ]);
        const readIds = storedReadIds ? JSON.parse(storedReadIds) : [];
        const deletedIds = storedDeletedIds ? JSON.parse(storedDeletedIds) : [];

        const notificationsResponse = await fetch(`${API_BASE_URL}/api/admin/notifications`, {headers: {Authorization: `Bearer ${adminToken}`}});
        const notificationsResult = await notificationsResponse.json().catch(() => ({notifications: []}));
        const adminNotifications = Array.isArray(notificationsResult?.notifications) ? notificationsResult.notifications : [];

        let nextNotifications = adminNotifications.map(notification => ({
          id: notification.id || `admin-notification-${notification.referenceId || Date.now()}`,
          type: notification.type || 'Important',
          title: notification.title || 'Leave Request',
          message: notification.message || 'New employee activity',
          time: notification.eventDate
            ? `${notification.eventDate} ${notification.eventTime || ''}`.trim()
            : formatRequestDate(notification.createdAt || notification.date),
          icon: notification.type === 'Attendance' ? 'time-outline' : 'document-text-outline',
          color: notification.type === 'Attendance' ? '#2867F4' : '#F59E0B',
          avatar: notification.avatarUrl ? {path: notification.avatarUrl} : null,
          status: notification.status || 'Pending',
          unread: notification.unread !== false,
        }));

        if (!nextNotifications.length) {
          const leaveResponse = await fetch(`${API_BASE_URL}/api/leaves`, {headers: {Authorization: `Bearer ${adminToken}`}});
          const leaveResult = await leaveResponse.json().catch(() => ({leaves: []}));
          const leaveRequests = Array.isArray(leaveResult?.leaves) ? leaveResult.leaves : [];

          nextNotifications = leaveRequests
            .slice()
            .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
            .map(leave => ({
              id: `leave-${leave.id}`,
              type: 'Important',
              title: `Leave Request - ${leave.status || 'Pending'}`,
              message: `${leave.employeeName || leave.employeeId || 'Employee'}  |  ${leave.totalDays || 1} day${Number(leave.totalDays || 1) === 1 ? '' : 's'}  |  Status: ${leave.status || 'Pending'}`,
              time: formatRequestDate(leave.createdAt),
              icon: 'document-text-outline',
              color: '#F59E0B',
              avatar: leave.avatar,
              status: leave.status || 'Pending',
              unread: true,
            }));
        }

        setNotifications(nextNotifications.map(notification => ({
          ...notification,
          unread: !readIds.includes(notification.id) && notification.unread !== false,
        })).filter(notification => !deletedIds.includes(notification.id)));
      } catch (error) {
        setNotifications([]);
      }
    };

    loadNotifications();
  }, [adminToken]);

  const visibleNotifications = notifications.filter(notification => {
    if (activeTab === 'Unread') {
      return notification.unread;
    }
    return true;
  });

  const deleteNotification = notification => {
    setNotifications(current => current.filter(item => item.id !== notification.id));
    AsyncStorage.getItem('admin_deleted_notification_ids').then(value => {
      const deletedIds = value ? JSON.parse(value) : [];
      if (!deletedIds.includes(notification.id)) {
        AsyncStorage.setItem('admin_deleted_notification_ids', JSON.stringify([...deletedIds, notification.id]));
      }
    }).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#202633" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabsRow}>
        {notificationTabs.map(tab => {
          const isActive = activeTab === tab;
          const unreadCount = tab === 'Unread' ? notifications.filter(item => item.unread).length : null;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              activeOpacity={0.8}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
              {unreadCount !== null && <Text style={styles.unreadBadge}>{unreadCount}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.notificationScroll} contentContainerStyle={styles.notificationList} showsVerticalScrollIndicator={false}>
        {!notificationsEnabled ? (
          <View style={styles.notificationsDisabledCard}>
            <Ionicons name="notifications-off-outline" size={34} color="#71809C" />
            <Text style={styles.notificationsDisabledTitle}>Notifications are turned off</Text>
            <Text style={styles.notificationsDisabledText}>You cannot receive notifications while they are turned off.</Text>
          </View>
        ) : visibleNotifications.map(notification => (
          <SwipeNotificationRow
            key={notification.id}
            notification={notification}
            onPress={() => {
              setNotifications(current => current.map(item => item.id === notification.id ? {...item, unread: false} : item));
              AsyncStorage.getItem('admin_read_notification_ids').then(value => {
                const readIds = value ? JSON.parse(value) : [];
                if (!readIds.includes(notification.id)) {
                  AsyncStorage.setItem('admin_read_notification_ids', JSON.stringify([...readIds, notification.id]));
                }
              }).catch(() => {});
              onNotificationRead?.(notification.id);
              if (notification.type === 'Attendance') {
                onOpenAttendance?.();
              } else {
                onOpenLeave?.(notification.status);
              }
            }}
            onDelete={() => deleteNotification(notification)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  container: {paddingHorizontal: 8, paddingBottom: 18},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 10, marginTop: 12},
  backButton: {width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF'},
  title: {flex: 1, fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#000000'},
  headerSpacer: {width: 32},
  tabsRow: {flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginTop: 12, gap: 8},
  tabButton: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 30, borderRadius: 15, backgroundColor: '#F1F3F8'},
  tabButtonActive: {backgroundColor: '#315DE8'},
  tabText: {fontSize: 10, fontWeight: '700', color: '#67748E'},
  tabTextActive: {color: '#FFFFFF'},
  unreadBadge: {minWidth: 17, height: 17, marginLeft: 4, paddingHorizontal: 4, borderRadius: 9, textAlign: 'center', textAlignVertical: 'center', fontSize: 9, fontWeight: '800', color: '#FFFFFF', backgroundColor: '#F04444'},
  notificationScroll: {flex: 1},
  notificationList: {marginTop: 8, paddingBottom: 24},
  swipeContainer: {position: 'relative', marginHorizontal: 8, overflow: 'hidden'},
  deleteButton: {position: 'absolute', top: 0, right: 0, bottom: 0, width: 82, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D92D3F'},
  deleteText: {marginTop: 2, color: '#FFFFFF', fontSize: 9, fontWeight: '800'},
  notificationRow: {minHeight: 64, borderBottomWidth: 1, borderBottomColor: '#EEF0F3', backgroundColor: '#FFFFFF'},
  notificationRowContent: {flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8},
  notificationIcon: {width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center'},
  notificationAvatar: {width: 34, height: 34, borderRadius: 17},
  notificationContent: {flex: 1, marginLeft: 9},
  notificationTitle: {fontSize: 11, fontWeight: '800', color: '#1F2A44'},
  notificationMessage: {marginTop: 4, fontSize: 10, lineHeight: 15, color: '#67748E'},
  notificationMeta: {alignItems: 'flex-end', alignSelf: 'stretch', justifyContent: 'space-between', paddingVertical: 11},
  notificationTime: {fontSize: 9, color: '#67748E'},
  unreadDot: {width: 5, height: 5, borderRadius: 3, backgroundColor: '#315DE8'},
  notificationsDisabledCard: {minHeight: 240, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32},
  notificationsDisabledTitle: {marginTop: 12, color: '#315DE8', fontSize: 15, fontWeight: '800', textAlign: 'center'},
  notificationsDisabledText: {marginTop: 6, color: '#71809C', fontSize: 12, lineHeight: 18, textAlign: 'center'},
});
