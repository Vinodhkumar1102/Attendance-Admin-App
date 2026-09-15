import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const leaveTabs = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
const API_BASE_URL = 'https://attendance-backend-1-2bdo.onrender.com';
const formatLeaveDates = (startDate, endDate, totalDays) => {
  const formatDate = value => new Intl.DateTimeFormat('en-US', {month: 'short', day: '2-digit'}).format(new Date(value));
  return `${formatDate(startDate)} - ${formatDate(endDate)} (${totalDays} ${totalDays === 1 ? 'Day' : 'Days'})`;
};

const getAvatarUri = avatar => avatar?.path
  ? avatar.path.startsWith('http') ? avatar.path : `${API_BASE_URL}${avatar.path}`
  : null;

const LeaveRequestDetails = ({request, onBack}) => (
  <View style={styles.detailsContainer}>
    <View style={styles.detailsHeader}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={20} color="#202633" />
      </TouchableOpacity>
      <Text style={styles.detailsTitle}>Leave Details</Text>
      <View style={styles.headerSpacer} />
    </View>

    <View style={styles.detailsCard}>
      <View style={[styles.detailsAvatar, {backgroundColor: request.color}]}>
        {getAvatarUri(request.avatar) ? (
          <Image source={{uri: getAvatarUri(request.avatar)}} style={styles.detailsAvatarImage} />
        ) : (
          <Text style={styles.detailsAvatarText}>{request.name.charAt(0)}</Text>
        )}
      </View>
      <Text style={styles.detailsName}>{request.name}</Text>
      <Text style={styles.detailsType}>{request.type}</Text>
      <View style={[styles.statusBadge, request.status === 'Approved' ? styles.approvedBadge : request.status === 'Rejected' ? styles.rejectedBadge : styles.pendingBadge]}>
        <Text style={styles.statusBadgeText}>{request.status}</Text>
      </View>
    </View>

    <View style={styles.detailsInfoCard}>
      <Text style={styles.infoTitle}>Request Information</Text>
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={18} color="#1769E0" />
        <Text style={styles.infoLabel}>Leave dates</Text>
        <Text style={styles.infoValue}>{request.dates}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="document-text-outline" size={18} color="#1769E0" />
        <Text style={styles.infoLabel}>Reason</Text>
        <Text style={styles.infoValue}>{request.reason}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="card-outline" size={18} color="#1769E0" />
        <Text style={styles.infoLabel}>Employee ID</Text>
        <Text style={styles.infoValue}>{request.employeeId}</Text>
      </View>
    </View>
  </View>
);

