import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Image,
  Modal,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/store/AuthContext';
import { API_URL } from '@/services/api';
import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { ConfirmationBottomSheet } from '@/components/ConfirmationBottomSheet';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: 'Peer Supporter' | 'Member';
  createdAt: string;
}

interface ApplicationItem {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phoneNumber?: string;
  };
  name: string;
  age: number;
  address: string;
  occupation: string;
  experiences: string;
  evidence: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export default function UserManagementScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const isDark = useColorScheme() === 'dark';

  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    inputBg: isDark ? '#1E293B' : '#F1F5F9',
    brand: '#2563EB',
    brandLight: isDark ? '#1E3A8A40' : '#EFF6FF',
    tabInactive: isDark ? '#3B82F680' : '#60A5FA',
    accentGreen: '#0AC600',
    accentGreenBg: '#DBFFE0',
    accentBlue: '#2563EB',
    accentBlueBg: '#DBEAFE',
    accentRed: '#EF4444',
  };

  const [activeTab, setActiveTab] = useState<'users' | 'applications'>('users');
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [applicationsList, setApplicationsList] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'Peer Supporter' | 'Member'>('all');
  const [appStatusFilter, setAppStatusFilter] = useState<'all' | 'newest' | 'approved' | 'rejected'>('all');
  const [filterMenuVisible, setFilterMenuVisible] = useState<boolean>(false);

  // Expanded Accordions
  const [expandedAppIds, setExpandedAppIds] = useState<Set<string>>(new Set());

  // Modals
  const [selectedUserForView, setSelectedUserForView] = useState<UserItem | null>(null);
  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);

  // Confirmation Bottom Sheet
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string | null;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    icon?: keyof typeof Ionicons.glyphMap;
    singleButton?: boolean;
    isDestructive?: boolean;
    titleColor?: string;
    confirmColor?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    onConfirm?: () => void
  ) => {
    setConfirmAction({
      title,
      message,
      type,
      singleButton: true,
      confirmText: 'OK',
      onConfirm: () => {
        setConfirmAction(null);
        if (onConfirm) onConfirm();
      },
    });
  };

  const fetchData = useCallback(async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const [usersRes, appsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/users`, {
          headers: { 'Authorization': `Bearer ${user.token}` },
        }),
        fetch(`${API_URL}/api/peer-supporters/applications`, {
          headers: { 'Authorization': `Bearer ${user.token}` },
        }),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData.items || []);
      }

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplicationsList(appsData.items || []);
      }
    } catch (err) {
      console.error('[UserManagement] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const toggleExpandApp = (id: string) => {
    setExpandedAppIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setConfirmAction({
      title: 'Delete User',
      message: `Sure you want to delete user "${userName}"? This cannot be undone.`,
      type: 'error',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user?.token}` },
          });
          setConfirmAction(null);
          if (res.ok) {
            showAlert('Success', 'User deleted successfully.', 'success');
            fetchData();
          } else {
            const errData = await res.json();
            showAlert('Error', errData.message || 'Failed to delete user.', 'error');
          }
        } catch {
          showAlert('Error', 'Server error while deleting user.', 'error');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  const handleUpdateAppStatus = async (appId: string, status: 'approved' | 'rejected') => {
    const isApproved = status === 'approved';
    const actionLabel = isApproved ? 'Approve' : 'Reject';
    setConfirmAction({
      title: `${actionLabel} Application`,
      message: isApproved
        ? 'Sure you want to approve this peer supporter application?'
        : 'Sure you want to reject this peer supporter application?',
      type: isApproved ? 'success' : 'error',
      confirmText: `Yes, ${actionLabel}`,
      cancelText: 'Cancel',
      isDestructive: !isApproved,
      titleColor: isApproved ? '#0AC600' : '#EF4444',
      confirmColor: isApproved ? '#0AC600' : '#EF4444',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`${API_URL}/api/peer-supporters/applications/${appId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user?.token}`,
            },
            body: JSON.stringify({ status }),
          });
          setConfirmAction(null);
          if (res.ok) {
            showAlert('Success', `Application ${status} successfully.`, 'success');
            fetchData();
          } else {
            const err = await res.json();
            showAlert('Error', err.message || `Failed to ${actionLabel.toLowerCase()} application.`, 'error');
          }
        } catch {
          showAlert('Error', 'Server error updating application.', 'error');
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [usersList, searchQuery, userRoleFilter]);

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    return applicationsList.filter((app) => {
      const matchSearch =
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.userId?.email && app.userId.email.toLowerCase().includes(searchQuery.toLowerCase()));

      if (appStatusFilter === 'approved') return matchSearch && app.status === 'approved';
      if (appStatusFilter === 'rejected') return matchSearch && app.status === 'rejected';
      if (appStatusFilter === 'newest') return matchSearch && app.status === 'pending';
      return matchSearch;
    });
  }, [applicationsList, searchQuery, appStatusFilter]);

  const renderEvidenceThumbnail = (evidenceStr: string) => {
    try {
      const parsed = JSON.parse(evidenceStr);
      if (parsed && typeof parsed === 'object' && parsed.uri) {
        const isImage = parsed.type && parsed.type.startsWith('image/');
        return (
          <View style={styles.evidenceContainer}>
            <TouchableOpacity
              style={[styles.evidenceThumbCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => {
                if (isImage) {
                  setViewingImageUri(parsed.uri);
                } else if (Platform.OS === 'web') {
                  const link = document.createElement('a');
                  link.href = parsed.uri;
                  link.download = parsed.name || 'evidence_file';
                  link.click();
                } else {
                  showAlert('Document Attached', parsed.name || 'evidence_document', 'info');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isImage ? 'image' : 'document-text'}
                size={22}
                color={colors.brand}
              />
              <Text style={[styles.evidenceFileNameText, { color: colors.text }]} numberOfLines={1}>
                {parsed.name || (isImage ? 'evidence.jpg' : 'evidence.pdf')}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }
    } catch {
      // plain text fallback
    }

    return (
      <View style={[styles.evidenceContainer, { marginTop: 4 }]}>
        <Ionicons name="document-attach" size={20} color={colors.brand} />
        <Text style={[styles.evidenceFileNameText, { color: colors.textSecondary }]}>Attached Document</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={10}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Fonts.rounded || 'System' }]}>
          User Management
        </Text>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => showAlert('Notifications', 'No new user notifications.', 'info')}
          hitSlop={10}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand]} />
        }
      >
        {/* Segmented Tabs (All Users | Applications) */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentTab,
              {
                backgroundColor: activeTab === 'users' ? colors.brand : colors.tabInactive,
                borderTopLeftRadius: 10,
                borderBottomLeftRadius: 10,
              },
            ]}
            onPress={() => {
              setActiveTab('users');
              setSearchQuery('');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.segmentTabText}>All Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentTab,
              {
                backgroundColor: activeTab === 'applications' ? colors.brand : colors.tabInactive,
                borderTopRightRadius: 10,
                borderBottomRightRadius: 10,
              },
            ]}
            onPress={() => {
              setActiveTab('applications');
              setSearchQuery('');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.segmentTabText}>Applications</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filter Bar */}
        <View style={styles.searchRow}>
          <View style={[styles.searchPill, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <Ionicons name="search" size={20} color={colors.textSecondary} />
          </View>

          {/* Filter Trigger Button */}
          <TouchableOpacity
            style={[styles.filterBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setFilterMenuVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="funnel-outline" size={20} color={colors.brand} />
          </TouchableOpacity>
        </View>

        {/* Active Filter Pill Badge */}
        {(activeTab === 'users' ? userRoleFilter !== 'all' : appStatusFilter !== 'all') && (
          <View style={styles.activeFilterRow}>
            <Text style={[styles.activeFilterLabel, { color: colors.textSecondary }]}>
              Filtered by:{' '}
              <Text style={{ fontWeight: '700', color: colors.brand }}>
                {activeTab === 'users' ? userRoleFilter : appStatusFilter.toUpperCase()}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (activeTab === 'users') setUserRoleFilter('all');
                else setAppStatusFilter('all');
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Content Lists */}
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : activeTab === 'users' ? (
          /* TAB 1: ALL USERS LIST */
          filteredUsers.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Users Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                No users match your search or selected filter.
              </Text>
            </View>
          ) : (
            <View style={styles.usersListCard}>
              {filteredUsers.map((u) => {
                const isSupporter = u.role === 'Peer Supporter';
                return (
                  <View
                    key={u._id}
                    style={[
                      styles.userRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {/* User Name */}
                    <Text style={[styles.userNameText, { color: colors.text }]} numberOfLines={1}>
                      {u.name}
                    </Text>

                    {/* Role Pill */}
                    <View
                      style={[
                        styles.rolePill,
                        {
                          backgroundColor: isSupporter ? colors.accentGreenBg : colors.accentBlueBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rolePillText,
                          {
                            color: isSupporter ? colors.accentGreen : colors.accentBlue,
                          },
                        ]}
                      >
                        {u.role}
                      </Text>
                    </View>

                    {/* Actions: Delete & View */}
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        onPress={() => handleDeleteUser(u._id, u.name)}
                        style={styles.actionIconBtn}
                        hitSlop={8}
                        accessibilityLabel="Delete User"
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.accentRed} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setSelectedUserForView(u)}
                        style={styles.actionIconBtn}
                        hitSlop={8}
                        accessibilityLabel="View User"
                      >
                        <Ionicons name="eye-outline" size={22} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : (
          /* TAB 2: APPLICATIONS LIST */
          filteredApplications.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={48} color={colors.textSecondary} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Applications</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                There are no peer supporter applications matching your filter.
              </Text>
            </View>
          ) : (
            <View style={styles.applicationsList}>
              {filteredApplications.map((app) => {
                const isExpanded = expandedAppIds.has(app._id);
                return (
                  <View
                    key={app._id}
                    style={[
                      styles.appAccordionCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    {/* Header */}
                    <TouchableOpacity
                      style={styles.appHeader}
                      onPress={() => toggleExpandApp(app._id)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.appHeaderName, { color: colors.text }]}>
                        {app.name}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={20}
                        color={colors.text}
                      />
                    </TouchableOpacity>

                    {/* Expanded Body */}
                    {isExpanded && (
                      <View style={styles.appBody}>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <Text style={[styles.appField, { color: colors.text }]}>
                          Age: <Text style={styles.appFieldValue}>{app.age}</Text>
                        </Text>
                        <Text style={[styles.appField, { color: colors.text }]}>
                          Occupation: <Text style={styles.appFieldValue}>{app.occupation}</Text>
                        </Text>
                        <Text style={[styles.appField, { color: colors.text }]}>
                          Email: <Text style={styles.appFieldValue}>{app.userId?.email || 'N/A'}</Text>
                        </Text>
                        <Text style={[styles.appField, { color: colors.text }]}>
                          Phone: <Text style={styles.appFieldValue}>{app.userId?.phoneNumber || 'N/A'}</Text>
                        </Text>
                        <Text style={[styles.appField, { color: colors.text }]}>
                          Address: <Text style={styles.appFieldValue}>{app.address}</Text>
                        </Text>

                        {/* Experience Box */}
                        <Text style={[styles.appFieldLabel, { color: colors.text, marginTop: 10 }]}>Experience:</Text>
                        <View style={[styles.experienceBox, { backgroundColor: colors.inputBg }]}>
                          <Text style={[styles.experienceText, { color: colors.text }]}>{app.experiences}</Text>
                        </View>

                        {/* Evidence Thumbnails */}
                        <Text style={[styles.appFieldLabel, { color: colors.text, marginTop: 10 }]}>Evidence:</Text>
                        {renderEvidenceThumbnail(app.evidence)}

                        {/* Action Buttons: Reject | Approve */}
                        {app.status === 'pending' ? (
                          <View style={styles.appActionsRow}>
                            <TouchableOpacity
                              style={[styles.appBtn, styles.rejectBtn]}
                              onPress={() => handleUpdateAppStatus(app._id, 'rejected')}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.appBtnText}>Reject</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.appBtn, styles.approveBtn]}
                              onPress={() => handleUpdateAppStatus(app._id, 'approved')}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.appBtnText}>Approve</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.statusBadgeRow}>
                            <Text style={[styles.statusBadgeText, { color: app.status === 'approved' ? '#0AC600' : '#EF4444' }]}>
                              Status: {app.status.toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )
        )}
      </ScrollView>

      {/* Filter Bottom Sheet Modal */}
      <Modal
        visible={filterMenuVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterMenuVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setFilterMenuVisible(false)}
          />
          <View
            style={[styles.bottomSheetCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {/* Top Handle Bar */}
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />

            <Text style={[styles.sheetTitle, { color: colors.text }]}>Filter Options</Text>

            {activeTab === 'users' ? (
              <View style={styles.sheetOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.sheetOptionItem,
                    userRoleFilter === 'all' && [styles.sheetOptionActive, { backgroundColor: isDark ? '#1E3A8A40' : '#EFF6FF' }],
                  ]}
                  onPress={() => {
                    setUserRoleFilter('all');
                    setFilterMenuVisible(false);
                  }}
                >
                  <Text style={[styles.sheetOptionText, { color: colors.text }]}>All Users</Text>
                  {userRoleFilter === 'all' && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sheetOptionItem,
                    userRoleFilter === 'Peer Supporter' && [styles.sheetOptionActive, { backgroundColor: isDark ? '#1E3A8A40' : '#EFF6FF' }],
                  ]}
                  onPress={() => {
                    setUserRoleFilter('Peer Supporter');
                    setFilterMenuVisible(false);
                  }}
                >
                  <Text style={[styles.sheetOptionText, { color: colors.text }]}>Peer Supporter</Text>
                  {userRoleFilter === 'Peer Supporter' && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sheetOptionItem,
                    userRoleFilter === 'Member' && [styles.sheetOptionActive, { backgroundColor: isDark ? '#1E3A8A40' : '#EFF6FF' }],
                  ]}
                  onPress={() => {
                    setUserRoleFilter('Member');
                    setFilterMenuVisible(false);
                  }}
                >
                  <Text style={[styles.sheetOptionText, { color: colors.text }]}>Member</Text>
                  {userRoleFilter === 'Member' && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.sheetOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.sheetOptionItem,
                    appStatusFilter === 'all' && [styles.sheetOptionActive, { backgroundColor: isDark ? '#1E3A8A40' : '#EFF6FF' }],
                  ]}
                  onPress={() => {
                    setAppStatusFilter('all');
                    setFilterMenuVisible(false);
                  }}
                >
                  <Text style={[styles.sheetOptionText, { color: colors.text }]}>All Applications</Text>
                  {appStatusFilter === 'all' && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sheetOptionItem,
                    appStatusFilter === 'newest' && [styles.sheetOptionActive, { backgroundColor: isDark ? '#1E3A8A40' : '#EFF6FF' }],
                  ]}
                  onPress={() => {
                    setAppStatusFilter('newest');
                    setFilterMenuVisible(false);
                  }}
                >
                  <Text style={[styles.sheetOptionText, { color: colors.text }]}>Newest (Pending)</Text>
                  {appStatusFilter === 'newest' && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sheetOptionItem,
                    appStatusFilter === 'approved' && [styles.sheetOptionActive, { backgroundColor: isDark ? '#1E3A8A40' : '#EFF6FF' }],
                  ]}
                  onPress={() => {
                    setAppStatusFilter('approved');
                    setFilterMenuVisible(false);
                  }}
                >
                  <Text style={[styles.sheetOptionText, { color: colors.text }]}>Accept (Approved)</Text>
                  {appStatusFilter === 'approved' && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sheetOptionItem,
                    appStatusFilter === 'rejected' && [styles.sheetOptionActive, { backgroundColor: isDark ? '#1E3A8A40' : '#EFF6FF' }],
                  ]}
                  onPress={() => {
                    setAppStatusFilter('rejected');
                    setFilterMenuVisible(false);
                  }}
                >
                  <Text style={[styles.sheetOptionText, { color: colors.text }]}>Reject (Rejected)</Text>
                  {appStatusFilter === 'rejected' && <Ionicons name="checkmark-circle" size={20} color={colors.brand} />}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* User Details Bottom Sheet Modal */}
      {selectedUserForView && (
        <Modal
          visible={!!selectedUserForView}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedUserForView(null)}
          statusBarTranslucent
        >
          <View style={styles.sheetBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setSelectedUserForView(null)}
            />
            <View
              style={[styles.bottomSheetCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Top Handle Bar */}
              <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />

              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.text, marginBottom: 0 }]}>User Profile</Text>
                <TouchableOpacity onPress={() => setSelectedUserForView(null)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.userModalBody}>
                <View style={styles.modalFieldRow}>
                  <Text style={[styles.modalFieldLabel, { color: colors.textSecondary }]}>Full Name:</Text>
                  <Text style={[styles.modalFieldValue, { color: colors.text }]}>{selectedUserForView.name}</Text>
                </View>

                <View style={styles.modalFieldRow}>
                  <Text style={[styles.modalFieldLabel, { color: colors.textSecondary }]}>Email:</Text>
                  <Text style={[styles.modalFieldValue, { color: colors.text }]}>{selectedUserForView.email}</Text>
                </View>

                <View style={styles.modalFieldRow}>
                  <Text style={[styles.modalFieldLabel, { color: colors.textSecondary }]}>Phone:</Text>
                  <Text style={[styles.modalFieldValue, { color: colors.text }]}>{selectedUserForView.phoneNumber || 'N/A'}</Text>
                </View>

                <View style={styles.modalFieldRow}>
                  <Text style={[styles.modalFieldLabel, { color: colors.textSecondary }]}>Role:</Text>
                  <Text style={[styles.modalFieldValue, { color: colors.brand, fontWeight: '700' }]}>
                    {selectedUserForView.role}
                  </Text>
                </View>

                <View style={styles.modalFieldRow}>
                  <Text style={[styles.modalFieldLabel, { color: colors.textSecondary }]}>Joined Date:</Text>
                  <Text style={[styles.modalFieldValue, { color: colors.text }]}>
                    {new Date(selectedUserForView.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: colors.brand }]}
                onPress={() => setSelectedUserForView(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.closeModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Image Preview Modal */}
      {viewingImageUri && (
        <Modal
          visible={!!viewingImageUri}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setViewingImageUri(null)}
        >
          <View style={styles.fullscreenModalOverlay}>
            <TouchableOpacity style={styles.closeFullscreenBtn} onPress={() => setViewingImageUri(null)}>
              <Ionicons name="close-circle" size={42} color="#FFFFFF" />
            </TouchableOpacity>
            <Image source={{ uri: viewingImageUri }} style={styles.fullscreenModalImage} resizeMode="contain" />
          </View>
        </Modal>
      )}

      {/* Confirmation Alert Bottom Sheet */}
      <ConfirmationBottomSheet
        visible={!!confirmAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        type={confirmAction?.type}
        icon={confirmAction?.icon}
        confirmText={confirmAction?.confirmText || 'OK'}
        cancelText={confirmAction?.cancelText}
        singleButton={confirmAction?.singleButton}
        isDestructive={confirmAction?.isDestructive}
        titleColor={confirmAction?.titleColor}
        confirmColor={confirmAction?.confirmColor}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={confirmAction?.cancelText !== null && !confirmAction?.singleButton ? () => setConfirmAction(null) : undefined}
        loading={confirmLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  segmentContainer: {
    flexDirection: 'row',
    height: 44,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentTabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  activeFilterLabel: {
    fontSize: 13,
  },
  usersListCard: {
    gap: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 12,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconBtn: {
    padding: 4,
  },
  applicationsList: {
    gap: 12,
  },
  appAccordionCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appHeaderName: {
    fontSize: 17,
    fontWeight: '700',
  },
  appBody: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  appField: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  appFieldValue: {
    fontWeight: '400',
  },
  appFieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  experienceBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  experienceText: {
    fontSize: 13,
    lineHeight: 18,
  },
  evidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  evidenceThumbCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  evidenceFileNameText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 200,
  },
  appActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  appBtn: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  approveBtn: {
    backgroundColor: '#0AC600',
  },
  appBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadgeRow: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  center: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 44 : 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 25,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  sheetOptionsContainer: {
    gap: 8,
  },
  sheetOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  sheetOptionActive: {
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  sheetOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  userModalBody: {
    gap: 12,
    marginBottom: 20,
  },
  modalFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalFieldLabel: {
    fontSize: 14,
  },
  modalFieldValue: {
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 200,
    textAlign: 'right',
  },
  closeModalBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  fullscreenModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullscreenBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullscreenModalImage: {
    width: '94%',
    height: '80%',
  },
});
