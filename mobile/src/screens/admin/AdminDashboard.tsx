import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
  RefreshControl,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { Colors } from '../../constants/theme';
import { apiFetch } from '../../services/api';

interface SessionItem {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'cancelled' | 'completed';
  meetingLink?: string;
  sessionType?: 'online' | 'physical';
  venue?: string;
  supporterId: {
    _id: string;
    name: string;
    email: string;
    phoneNumber?: string;
  };
  userId?: {
    _id: string;
    name: string;
    email: string;
    phoneNumber?: string;
  } | null;
}

interface ReportedCommentItem {
  _id: string;
  postId: string;
  postTitle: string;
  content: string;
  isAnonymous: boolean;
  authorName: string;
  authorEmail?: string;
  status: string;
  createdAt: string;
}

interface SupporterApplicationItem {
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

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const isDark = useColorScheme() === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [activeTab, setActiveTab] = useState<'sessions' | 'reports' | 'supporters'>('sessions');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [reports, setReports] = useState<ReportedCommentItem[]>([]);
  const [supporters, setSupporters] = useState<SupporterApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null);
  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);

  const fetchData = useCallback(async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    try {
      if (activeTab === 'sessions') {
        const data = await apiFetch('/api/sessions?admin=true');
        setSessions(data.items || []);
      } else if (activeTab === 'reports') {
        const data = await apiFetch('/api/forum/reported-comments');
        setReports(data.items || []);
      } else if (activeTab === 'supporters') {
        const data = await apiFetch('/api/peer-supporters/applications');
        setSupporters(data.items || []);
      }
    } catch (err: any) {
      console.error('[AdminDashboard] Fetch Error:', err);
      Alert.alert('Error', err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  // Sessions actions
  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this session slot? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
              Alert.alert('Success', 'Session slot deleted successfully.');
              fetchData(false);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete session.');
            }
          },
        },
      ]
    );
  };

  // Reports actions
  const handleResolveComment = async (commentId: string) => {
    try {
      await apiFetch(`/api/forum/reported-comments/${commentId}/resolve`, { method: 'PUT' });
      Alert.alert('Success', 'Comment approved and report resolved.');
      fetchData(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resolve comment.');
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      'Confirm Removal',
      'Are you sure you want to remove this comment? It will be deleted from the forum post.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/forum/reported-comments/${commentId}`, { method: 'DELETE' });
              Alert.alert('Success', 'Comment deleted successfully.');
              fetchData(false);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete comment.');
            }
          },
        },
      ]
    );
  };

  // Supporter application actions
  const handleUpdateApplicationStatus = async (appId: string, status: 'approved' | 'rejected') => {
    Alert.alert(
      `Confirm ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      `Are you sure you want to ${status} this peer supporter application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status.charAt(0).toUpperCase() + status.slice(1),
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setLoading(true);
              await apiFetch(`/api/peer-supporters/applications/${appId}`, {
                method: 'PATCH',
                body: { status },
              });
              Alert.alert('Success', `Application ${status} successfully.`);
              fetchData(false);
            } catch (err: any) {
              Alert.alert('Error', err.message || `Failed to update status.`);
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderEvidence = (evidenceStr: string) => {
    try {
      const parsed = JSON.parse(evidenceStr);
      if (parsed && typeof parsed === 'object' && parsed.uri) {
        const isImage = parsed.type && parsed.type.startsWith('image/');
        return (
          <View style={[styles.evidenceBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <View style={styles.evidenceHeader}>
              <Ionicons
                name={isImage ? 'image-outline' : 'document-text-outline'}
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.evidenceNameText, { color: colors.text }]} numberOfLines={1}>
                {parsed.name || 'evidence_file'}
              </Text>
            </View>

            {isImage ? (
              <View style={styles.evidenceImageContainer}>
                <Image source={{ uri: parsed.uri }} style={styles.evidenceCardImage} resizeMode="cover" />
                <TouchableOpacity
                  style={[styles.viewFullBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setViewingImageUri(parsed.uri)}
                >
                  <Ionicons name="scan-outline" size={14} color={colors.onPrimary} />
                  <Text style={[styles.viewFullBtnText, { color: colors.onPrimary }]}>View Full Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.documentContainer}>
                <Text style={[styles.documentMetaText, { color: colors.textSecondary }]}>
                  Type: {parsed.type.toUpperCase()}
                  {parsed.size ? ` • ${(parsed.size / 1024 / 1024).toFixed(2)} MB` : ''}
                </Text>
                {Platform.OS === 'web' && (
                  <TouchableOpacity
                    style={[styles.viewFullBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
                    onPress={() => {
                      const link = document.createElement('a');
                      link.href = parsed.uri;
                      link.download = parsed.name || 'evidence_document';
                      link.click();
                    }}
                  >
                    <Ionicons name="download-outline" size={14} color={colors.onPrimary} />
                    <Text style={[styles.viewFullBtnText, { color: colors.onPrimary }]}>Download Document</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      }
    } catch {
      // Fallback
    }

    return (
      <View style={[styles.evidenceTextBox, { backgroundColor: colors.inputBg }]}>
        <Text style={[styles.evidenceText, { color: colors.text }]}>{evidenceStr}</Text>
      </View>
    );
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return (
        d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' at ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return { bg: isDark ? '#143825' : '#D1E7DD', text: isDark ? '#75B798' : '#0F5132' };
      case 'booked':
        return { bg: isDark ? '#183153' : '#CFE2FF', text: isDark ? '#6EA8FE' : '#084298' };
      case 'cancelled':
        return { bg: isDark ? '#44191C' : '#F8D7DA', text: isDark ? '#EA868F' : '#842029' };
      case 'completed':
        return { bg: isDark ? '#2D3238' : '#E2E3E5', text: isDark ? '#A3A6A9' : '#41464B' };
      default:
        return { bg: isDark ? '#2D3238' : '#E2E3E5', text: isDark ? '#A3A6A9' : '#41464B' };
    }
  };

  const renderSessionCard = ({ item }: { item: SessionItem }) => {
    const statusStyle = getStatusColor(item.status);
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {formatDateTime(item.startTime)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Host: <Text style={styles.boldText}>{item.supporterId.name}</Text>
            </Text>
          </View>
          {item.userId && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Attendee: <Text style={styles.boldText}>{item.userId.name}</Text>
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.outlineButton, { borderColor: colors.primary }]}
            onPress={() => setSelectedSession(item)}
          >
            <Ionicons name="eye-outline" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerOutlineButton]}
            onPress={() => handleDeleteSession(item._id)}
          >
            <Ionicons name="trash-outline" size={16} color="#BA1A1A" />
            <Text style={[styles.actionBtnText, { color: '#BA1A1A' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderReportCard = ({ item }: { item: ReportedCommentItem }) => {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.reportHeader}>
          <View style={styles.reportMeta}>
            <Ionicons name="alert-circle-outline" size={18} color="#BA1A1A" />
            <Text style={styles.reportTag}>REPORTED COMMENT</Text>
          </View>
          <Text style={[styles.reportDate, { color: colors.textSecondary }]}>
            {formatDateTime(item.createdAt)}
          </Text>
        </View>

        <View style={[styles.quoteContainer, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.quoteText, { color: colors.text }]}>&ldquo;{item.content}&rdquo;</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
            Post: <Text style={[styles.boldText, { color: colors.text }]}>{item.postTitle}</Text>
          </Text>
          <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
            Author:{' '}
            <Text style={[styles.boldText, { color: colors.text }]}>
              {item.isAnonymous ? 'Anonymous' : item.authorName}
            </Text>
            {!item.isAnonymous && item.authorEmail && ` (${item.authorEmail})`}
          </Text>
        </View>

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.successButton, { backgroundColor: '#143825' }]}
            onPress={() => handleResolveComment(item._id)}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color="#75B798" />
            <Text style={[styles.actionBtnText, { color: '#75B798' }]}>Keep Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton, { backgroundColor: '#44191C' }]}
            onPress={() => handleDeleteComment(item._id)}
          >
            <Ionicons name="close-circle-outline" size={16} color="#EA868F" />
            <Text style={[styles.actionBtnText, { color: '#EA868F' }]}>Remove Comment</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getSupporterStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: isDark ? '#3d2e14' : '#FFF3CD', text: isDark ? '#ffc107' : '#856404' };
      case 'approved':
        return { bg: isDark ? '#143825' : '#D1E7DD', text: isDark ? '#75B798' : '#0F5132' };
      case 'rejected':
        return { bg: isDark ? '#44191C' : '#F8D7DA', text: isDark ? '#EA868F' : '#842029' };
      default:
        return { bg: isDark ? '#2D3238' : '#E2E3E5', text: isDark ? '#A3A6A9' : '#41464B' };
    }
  };

  const renderSupporterCard = ({ item }: { item: SupporterApplicationItem }) => {
    const statusStyle = getSupporterStatusColor(item.status);
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
            Age: <Text style={[styles.boldText, { color: colors.text }]}>{item.age}</Text>
          </Text>
          <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
            Occupation: <Text style={[styles.boldText, { color: colors.text }]}>{item.occupation}</Text>
          </Text>
          <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
            Email: <Text style={[styles.boldText, { color: colors.text }]}>{item.userId?.email || 'N/A'}</Text>
          </Text>
          <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
            Phone: <Text style={[styles.boldText, { color: colors.text }]}>{item.userId?.phoneNumber || 'N/A'}</Text>
          </Text>
          <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
            Address: <Text style={[styles.boldText, { color: colors.text }]}>{item.address}</Text>
          </Text>

          <Text style={[styles.sectionSubtitle, { color: colors.text, marginTop: 12 }]}>Experiences:</Text>
          <View style={[styles.quoteContainer, { backgroundColor: colors.inputBg, marginTop: 4, marginBottom: 12 }]}>
            <Text style={[styles.quoteText, { color: colors.text }]}>{item.experiences}</Text>
          </View>

          <Text style={[styles.sectionSubtitle, { color: colors.text }]}>Evidence / Credentials:</Text>
          {renderEvidence(item.evidence)}
        </View>

        {item.status === 'pending' && (
          <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.successButton, { backgroundColor: '#143825' }]}
              onPress={() => handleUpdateApplicationStatus(item._id, 'approved')}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#75B798" />
              <Text style={[styles.actionBtnText, { color: '#75B798' }]}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton, { backgroundColor: '#44191C' }]}
              onPress={() => handleUpdateApplicationStatus(item._id, 'rejected')}
            >
              <Ionicons name="close-circle-outline" size={16} color="#EA868F" />
              <Text style={[styles.actionBtnText, { color: '#EA868F' }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>CareCircle Admin</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs segment */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'sessions'
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.inputBg },
          ]}
          onPress={() => {
            setActiveTab('sessions');
            setLoading(true);
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={activeTab === 'sessions' ? colors.onPrimary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'sessions' ? colors.onPrimary : colors.textSecondary },
            ]}
          >
            All Sessions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'reports'
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.inputBg },
          ]}
          onPress={() => {
            setActiveTab('reports');
            setLoading(true);
          }}
        >
          <Ionicons
            name="warning-outline"
            size={18}
            color={activeTab === 'reports' ? colors.onPrimary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'reports' ? colors.onPrimary : colors.textSecondary },
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'supporters'
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.inputBg },
          ]}
          onPress={() => {
            setActiveTab('supporters');
            setLoading(true);
          }}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === 'supporters' ? colors.onPrimary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'supporters' ? colors.onPrimary : colors.textSecondary },
            ]}
          >
            Supporters
          </Text>
        </TouchableOpacity>
      </View>

      {/* List content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading dashboard data...</Text>
        </View>
      ) : (
        <FlatList
          data={(activeTab === 'sessions' ? sessions : activeTab === 'reports' ? reports : supporters) as any[]}
          keyExtractor={(item) => item._id}
          renderItem={
            (activeTab === 'sessions'
              ? renderSessionCard
              : activeTab === 'reports'
              ? renderReportCard
              : renderSupporterCard) as any
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name={
                  activeTab === 'sessions'
                    ? 'calendar-outline'
                    : activeTab === 'reports'
                    ? 'checkmark-done-circle-outline'
                    : 'people-outline'
                }
                size={64}
                color={activeTab === 'reports' ? '#75B798' : colors.border}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {activeTab === 'sessions'
                  ? 'No Sessions Found'
                  : activeTab === 'reports'
                  ? 'All Clear!'
                  : 'No Applications Found'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {activeTab === 'sessions'
                  ? 'No support sessions have been hosted or scheduled yet.'
                  : activeTab === 'reports'
                  ? 'There are currently no reported comments awaiting moderation.'
                  : 'There are no peer supporter applications submitted yet.'}
              </Text>
            </View>
          }
        />
      )}

      {/* View Session Details Modal */}
      {selectedSession && (
        <Modal
          visible={!!selectedSession}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedSession(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Session Details</Text>
                <TouchableOpacity onPress={() => setSelectedSession(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>TITLE</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>{selectedSession.title}</Text>
                </View>

                {selectedSession.description ? (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>DESCRIPTION</Text>
                    <Text style={[styles.modalValue, { color: colors.text }]}>
                      {selectedSession.description}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>STATUS</Text>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: getStatusColor(selectedSession.status).bg,
                        alignSelf: 'flex-start',
                        marginTop: 4,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: getStatusColor(selectedSession.status).text },
                      ]}
                    >
                      {selectedSession.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>TIME & DATE</Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    Start: {formatDateTime(selectedSession.startTime)}
                  </Text>
                  <Text style={[styles.modalValue, { color: colors.text }]}>
                    End: {formatDateTime(selectedSession.endTime)}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>SESSION TYPE</Text>
                  <Text style={[styles.modalValue, { color: colors.text, fontWeight: '600' }]}>
                    {selectedSession.sessionType === 'physical' ? 'Physical Session' : 'Online Session'}
                  </Text>
                </View>

                {selectedSession.sessionType === 'physical' ? (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>VENUE / LOCATION</Text>
                    <Text style={[styles.modalValue, { color: colors.text }]}>
                      {selectedSession.venue || 'N/A'}
                    </Text>
                  </View>
                ) : selectedSession.meetingLink ? (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>MEETING LINK (JITSI)</Text>
                    <Text style={[styles.modalValue, { color: colors.primary }]}>
                      {selectedSession.meetingLink}
                    </Text>
                  </View>
                ) : null}

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>HOST (PEER SUPPORTER)</Text>
                  <Text style={[styles.modalValue, { color: colors.text, fontWeight: '600' }]}>
                    {selectedSession.supporterId.name}
                  </Text>
                  <Text style={[styles.modalSubValue, { color: colors.textSecondary }]}>
                    Email: {selectedSession.supporterId.email}
                  </Text>
                  {selectedSession.supporterId.phoneNumber ? (
                    <Text style={[styles.modalSubValue, { color: colors.textSecondary }]}>
                      Phone: {selectedSession.supporterId.phoneNumber}
                    </Text>
                  ) : null}
                </View>

                {selectedSession.userId ? (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>BOOKED BY (USER)</Text>
                    <Text style={[styles.modalValue, { color: colors.text, fontWeight: '600' }]}>
                      {selectedSession.userId.name}
                    </Text>
                    <Text style={[styles.modalSubValue, { color: colors.textSecondary }]}>
                      Email: {selectedSession.userId.email}
                    </Text>
                    {selectedSession.userId.phoneNumber ? (
                      <Text style={[styles.modalSubValue, { color: colors.textSecondary }]}>
                        Phone: {selectedSession.userId.phoneNumber}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </ScrollView>

              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: colors.primary }]}
                onPress={() => setSelectedSession(null)}
              >
                <Text style={[styles.modalCloseBtnText, { color: colors.onPrimary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Full screen photo viewer Modal */}
      <Modal visible={!!viewingImageUri} transparent={true} animationType="fade" onRequestClose={() => setViewingImageUri(null)}>
        <View style={styles.fullscreenModalOverlay}>
          <TouchableOpacity style={styles.closeFullscreenBtn} onPress={() => setViewingImageUri(null)}>
            <Ionicons name="close-circle" size={42} color="#FFFFFF" />
          </TouchableOpacity>
          {viewingImageUri && (
            <Image source={{ uri: viewingImageUri }} style={styles.fullscreenModalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardBody: {
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
  },
  boldText: {
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  outlineButton: {
    borderWidth: 1,
  },
  dangerOutlineButton: {
    borderWidth: 1,
    borderColor: '#BA1A1A',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BA1A1A',
  },
  reportDate: {
    fontSize: 12,
  },
  quoteContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  quoteText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  metaDetail: {
    fontSize: 13,
  },
  successButton: {
    flex: 1,
  },
  dangerButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 16,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  modalSubValue: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  modalCloseBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  evidenceBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  evidenceNameText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  evidenceImageContainer: {
    alignItems: 'center',
    position: 'relative',
    height: 150,
    borderRadius: 6,
    overflow: 'hidden',
  },
  evidenceCardImage: {
    width: '100%',
    height: '100%',
  },
  viewFullBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewFullBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  documentContainer: {
    padding: 4,
  },
  documentMetaText: {
    fontSize: 12,
  },
  evidenceTextBox: {
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  evidenceText: {
    fontSize: 13,
    lineHeight: 18,
  },
  fullscreenModalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullscreenBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullscreenModalImage: {
    width: '95%',
    height: '80%',
  },
});