const LeaveScreen = ({adminToken, themeMode = 'light', initialStatus = 'Pending'}) => {
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState(leaveTabs.includes(initialStatus) ? initialStatus : 'Pending');
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/leaves`, {
          headers: {Authorization: `Bearer ${adminToken}`},
        });
        const result = await response.json();
        if (response.ok && Array.isArray(result.leaves)) {
          setRequests(result.leaves.map(request => ({
            ...request,
            name: request.employeeName || request.employeeId,
            type: request.leaveType,
            dates: formatLeaveDates(request.startDate, request.endDate, request.totalDays),
            color: '#1769E0',
          })));
        }
      } catch (error) {
        setRequests([]);
      }
    };

    if (adminToken) {
      loadRequests();
    }
  }, [adminToken]);

  const updateRequestStatus = async (request, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leaves/${request.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({status}),
      });
      const result = await response.json();
      if (response.ok && result.leave) {
        const updatedRequest = {
          ...request,
          ...result.leave,
          name: result.leave.employeeName || request.name,
          type: result.leave.leaveType,
          dates: formatLeaveDates(result.leave.startDate, result.leave.endDate, result.leave.totalDays),
        };
        setRequests(currentRequests => currentRequests.map(item => (
          item.id === request.id ? updatedRequest : item
        )));
        setSelectedRequest(updatedRequest);
      }
    } catch (error) {
      // Keep the request unchanged when the update cannot reach the server.
    }
  };

  if (selectedRequest) {
    return (
      <LeaveRequestDetails
        request={selectedRequest}
        onBack={() => setSelectedRequest(null)}
      />
    );
  }

  const visibleRequests = requests.filter(request => request.status === activeTab);

  return (
    <View style={[styles.container, themeMode === 'dark' && styles.darkContainer]}>
      <Text style={styles.title}>Leave Requests</Text>

      <View style={styles.tabRow}>
        {leaveTabs.map(tab => {
          const isActive = activeTab === tab;

          return (
            <TouchableOpacity
              key={tab}
              style={styles.tabButton}
              activeOpacity={0.8}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
              {isActive && <View style={styles.activeLine} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.requestList}>
        {visibleRequests.map(request => (
          <TouchableOpacity
            key={request.id}
            style={styles.requestCard}
            activeOpacity={0.85}
            onPress={() => setSelectedRequest(request)}
          >
            <View style={[styles.avatar, {backgroundColor: request.color}]}>
              {getAvatarUri(request.avatar) ? (
                <Image source={{uri: getAvatarUri(request.avatar)}} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{request.name.charAt(0)}</Text>
              )}
            </View>

            <View style={styles.requestDetails}>
              <Text style={styles.employeeName}>{request.name}</Text>
              <Text style={styles.leaveType}>{request.type}</Text>
              <Text style={styles.leaveDates}>{request.dates}</Text>
              <Text style={styles.leaveReason}>{request.reason}</Text>
            </View>

            <View style={styles.requestSide}>
              <Ionicons name="chevron-forward" size={18} color="#7B8495" />
              {request.status === 'Pending' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    activeOpacity={0.8}
                    onPress={() => updateRequestStatus(request, 'Rejected')}
                  >
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveButton}
                    activeOpacity={0.8}
                    onPress={() => updateRequestStatus(request, 'Approved')}
                  >
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}
              {request.status === 'Approved' && (
                <View style={styles.approvedStatusButton}>
                  <Text style={styles.approvedStatusText}>Approved</Text>
                </View>
              )}
              {request.status === 'Rejected' && (
                <View style={styles.rejectedStatusButton}>
                  <Text style={styles.rejectedStatusText}>Rejected</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default LeaveScreen;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  darkContainer: {backgroundColor: '#101827'},
  title: {
    marginHorizontal: 16,
    marginTop: 14,
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 8,
    marginTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E7EAF0',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    minHeight: 38,
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 11,
    color: '#4B556B',
  },
  tabTextActive: {
    fontWeight: '800',
    color: '#1769E0',
  },
  activeLine: {
    position: 'absolute',
    bottom: -1,
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: '#1769E0',
  },
  requestList: {
    marginTop: 8,
  },
  requestCard: {
    flexDirection: 'row',
    minHeight: 118,
    marginHorizontal: 8,
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E3E7EF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  requestDetails: {
    flex: 1,
    marginLeft: 10,
    paddingTop: 1,
  },
  employeeName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  leaveType: {
    marginTop: 4,
    fontSize: 10,
    color: '#000000',
  },
  leaveDates: {
    marginTop: 4,
    fontSize: 10,
    color: '#000000',
  },
  leaveReason: {
    marginTop: 3,
    fontSize: 10,
    color: '#000000',
  },
  requestSide: {
    minWidth: 90,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rejectButton: {
    minWidth: 48,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F2F4',
  },
  rejectText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3F4652',
  },
  approveButton: {
    minWidth: 52,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#20B15A',
  },
  approveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  approvedStatusButton: {
    minWidth: 62,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDF7E8',
  },
  approvedStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#159A63',
  },
  rejectedStatusButton: {
    minWidth: 62,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE1E1',
  },
  rejectedStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D63B3B',
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  detailsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000000',
  },
  headerSpacer: {
    width: 36,
  },
  detailsCard: {
    alignItems: 'center',
    marginTop: 14,
    padding: 20,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  detailsAvatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  detailsAvatarImage: {
    width: '100%',
    height: '100%',
  },
  detailsAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  detailsName: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  detailsType: {
    marginTop: 4,
    fontSize: 12,
    color: '#67748E',
  },
  statusBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#FFF3D6',
  },
  approvedBadge: {
    backgroundColor: '#DDF7E8',
  },
  rejectedBadge: {
    backgroundColor: '#FFE1E1',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },
  detailsInfoCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  infoTitle: {
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
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
    maxWidth: 170,
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'right',
  },
});
