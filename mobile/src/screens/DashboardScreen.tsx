import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import {
  getNextUpcomingClass,
  getDayIndex,
  parseTimeToMinutes,
} from '../utils/timetableTimeUtils';

const APP_LOGO = require('../../assets/logo.png');

export const DashboardScreen = ({ navigation }: { navigation?: any }) => {
  const {
    classes,
    tasks,
    expenses,
    budget,
    emails,
    emailBullets,
    setEmailBullets,
    dismissedNoticeIds,
    isLoading,
    avatarUrl,
    cgpa,
    syncWithBackend,
    completeTask,
  } = useDashboardStore();
  const { gmailConnected, user } = useAuthStore();

  const [isSummarizingEmails, setIsSummarizingEmails] = useState(false);

  const activeEmails = emails.filter((e) => !e.isDismissed && !dismissedNoticeIds.includes(e.id));
  const urgentEmail = activeEmails.find((e) => e.importance === 'CRITICAL' || e.importance === 'HIGH');
  const lastActiveHashRef = useRef<string>('');

  const handleSummarizeEmails = async () => {
    if (activeEmails.length === 0) {
      setEmailBullets(['All university circulars and notices have been acknowledged & cleared! 🎉']);
      return;
    }
    setIsSummarizingEmails(true);
    try {
      const res = await apiClient.summarizeEmails(activeEmails);
      if (res?.bullets && res.bullets.length > 0) {
        setEmailBullets(res.bullets);
        return;
      }
    } catch (err) {
      console.warn('Email summarize error:', err);
    } finally {
      setIsSummarizingEmails(false);
    }

    if (activeEmails.length > 0) {
      setEmailBullets(
        activeEmails.slice(0, 3).map((e) => {
          const imp = e.importance === 'HIGH' || e.importance === 'CRITICAL' ? `[${e.importance}] ` : '';
          return `• ${imp}${e.subject}: ${e.summary}`;
        })
      );
    } else {
      setEmailBullets(['All university circulars and notices have been acknowledged & cleared! 🎉']);
    }
  };

  useEffect(() => {
    syncWithBackend().then(() => {
      if (activeEmails.length > 0) {
        handleSummarizeEmails();
      } else {
        setEmailBullets(['All university circulars and notices have been acknowledged & cleared! 🎉']);
      }
    });
  }, []);

  useEffect(() => {
    const activeHash = activeEmails.map((e) => e.id).sort().join(',');
    if (activeEmails.length > 0) {
      if (lastActiveHashRef.current !== activeHash) {
        lastActiveHashRef.current = activeHash;
        handleSummarizeEmails();
      }
    } else {
      lastActiveHashRef.current = '';
      setEmailBullets(['All university circulars and notices have been acknowledged & cleared! 🎉']);
    }
  }, [activeEmails.length, activeEmails.map((e) => e.id).join(',')]);

  const pendingTasks = tasks.filter((t) => t.status === 'TODO');

  // Real-time dynamic timetable calculations
  const now = new Date();
  const currentDayIdx = now.getDay();
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const todayClasses = classes.filter((c) => getDayIndex(c.day) === currentDayIdx && !c.isCancelled);
  const doneClasses = todayClasses.filter((c) => parseTimeToMinutes(c.endTime) <= curMinutes);
  const upcomingCount = todayClasses.filter((c) => parseTimeToMinutes(c.startTime) > curMinutes).length;

  const nextClassInfo = getNextUpcomingClass(classes, now);
  const nextClass = nextClassInfo.nextClass || {
    id: 'placeholder',
    userId: user?.id || 'offline-user',
    subjectName: 'No Classes Scheduled',
    day: 'MONDAY' as const,
    startTime: '08:00',
    endTime: '09:50',
    room: 'AB1-204',
    faculty: 'Dr. A. Sharma',
    classType: 'LECTURE' as const,
    isCancelled: false,
  };

  const studentName = user?.fullName ? user.fullName.trim().split(' ')[0] : 'Kunal';
  const studentEmailDomain = user?.email || 'vitapstudent.ac.in';
  const studentGpa = cgpa || '9.24';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* 1. Header Bar: Logo, NEXA ACADEMIC, Title & Student Profile Avatar */}
      <View style={styles.headerBar}>
        <View style={styles.headerBrand}>
          <Image source={APP_LOGO} style={styles.brandLogo} resizeMode="contain" />
          <View>
            <Text style={styles.brandCaps}>NEXA ACADEMIC</Text>
            <Text style={styles.screenTitle}>Home</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation?.navigate('Search')}
            activeOpacity={0.7}
            accessibilityLabel="Search"
          >
            <Ionicons name="search-outline" size={19} color="#1A1C1D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation?.navigate('Alerts')}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={19} color="#1A1C1D" />
            {activeEmails.length > 0 && <View style={styles.headerNotifDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileAvatarBtn}
            onPress={() => navigation?.navigate('Profile')}
            activeOpacity={0.8}
            accessibilityLabel="Student Profile"
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.headerAvatarImg} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarInitial}>
                  {studentName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={syncWithBackend}
            tintColor={designTokens.colors.secondary}
          />
        }
      >
        {/* 2. Greeting & Academic Pulse */}
        <View style={styles.greetingSection}>
          <View style={{ flex: 1 }}>
            <View style={styles.pulseRow}>
              <View style={styles.onTrackPill}>
                <View style={styles.pulseDot} />
                <Text style={styles.onTrackText}>ON TRACK</Text>
              </View>
              <Text style={styles.gpaText}>GPA {studentGpa}</Text>
            </View>
            <Text style={styles.greetingHeading}>
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, {studentName}
            </Text>
            <Text style={styles.greetingSubtext} numberOfLines={1}>
              {studentEmailDomain} • Semester 3 • CSE Specialization
            </Text>
          </View>

          <View style={styles.campusBeacon}>
            <View style={styles.beaconIconRow}>
              <Ionicons name="compass-outline" size={14} color={designTokens.colors.textSecondary} />
              <Text style={styles.beaconDay}>DAY 42</Text>
            </View>
            <Text style={styles.beaconTerm}>Autumn '24</Text>
          </View>
        </View>

        {/* Nia AI Universal Search Bar */}
        <TouchableOpacity
          style={styles.niaSearchBar}
          onPress={() => navigation?.navigate('Search')}
          activeOpacity={0.88}
        >
          <View style={styles.niaSearchInner}>
            <Ionicons name="search-outline" size={16} color="#76777D" />
            <Text style={styles.niaSearchPlaceholder}>Ask Nia anything or search...</Text>
          </View>
          <View style={styles.niaSearchBadge}>
            <Ionicons name="sparkles" size={11} color="#006A63" />
            <Text style={styles.niaSearchBadgeText}>NIA AI</Text>
          </View>
        </TouchableOpacity>

        {/* Academic Suite Quick-Access Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickChipsScroll}
        >
          <TouchableOpacity
            style={styles.quickChip}
            onPress={() => navigation?.navigate('Attendance')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickChipIcon, { backgroundColor: 'rgba(0, 106, 99, 0.12)' }]}>
              <Ionicons name="pie-chart-outline" size={14} color="#006A63" />
            </View>
            <Text style={styles.quickChipText}>Attendance 85%</Text>
            <View style={styles.quickChipBadge}>
              <Text style={styles.quickChipBadgeText}>Safe</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickChip}
            onPress={() => navigation?.navigate('Exams')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickChipIcon, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
              <Ionicons name="school-outline" size={14} color="#D97706" />
            </View>
            <Text style={styles.quickChipText}>Exams & Labs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickChip}
            onPress={() => navigation?.navigate('Docs')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickChipIcon, { backgroundColor: 'rgba(29, 78, 216, 0.12)' }]}>
              <Ionicons name="document-text-outline" size={14} color="#1D4ED8" />
            </View>
            <Text style={styles.quickChipText}>Doc Intelligence</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickChip}
            onPress={() => navigation?.navigate('Calendar')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickChipIcon, { backgroundColor: 'rgba(124, 58, 237, 0.12)' }]}>
              <Ionicons name="calendar-outline" size={14} color="#7C3AED" />
            </View>
            <Text style={styles.quickChipText}>Academic Cal</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 3. Metrics Strip: 3 Minimalist Telemetry Micro-Cards */}
        <View style={styles.metricsStrip}>
          {/* Classes Micro-Card */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation?.navigate('Timetable')}
            activeOpacity={0.88}
          >
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricCardLabel}>Classes</Text>
              <Ionicons name="checkmark-circle" size={16} color="#006A63" />
            </View>
            <View style={styles.metricCardBody}>
              <Text style={styles.metricCardCount}>
                {doneClasses.length > 0 ? `${doneClasses.length} Done` : `${todayClasses.length} Today`}
              </Text>
              <Text style={[styles.metricCardSub, { color: '#006A63' }]}>
                {upcomingCount > 0 ? `${upcomingCount} upcoming` : 'Complete today'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Tasks Micro-Card */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation?.navigate('Tasks')}
            activeOpacity={0.88}
          >
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricCardLabel}>Tasks</Text>
              <View style={[styles.microDot, { backgroundColor: '#BA1A1A' }]} />
            </View>
            <View style={styles.metricCardBody}>
              <Text style={styles.metricCardCount}>{pendingTasks.length} Due</Text>
              <Text style={[styles.metricCardSub, { color: '#BA1A1A' }]}>
                {pendingTasks.filter((t) => t.priority === 'EXTREMELY_IMPORTANT' || t.priority === 'HIGH').length} urgent today
              </Text>
            </View>
          </TouchableOpacity>

          {/* Notices Micro-Card */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation?.navigate('Email')}
            activeOpacity={0.88}
          >
            <View style={styles.metricCardHeader}>
              <Text style={styles.metricCardLabel}>Notices</Text>
              <View style={[styles.microDot, { backgroundColor: '#006A63' }]} />
            </View>
            <View style={styles.metricCardBody}>
              <Text style={styles.metricCardCount}>
                {activeEmails.length > 0 ? `${activeEmails.length} New` : '0 New'}
              </Text>
              <Text style={styles.metricCardSub}>
                {urgentEmail ? 'Dean Circular' : 'All caught up'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. Nia AI Intelligent Digest */}
        <View style={styles.digestCard}>
          <View style={styles.digestGlow} />
          <View style={styles.digestInner}>
            <View style={styles.digestIconCircle}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.digestHeaderRow}>
                <Text style={styles.digestTitleText}>NIA AI • NEXA INTELLIGENT SYSTEM</Text>
                <Text style={styles.digestTimeText}>2m ago</Text>
              </View>
              <Text style={styles.digestBodyText}>
                {emailBullets[0]
                  ? emailBullets[0].replace(/^[•\-\*]\s*/, '')
                  : 'Analyzed campus advisories. Priority note: Fall Exam Registrations commence Monday at 10:00 AM.'}
              </Text>
              <View style={styles.digestActionRow}>
                <TouchableOpacity
                  style={styles.digestActionPrimary}
                  onPress={() => navigation?.navigate('Email')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.digestActionPrimaryText}>Read Circular</Text>
                  <Ionicons name="arrow-forward" size={12} color="#1A1C1D" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.digestActionGhost}
                  onPress={() => navigation?.navigate('Calendar')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.digestActionGhostText}>Add to Calendar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Feature Banner: Upcoming Next Class (Obsidian Precision Card) */}
        <TouchableOpacity
          style={styles.obsidianHeroCard}
          onPress={() => navigation?.navigate('Timetable')}
          activeOpacity={0.92}
        >
          <View style={styles.obsidianGlowAccent} />
          <View style={styles.obsidianHeaderRow}>
            <View style={styles.obsidianPillGroup}>
              <View style={styles.obsidianCodePill}>
                <Text style={styles.obsidianCodeText}>
                  {nextClass.subjectName.includes(' ') ? nextClass.subjectName.split(' ')[0] : 'CSE3002'}
                </Text>
              </View>
              <Text style={styles.obsidianBullet}>•</Text>
              <Text style={styles.obsidianTimeSchedule}>
                {nextClassInfo.isOngoing ? 'HAPPENING NOW' : 'NEXT • TODAY'}
              </Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255, 255, 255, 0.4)" />
          </View>

          <View style={styles.obsidianSubjectSection}>
            <Text style={styles.obsidianSubjectTitle}>
              {nextClass.subjectName.replace('\\n', ' ')}
            </Text>
            <View style={styles.obsidianMetaRow}>
              <View style={styles.obsidianMetaItem}>
                <Ionicons name="time-outline" size={14} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.obsidianMetaText}>
                  {nextClass.startTime} – {nextClass.endTime}
                </Text>
              </View>
              <Text style={styles.obsidianBullet}>•</Text>
              <View style={styles.obsidianMetaItem}>
                <Ionicons name="location-outline" size={14} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.obsidianMetaText}>
                  Room {nextClass.room || 'AB1-204'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.obsidianFooterRow}>
            <View style={styles.obsidianFacultyGroup}>
              <View style={styles.obsidianFacultyAvatar}>
                <Ionicons name="school" size={13} color="rgba(255, 255, 255, 0.8)" />
              </View>
              <Text style={styles.obsidianFacultyName}>{nextClass.faculty || 'Dr. A. Sharma'}</Text>
            </View>

            <View style={styles.obsidianActionBtn}>
              <Ionicons name="cloud-download-outline" size={13} color="#FFFFFF" />
              <Text style={styles.obsidianActionBtnText}>Get Slides</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 6. Priority Deadlines Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>Priority Deadlines</Text>
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>{pendingTasks.length} Active</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation?.navigate('Tasks')}>
            <Text style={styles.allTasksLink}>ALL TASKS →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.deadlinesList}>
          {pendingTasks.length === 0 ? (
            <View style={styles.emptyDeadlinesCard}>
              <Ionicons name="checkmark-done" size={20} color="#006A63" />
              <Text style={styles.emptyDeadlinesText}>Academic schedule clear. All tasks completed! 🎉</Text>
            </View>
          ) : (
            pendingTasks.slice(0, 3).map((task) => {
              const isUrgent = task.priority === 'EXTREMELY_IMPORTANT' || task.priority === 'HIGH';
              const dueDateLabel = task.dueDate
                ? new Date(task.dueDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                : 'Today';

              return (
                <View key={task.id} style={styles.deadlinesCard}>
                  <TouchableOpacity
                    style={styles.taskCheckBtn}
                    onPress={() => completeTask(task.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={13} color="#C6C6CD" />
                  </TouchableOpacity>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.deadlineTitleRow}>
                      <Text style={styles.deadlineTitleText} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <View
                        style={[
                          styles.urgencyBadge,
                          {
                            backgroundColor: isUrgent ? '#FFDADA' : '#EEEEF0',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyBadgeText,
                            { color: isUrgent ? '#920028' : '#45464C' },
                          ]}
                        >
                          {task.priority === 'EXTREMELY_IMPORTANT' ? 'CRITICAL' : task.priority}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.deadlineSubtitleText}>CapStone Project Phase II</Text>
                  </View>

                  <View style={styles.deadlinesRightCol}>
                    <Text
                      style={[
                        styles.deadlinesDateText,
                        isUrgent && { color: '#BA1A1A' },
                      ]}
                    >
                      {dueDateLabel}
                    </Text>
                    <Ionicons name="ellipsis-vertical" size={14} color="#C6C6CD" />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* 7. Spending Snapshot Progress Module */}
        <View style={styles.spendingCard}>
          <View style={styles.spendingTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="sparkles" size={14} color="#006A63" />
              <Text style={styles.spendingCardLabel}>NIA EMAIL SUMMARY</Text>
            </View>
            <View style={styles.geminiPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.geminiPillText}>Gemini 1.5 Flash</Text>
            </View>
          </View>
          <Text style={styles.spendingDescText}>
            Executive briefing from university circulars & notices:
          </Text>
          <View style={styles.emailExtractionBox}>
            {isSummarizingEmails ? (
              <>
                <ActivityIndicator size="small" color="#006A63" />
                <Text style={styles.extractionText}>NIA is extracting key deadlines & notices...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sync" size={16} color="#006A63" />
                <Text style={styles.extractionText} numberOfLines={1}>
                  {emailBullets[0] || 'Fall Exam registrations commence Monday at 10:00 AM.'}
                </Text>
              </>
            )}
          </View>
          <TouchableOpacity
            style={styles.viewNoticesLinkRow}
            onPress={() => navigation?.navigate('Email')}
            activeOpacity={0.75}
          >
            <Text style={styles.viewNoticesLinkText}>
              View All University Notices ({activeEmails.length})
            </Text>
            <Ionicons name="arrow-forward" size={13} color="#006A63" />
          </TouchableOpacity>
        </View>

        {/* 8. Visual Campus Spotlight: Student Life & Labs */}
        <View style={styles.campusSection}>
          <View style={styles.campusSectionHeader}>
            <Text style={styles.sectionTitle}>Campus Spaces</Text>
            <Text style={styles.campusStatusLabel}>REAL-TIME STATUS</Text>
          </View>

          <View style={styles.campusGrid}>
            {/* Space Card 1 */}
            <View style={styles.spaceCard}>
              <View style={styles.spaceImgPlaceholder}>
                <Ionicons name="library-outline" size={28} color="#006A63" />
                <View style={styles.spaceBadge}>
                  <Text style={styles.spaceBadgeText}>85% Open</Text>
                </View>
              </View>
              <View style={styles.spaceInfo}>
                <Text style={styles.spaceTitle} numberOfLines={1}>Turing Reading Room</Text>
                <Text style={styles.spaceSubtitle}>Library 3rd Floor • Silent</Text>
              </View>
            </View>

            {/* Space Card 2 */}
            <View style={styles.spaceCard}>
              <View style={styles.spaceImgPlaceholder}>
                <Ionicons name="hardware-chip-outline" size={28} color="#006A63" />
                <View style={[styles.spaceBadge, { backgroundColor: '#E2F4F2' }]}>
                  <Text style={[styles.spaceBadgeText, { color: '#006A63' }]}>Active Now</Text>
                </View>
              </View>
              <View style={styles.spaceInfo}>
                <Text style={styles.spaceTitle} numberOfLines={1}>Central Tech Hub</Text>
                <Text style={styles.spaceSubtitle}>Innovation Quad • Group</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Ideation Credit */}
        <View style={styles.creditBox}>
          <Text style={styles.creditText}>Ideated by Kartiki More</Text>
        </View>
      </ScrollView>

      {/* Floating Action Trigger Button (+) */}
      <TouchableOpacity
        style={styles.floatingAddBtn}
        onPress={() => navigation?.navigate('Tasks')}
        activeOpacity={0.88}
        accessibilityLabel="Quick Action"
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 226, 228, 0.6)',
    backgroundColor: 'rgba(249, 249, 251, 0.95)',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  brandCaps: {
    fontSize: 9,
    fontWeight: '700',
    color: '#76777D',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: -0.2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerNotifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#BA1A1A',
  },
  profileAvatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E2E2E4',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  niaSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  niaSearchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  niaSearchPlaceholder: {
    fontSize: 13,
    color: '#76777D',
    fontWeight: '400',
  },
  niaSearchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  niaSearchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006A63',
    letterSpacing: 0.5,
  },
  quickChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.08)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  quickChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1C1D',
  },
  quickChipBadge: {
    backgroundColor: 'rgba(0, 106, 99, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  quickChipBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#006A63',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  content: {
    padding: 20,
    paddingBottom: 96,
    gap: 16,
  },
  greetingSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  onTrackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 106, 99, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#006A63',
  },
  onTrackText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#006A63',
    letterSpacing: 0.8,
  },
  gpaText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#76777D',
    letterSpacing: 0.8,
  },
  greetingHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  greetingSubtext: {
    fontSize: 12,
    color: '#76777D',
    marginTop: 2,
  },
  campusBeacon: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  beaconIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  beaconDay: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: 0.8,
  },
  beaconTerm: {
    fontSize: 11,
    color: '#76777D',
    marginTop: 2,
  },
  metricsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#76777D',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricCardBody: {
    gap: 2,
  },
  metricCardCount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: -0.3,
  },
  metricCardSub: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#76777D',
  },
  digestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  digestGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(0, 106, 99, 0.07)',
  },
  digestInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  digestIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digestHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  digestTitleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006A63',
    letterSpacing: 0.8,
  },
  digestTimeText: {
    fontSize: 10,
    color: '#76777D',
  },
  digestBodyText: {
    fontSize: 12.5,
    color: '#1A1C1D',
    lineHeight: 18,
    marginTop: 2,
  },
  digestActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  digestActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8E8EA',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  digestActionPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  digestActionGhost: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  digestActionGhostText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#76777D',
  },
  obsidianHeroCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  obsidianGlowAccent: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(0, 106, 99, 0.25)',
    borderRadius: 60,
  },
  obsidianHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  obsidianPillGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  obsidianCodePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  obsidianCodeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  obsidianBullet: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
  },
  obsidianTimeSchedule: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#80D5CB',
    letterSpacing: 0.8,
  },
  obsidianSubjectSection: {
    marginBottom: 16,
  },
  obsidianSubjectTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  obsidianMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  obsidianMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  obsidianMetaText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  obsidianFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  obsidianFacultyGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  obsidianFacultyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  obsidianFacultyName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  obsidianActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  obsidianActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: -0.2,
  },
  sectionCountPill: {
    backgroundColor: '#EEEEF0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#45464C',
  },
  allTasksLink: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#006A63',
    letterSpacing: 0.6,
  },
  deadlinesList: {
    gap: 8,
  },
  deadlinesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  taskCheckBtn: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C6C6CD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deadlineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deadlineTitleText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1A1C1D',
    flex: 1,
  },
  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgencyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deadlineSubtitleText: {
    fontSize: 11,
    color: '#76777D',
    marginTop: 2,
  },
  deadlinesRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadlinesDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#76777D',
  },
  emptyDeadlinesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  emptyDeadlinesText: {
    fontSize: 12.5,
    color: '#76777D',
    fontWeight: '500',
    textAlign: 'center',
  },
  spendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  spendingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  spendingCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A1C1D',
    letterSpacing: 0.8,
  },
  geminiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  geminiPillText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#006A63',
  },
  spendingDescText: {
    fontSize: 12,
    color: '#76777D',
    marginTop: 2,
  },
  emailExtractionBox: {
    backgroundColor: '#F3F3F5',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  extractionText: {
    fontSize: 12,
    color: '#45464C',
    fontWeight: '500',
    flex: 1,
  },
  viewNoticesLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F3F5',
  },
  viewNoticesLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006A63',
    letterSpacing: 0.5,
  },
  campusSection: {
    gap: 10,
    marginTop: 4,
  },
  campusSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  campusStatusLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#76777D',
    letterSpacing: 0.8,
  },
  campusGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  spaceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(26, 28, 29, 0.06)',
  },
  spaceImgPlaceholder: {
    height: 80,
    backgroundColor: '#F3F3F5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  spaceBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  spaceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  spaceInfo: {
    padding: 10,
  },
  spaceTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1A1C1D',
  },
  spaceSubtitle: {
    fontSize: 10,
    color: '#76777D',
    marginTop: 2,
  },
  creditBox: {
    alignItems: 'center',
    marginTop: 6,
  },
  creditText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#76777D',
  },
  floatingAddBtn: {
    position: 'absolute',
    bottom: 84,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
});
