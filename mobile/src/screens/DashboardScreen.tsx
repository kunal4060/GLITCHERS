import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { designTokens } from '../theme/designTokens';
import { useDashboardStore } from '../store/dashboardStore';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { getNextUpcomingClass, parseTimeToMinutes, getDayIndex } from '../utils/timetableTimeUtils';
import { NiaHeader, LabelCaps, StatusPill, NiaCard } from '../components/nia';
import { timeAgo, greeting, firstName, termLabel, formatDue } from '../utils/niaFormat';

const C = designTokens.colors;

const ALL_CLEAR = 'All university circulars and notices have been acknowledged & cleared!';

function dayOfTerm(d: Date = new Date()): number {
  const m = d.getMonth();
  const startMonth = m >= 7 ? 7 : m >= 0 && m <= 4 ? 0 : 5;
  const start = new Date(d.getFullYear(), startMonth, 1);
  return Math.max(1, Math.floor((d.getTime() - start.getTime()) / 86400000) + 1);
}

export const DashboardScreen = ({ navigation }: { navigation?: any }) => {
  const {
    classes,
    tasks,
    emails,
    emailBullets,
    dismissedNoticeIds,
    expenses,
    budget,
    cgpa,
    syncWithBackend,
    setEmailBullets,
    completeTask,
  } = useDashboardStore();
  const { user } = useAuthStore();

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const hashRef = useRef('');

  const activeEmails = emails.filter((e) => !e.isDismissed && !dismissedNoticeIds.includes(e.id));
  const urgentEmail = activeEmails.find((e) => e.importance === 'CRITICAL' || e.importance === 'HIGH');
  const pendingTasks = tasks.filter((t) => t.status === 'TODO');
  const urgentTasks = pendingTasks.filter((t) => t.priority === 'HIGH' || t.priority === 'EXTREMELY_IMPORTANT');

  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const todayClasses = classes.filter((c) => getDayIndex(c.day) === now.getDay() && !c.isCancelled);
  const doneClasses = todayClasses.filter((c) => parseTimeToMinutes(c.endTime) <= curMinutes);
  const nextInfo = getNextUpcomingClass(classes, now);
  const nextClass = nextInfo.nextClass;

  // ---- email briefing ----
  const summarize = async (list: typeof activeEmails) => {
    if (list.length === 0) {
      setEmailBullets([ALL_CLEAR]);
      return;
    }
    setIsSummarizing(true);
    try {
      const res = await apiClient.summarizeEmails(list);
      const clean = (res?.bullets || []).filter(
        (b) =>
          !b.includes('Semester End Examination') &&
          !b.includes('Continuous Internal Assessment') &&
          !b.includes('Annual University Hackathon')
      );
      if (clean.length > 0) {
        setEmailBullets(clean);
        return;
      }
    } catch {
      /* offline fallback below */
    } finally {
      setIsSummarizing(false);
    }
    const cleanActive = list.filter(
      (e) =>
        !e.subject.includes('Semester End Examination') &&
        !e.subject.includes('Continuous Internal Assessment') &&
        !e.subject.includes('Annual University Hackathon')
    );
    setEmailBullets(
      cleanActive.length > 0
        ? cleanActive.slice(0, 4).map((e) => `• ${e.subject}: ${e.summary}`)
        : [ALL_CLEAR]
    );
  };

  useEffect(() => {
    syncWithBackend().then(() => summarize(useDashboardStore.getState().emails.filter(
      (e) => !e.isDismissed && !useDashboardStore.getState().dismissedNoticeIds.includes(e.id)
    )));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emailHash = activeEmails.map((e) => e.id).sort().join(',');
  useEffect(() => {
    if (emailHash !== hashRef.current) {
      hashRef.current = emailHash;
      summarize(activeEmails);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailHash]);

  const onTrack = urgentTasks.length === 0;
  const topTasks = [...pendingTasks]
    .sort((a, b) => {
      const pw = (p?: string) => (p === 'EXTREMELY_IMPORTANT' ? 0 : p === 'HIGH' ? 1 : p === 'NORMAL' ? 2 : 3);
      return pw(a.priority) - pw(b.priority);
    })
    .slice(0, 3);

  const quickActions = [
    { icon: 'checkbox-outline', label: 'New Task', desc: 'Capture a deadline', go: () => navigation?.navigate('Tasks') },
    { icon: 'cash-outline', label: 'Log Expense', desc: 'Track spending', go: () => navigation?.navigate('Finance') },
    { icon: 'sparkles-outline', label: 'Ask NIA', desc: 'AI assistance', go: () => navigation?.navigate('NIA') },
  ];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <NiaHeader title="Home" navigation={navigation} />

          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <StatusPill label={onTrack ? 'On Track' : 'Action Needed'} tone={onTrack ? 'success' : 'danger'} />
              <Text style={styles.gpaText}>CGPA {cgpa || '—'}</Text>
            </View>
            <View style={styles.statusRight}>
              <View style={styles.dayRow}>
                <Ionicons name="sunny-outline" size={14} color={C.textMuted} />
                <Text style={styles.dayText}>DAY {dayOfTerm()}</Text>
              </View>
              <Text style={styles.termText}>{termLabel()}</Text>
            </View>
          </View>

          {/* Greeting */}
          <Text style={styles.greeting}>
            {greeting()}, {firstName(user?.fullName)}
          </Text>
          <Text style={styles.greetingSub} numberOfLines={1}>
            {[user?.email, user?.semester ? `Semester ${user.semester}` : null, user?.course]
              .filter(Boolean)
              .join(' • ')}
          </Text>

          {/* Stat cards */}
          <View style={styles.statRow}>
            <NiaCard style={styles.statCard}>
              <View style={styles.statTop}>
                <LabelCaps>Classes</LabelCaps>
                <Ionicons name="checkmark-circle" size={16} color={C.eucalyptus} />
              </View>
              <Text style={styles.statNum}>{doneClasses.length} Done</Text>
              <Text style={[styles.statSub, { color: C.eucalyptus }]}>
                {todayClasses.length - doneClasses.length > 0
                  ? `${todayClasses.length - doneClasses.length} upcoming today`
                  : 'Complete today'}
              </Text>
            </NiaCard>
            <NiaCard style={styles.statCard}>
              <View style={styles.statTop}>
                <LabelCaps>Tasks</LabelCaps>
                {urgentTasks.length > 0 && <View style={styles.dot} />}
              </View>
              <Text style={styles.statNum}>{pendingTasks.length} Due</Text>
              <Text style={[styles.statSub, urgentTasks.length > 0 && { color: C.terracotta }]}>
                {urgentTasks.length > 0 ? `${urgentTasks.length} urgent today` : 'All clear'}
              </Text>
            </NiaCard>
            <TouchableOpacity style={styles.statCardTouch} onPress={() => navigation?.navigate('Alerts')} activeOpacity={0.85}>
              <NiaCard style={styles.statCardInner}>
                <View style={styles.statTop}>
                  <LabelCaps>Notices</LabelCaps>
                  {activeEmails.length > 0 && <View style={[styles.dot, { backgroundColor: C.eucalyptus }]} />}
                </View>
                <Text style={styles.statNum}>{activeEmails.length} New</Text>
                <Text style={styles.statSub} numberOfLines={1}>
                  {activeEmails[0]?.subject || 'Dean Circular'}
                </Text>
              </NiaCard>
            </TouchableOpacity>
          </View>

          {/* NIA priority notice */}
          <NiaCard style={styles.noticeCard}>
            <View style={styles.noticeTop}>
              <View style={styles.niaIconSm}>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              </View>
              <LabelCaps color={C.eucalyptus}>NIA AI • Nexa Intelligent System</LabelCaps>
              <Text style={styles.noticeTime}>{timeAgo(urgentEmail?.receivedAt) || 'just now'}</Text>
            </View>
            <Text style={styles.noticeText}>
              {urgentEmail
                ? `Analyzed ${activeEmails.length} campus ${activeEmails.length === 1 ? 'advisory' : 'advisories'}. Priority note: `
                : 'Campus advisory scan complete. '}
              {urgentEmail ? (
                <Text style={styles.noticeBold}>{urgentEmail.subject}</Text>
              ) : (
                <Text style={styles.noticeBold}>No priority advisories right now.</Text>
              )}
            </Text>
            <View style={styles.noticeActions}>
              <TouchableOpacity style={styles.readBtn} onPress={() => navigation?.navigate('Email')} activeOpacity={0.8}>
                <Text style={styles.readBtnText}>Read Circular</Text>
                <Ionicons name="arrow-forward" size={14} color={C.ink} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation?.navigate('Calendar')} activeOpacity={0.7}>
                <Text style={styles.linkText}>Add to Calendar</Text>
              </TouchableOpacity>
            </View>
          </NiaCard>

          {/* Next class — dark telemetry card */}
          <NiaCard dark style={styles.nextCard}>
            <View style={styles.nextTop}>
              <View style={styles.nextCodeRow}>
                {nextClass ? (
                  <>
                    <Text style={styles.nextCode}>{nextClass.subjectName.split(' ')[0].toUpperCase().slice(0, 8)}</Text>
                    <View style={styles.nextDot} />
                    <Text style={styles.nextWhen}>
                      {nextInfo.isOngoing ? 'NOW' : (nextInfo.statusLabel || '').toUpperCase()}
                      {nextClass.startTime ? ` • ${nextClass.startTime.slice(0, 5)}` : ''}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.nextWhen}>SCHEDULE CLEAR</Text>
                )}
              </View>
              <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.5)" />
            </View>
            <Text style={styles.nextTitle}>
              {nextClass ? nextClass.subjectName : 'No more classes today'}
            </Text>
            <View style={styles.nextMeta}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.nextMetaText}>
                {nextClass ? `${nextClass.startTime?.slice(0, 5)} – ${nextClass.endTime?.slice(0, 5)}` : 'Deep work block'}
              </Text>
              <View style={styles.nextDot} />
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.nextMetaText}>Room {nextClass?.room || '—'}</Text>
            </View>
            <View style={styles.nextBottom}>
              <View style={styles.nextFaculty}>
                <View style={styles.facultyAvatar}>
                  <Ionicons name="school-outline" size={14} color="rgba(255,255,255,0.8)" />
                </View>
                <Text style={styles.nextFacultyText}>{nextClass?.faculty || 'NIA Schedule'}</Text>
              </View>
              <TouchableOpacity style={styles.slidesBtn} onPress={() => navigation?.navigate('Docs')} activeOpacity={0.8}>
                <Ionicons name="cloud-download-outline" size={14} color="#FFFFFF" />
                <Text style={styles.slidesBtnText}>Get Slides</Text>
              </TouchableOpacity>
            </View>
          </NiaCard>

          {/* Priority deadlines */}
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLeft}>
              <Text style={styles.sectionTitle}>Priority Deadlines</Text>
              <StatusPill label={`${pendingTasks.length} Active`} tone="neutral" />
            </View>
            <TouchableOpacity onPress={() => navigation?.navigate('Tasks')} style={styles.allTasks} activeOpacity={0.7}>
              <Text style={styles.allTasksText}>ALL TASKS</Text>
              <Ionicons name="chevron-forward" size={14} color={C.eucalyptus} />
            </TouchableOpacity>
          </View>

          {topTasks.length === 0 ? (
            <NiaCard style={{ marginHorizontal: 20 }}>
              <Text style={styles.emptyText}>No pending deadlines. Enjoy the calm.</Text>
            </NiaCard>
          ) : (
            topTasks.map((t) => {
              const due = formatDue(t.dueDate);
              const high = t.priority === 'HIGH' || t.priority === 'EXTREMELY_IMPORTANT';
              return (
                <View key={t.id} style={styles.taskRow}>
                  <TouchableOpacity
                    onPress={() => t.id && completeTask(t.id)}
                    style={styles.checkbox}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Complete ${t.title}`}
                  >
                    <Ionicons name="checkmark" size={14} color={C.eucalyptus} />
                  </TouchableOpacity>
                  <View style={styles.taskMain}>
                    <View style={styles.taskTitleRow}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{t.title}</Text>
                      <StatusPill label={high ? 'High' : t.priority === 'NORMAL' ? 'Normal' : 'Low'} tone={high ? 'danger' : 'neutral'} />
                    </View>
                    {!!t.description && <Text style={styles.taskSub} numberOfLines={1}>{t.description}</Text>}
                    <Text style={[styles.taskDue, due.urgent && { color: C.terracotta }]}>{due.text}</Text>
                  </View>
                  <Ionicons name="reorder-three-outline" size={18} color={C.textSubtle} />
                </View>
              );
            })
          )}

          {/* NIA email summary */}
          <NiaCard style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryLabelRow}>
                <Ionicons name="sparkles" size={14} color={C.eucalyptus} />
                <LabelCaps>NIA Email Summary</LabelCaps>
              </View>
              <StatusPill label="Gemini 1.5 Flash" tone="success" />
            </View>
            <Text style={styles.summaryIntro}>Executive briefing from university circulars & notices:</Text>
            <View style={styles.summaryBody}>
              {isSummarizing ? (
                <ActivityIndicator size="small" color={C.eucalyptus} />
              ) : (
                emailBullets.slice(0, 3).map((b, i) => (
                  <Text key={i} style={styles.summaryBullet} numberOfLines={2}>{b}</Text>
                ))
              )}
            </View>
            <TouchableOpacity onPress={() => navigation?.navigate('Email')} style={styles.viewAll} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>VIEW ALL UNIVERSITY NOTICES ({activeEmails.length})</Text>
              <Ionicons name="arrow-forward" size={14} color={C.eucalyptus} />
            </TouchableOpacity>
          </NiaCard>

          {/* Campus spaces */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Campus Spaces</Text>
            <LabelCaps>Real-time status</LabelCaps>
          </View>
          <View style={styles.spacesRow}>
            {[
              { name: 'Turing Reading Room', sub: 'Library 3rd Floor • Silent', pill: '85% Open', icon: 'book-outline' },
              { name: 'Central Tech Hub', sub: 'Innovation Quad • Group', pill: 'Active Now', icon: 'people-outline' },
            ].map((s) => (
              <NiaCard key={s.name} style={styles.spaceCard}>
                <View style={styles.spaceTile}>
                  <Ionicons name={s.icon as any} size={28} color={C.eucalyptus} />
                  <StatusPill label={s.pill} tone="success" style={styles.spacePill} />
                </View>
                <Text style={styles.spaceName}>{s.name}</Text>
                <Text style={styles.spaceSub}>{s.sub}</Text>
              </NiaCard>
            ))}
          </View>

          <View style={{ height: 8 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setQuickAddVisible(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Quick add"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Quick-add sheet */}
        <Modal visible={quickAddVisible} transparent animationType="fade" onRequestClose={() => setQuickAddVisible(false)}>
          <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setQuickAddVisible(false)}>
            <View style={styles.sheet}>
              <LabelCaps style={styles.sheetLabel}>Quick Add</LabelCaps>
              {quickActions.map((a) => (
                <TouchableOpacity
                  key={a.label}
                  style={styles.sheetRow}
                  onPress={() => { setQuickAddVisible(false); a.go(); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.sheetIcon}>
                    <Ionicons name={a.icon as any} size={20} color={C.obsidian} />
                  </View>
                  <View>
                    <Text style={styles.sheetTitle}>{a.label}</Text>
                    <Text style={styles.sheetDesc}>{a.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.textSubtle} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.porcelain },
  content: { paddingBottom: 120 },
  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 10,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gpaText: { fontSize: 12, fontWeight: '600', color: C.textSecondary, letterSpacing: 0.4 },
  statusRight: { alignItems: 'flex-end' },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dayText: { fontSize: 11, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.8 },
  termText: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  greeting: {
    fontSize: 27, fontWeight: '700', color: C.ink, letterSpacing: -0.6, paddingHorizontal: 20,
  },
  greetingSub: { fontSize: 12, color: C.textMuted, paddingHorizontal: 20, marginTop: 4, marginBottom: 14 },
  statRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  statCard: { flex: 1, padding: 12, borderRadius: 16 },
  statCardTouch: { flex: 1 },
  statCardInner: { padding: 12, borderRadius: 16, flex: 1 },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.terracotta },
  statNum: { fontSize: 20, fontWeight: '700', color: C.ink, letterSpacing: -0.4 },
  statSub: { fontSize: 11, fontWeight: '500', color: C.textMuted, marginTop: 3 },
  noticeCard: { marginHorizontal: 20, marginBottom: 14 },
  noticeTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  niaIconSm: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.obsidian,
    alignItems: 'center', justifyContent: 'center',
  },
  noticeTime: { fontSize: 11, color: C.textMuted, marginLeft: 'auto' },
  noticeText: { fontSize: 13.5, color: C.textSecondary, lineHeight: 20 },
  noticeBold: { fontWeight: '700', color: C.ink },
  noticeActions: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 12 },
  readBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F1F1F4', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  readBtnText: { fontSize: 12, fontWeight: '700', color: C.ink },
  linkText: { fontSize: 12, fontWeight: '600', color: C.textSecondary },
  nextCard: { marginHorizontal: 20, marginBottom: 18, padding: 18 },
  nextTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  nextCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextCode: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.6 },
  nextDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.4)' },
  nextWhen: { fontSize: 11, fontWeight: '700', color: C.eucalyptus, letterSpacing: 0.8 },
  nextTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 10 },
  nextMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 },
  nextMetaText: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  nextBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextFaculty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  facultyAvatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  nextFacultyText: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  slidesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
  },
  slidesBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 10, marginTop: 4,
  },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.ink, letterSpacing: -0.3 },
  allTasks: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  allTasksText: { fontSize: 11, fontWeight: '700', color: C.eucalyptus, letterSpacing: 0.8 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: C.hairline,
    padding: 14, marginHorizontal: 20, marginBottom: 8,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.hairline,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF',
  },
  taskMain: { flex: 1 },
  taskTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  taskTitle: { fontSize: 14.5, fontWeight: '600', color: C.ink, flex: 1 },
  taskSub: { fontSize: 12, color: C.textMuted, marginBottom: 3 },
  taskDue: { fontSize: 11.5, fontWeight: '600', color: C.textSecondary },
  emptyText: { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingVertical: 8 },
  summaryCard: { marginHorizontal: 20, marginTop: 12, marginBottom: 6 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryIntro: { fontSize: 13, color: C.textSecondary, marginBottom: 8 },
  summaryBody: { backgroundColor: C.porcelain, borderRadius: 12, padding: 12, marginBottom: 10 },
  summaryBullet: { fontSize: 12.5, color: C.textSecondary, lineHeight: 18, marginBottom: 6 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewAllText: { fontSize: 11, fontWeight: '700', color: C.eucalyptus, letterSpacing: 0.8 },
  spacesRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 10 },
  spaceCard: { flex: 1, padding: 12 },
  spaceTile: {
    height: 86, borderRadius: 12, backgroundColor: C.eucalyptusFaint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  spacePill: { position: 'absolute', top: 8, alignSelf: 'center' },
  spaceName: { fontSize: 13.5, fontWeight: '700', color: C.ink, marginBottom: 2 },
  spaceSub: { fontSize: 11, color: C.textMuted },
  fab: {
    position: 'absolute', right: 20, bottom: 158,
    width: 58, height: 58, borderRadius: 29, backgroundColor: C.obsidian,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25,
    shadowRadius: 16, elevation: 8,
  },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(17,24,39,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetLabel: { marginBottom: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sheetIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.porcelain,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.hairline,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  sheetDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
});
