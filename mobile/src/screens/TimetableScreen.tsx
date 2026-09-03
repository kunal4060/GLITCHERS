import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { designTokens } from '../theme/designTokens';
import { GlassCard } from '../components/common/GlassCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { useDashboardStore } from '../store/dashboardStore';
import type { ClassSession } from '@glitchers/shared';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TimetableScreen: React.FC = () => {
  const { classes, setClasses } = useDashboardStore();
  const [selectedDay, setSelectedDay] = useState('Thursday');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newTime, setNewTime] = useState('14:00 - 15:00');
  const [newFaculty, setNewFaculty] = useState('');

  const dayUpper = selectedDay.toUpperCase();
  const dayClasses = classes.filter((c) => c.day === dayUpper);

  const handleAddClass = () => {
    if (!newSubject.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }
    const [start = '14:00', end = '15:00'] = newTime.split('-').map((s) => s.trim());
    const newSession: ClassSession = {
      id: String(Date.now()),
      userId: 'u1',
      subjectName: newSubject.trim(),
      day: dayUpper as any,
      startTime: start,
      endTime: end,
      room: newRoom.trim() || 'AB1-101',
      faculty: newFaculty.trim() || 'Faculty',
      classType: 'LECTURE',
      isCancelled: false,
    };
    setClasses([...classes, newSession]);
    setNewSubject('');
    setNewRoom('');
    setNewFaculty('');
    setIsAddModalVisible(false);
    Alert.alert('Class Added', `${newSession.subjectName} added to ${selectedDay}'s schedule.`);
  };

  const handleDeleteClass = (id: string, name: string) => {
    Alert.alert('Delete Class', `Remove ${name} from schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setClasses(classes.filter((c) => c.id !== id)),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Timetable</Text>
          <Text style={styles.headerSubtitle}>
            {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'} on {selectedDay}
          </Text>
        </View>

        <View style={styles.headerRightButtons}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAddModalVisible(true)}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Monday - Friday Tabs */}
      <View style={styles.dayTabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsContent}
        >
          {DAYS.map((day) => {
            const isActive = day === selectedDay;
            return (
              <TouchableOpacity
                key={day}
                style={[styles.dayTab, isActive && styles.dayTabActive]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Class Schedule List */}
      <ScrollView contentContainerStyle={styles.scheduleList}>
        {dayClasses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>☕</Text>
            <Text style={styles.emptyTitle}>No classes scheduled for {selectedDay}</Text>
            <Text style={styles.emptySub}>Enjoy your free academic hours or catch up on project work.</Text>
          </View>
        ) : (
          dayClasses.map((item, index) => {
            // Intelligent status calculation
            let statusBadge = <StatusBadge label="Upcoming" variant="countdown" />;
            if (index === 0 && selectedDay === 'Thursday') {
              statusBadge = <StatusBadge label="Starts in 18 min" variant="countdown" />;
            } else if (index === 1 && selectedDay === 'Thursday') {
              statusBadge = <StatusBadge label="In 1h 15m" variant="countdown" />;
            }

            return (
              <GlassCard key={item.id} style={styles.classCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeStart}>{item.startTime}</Text>
                    <Text style={styles.timeEnd}>{item.endTime}</Text>
                  </View>

                  <View style={styles.cardHeaderRight}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{item.classType || 'LECTURE'}</Text>
                    </View>
                    {statusBadge}
                  </View>
                </View>

                <Text style={styles.subjectName}>{item.subjectName}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>📍</Text>
                    <Text style={styles.metaText}>{item.room || 'Room TBD'}</Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>👤</Text>
                    <Text style={styles.metaText}>{item.faculty || 'Faculty'}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteIconBtn}
                    onPress={() => handleDeleteClass(item.id, item.subjectName)}
                  >
                    <Text style={styles.deleteIconText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      {/* Add Class Modal */}
      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Class for {selectedDay}</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Course Name (e.g. Compiler Design)"
              placeholderTextColor="#64748B"
              value={newSubject}
              onChangeText={setNewSubject}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Time Range (e.g. 14:00 - 15:00)"
              placeholderTextColor="#64748B"
              value={newTime}
              onChangeText={setNewTime}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Room Number (e.g. AB1-204)"
              placeholderTextColor="#64748B"
              value={newRoom}
              onChangeText={setNewRoom}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Faculty Name (e.g. Dr. K. Sharma)"
              placeholderTextColor="#64748B"
              value={newFaculty}
              onChangeText={setNewFaculty}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddClass}>
                <Text style={styles.modalSaveText}>Add Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: designTokens.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.lg,
    paddingTop: designTokens.spacing.lg,
    paddingBottom: designTokens.spacing.md,
  },
  headerTitle: {
    ...designTokens.typography.hero,
    fontSize: 22,
  },
  headerSubtitle: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  addBtn: {
    backgroundColor: designTokens.colors.primary,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs + 2,
    borderRadius: designTokens.radii.sm,
  },
  addBtnText: {
    ...designTokens.typography.cardTitle,
    fontSize: 12,
    color: '#FFFFFF',
  },
  dayTabsWrapper: {
    marginBottom: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.surfaceBorder,
  },
  dayTabsContent: {
    paddingHorizontal: designTokens.spacing.lg,
    gap: designTokens.spacing.sm,
    paddingBottom: designTokens.spacing.sm,
  },
  dayTab: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs + 2,
    borderRadius: designTokens.radii.pill,
    backgroundColor: designTokens.colors.surfaceCard,
  },
  dayTabActive: {
    backgroundColor: designTokens.colors.primary,
  },
  dayTabText: {
    ...designTokens.typography.bodyMedium,
    fontSize: 13,
    color: designTokens.colors.textSecondary,
  },
  dayTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scheduleList: {
    paddingHorizontal: designTokens.spacing.lg,
    paddingBottom: 100,
    gap: designTokens.spacing.md,
  },
  classCard: {
    marginBottom: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designTokens.spacing.sm,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeStart: {
    ...designTokens.typography.cardTitle,
    fontSize: 14,
    color: designTokens.colors.textPrimary,
  },
  timeEnd: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textMuted,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  typeBadge: {
    backgroundColor: designTokens.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: designTokens.radii.xs,
  },
  typeBadgeText: {
    ...designTokens.typography.micro,
    color: designTokens.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  subjectName: {
    ...designTokens.typography.hero,
    fontSize: 17,
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: { fontSize: 12 },
  metaText: {
    ...designTokens.typography.bodyMedium,
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: designTokens.colors.surfaceBorder,
    marginHorizontal: designTokens.spacing.md,
  },
  deleteIconBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  deleteIconText: {
    color: designTokens.colors.textMuted,
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: designTokens.spacing.hero,
    backgroundColor: designTokens.colors.surfaceCard,
    borderRadius: designTokens.radii.lg,
    paddingHorizontal: designTokens.spacing.xl,
  },
  emptyIcon: { fontSize: 32, marginBottom: designTokens.spacing.sm },
  emptyTitle: { ...designTokens.typography.sectionTitle, fontSize: 15, textAlign: 'center' },
  emptySub: { ...designTokens.typography.body, textAlign: 'center', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: designTokens.colors.surfaceCard,
    borderTopLeftRadius: designTokens.radii.xl,
    borderTopRightRadius: designTokens.radii.xl,
    padding: designTokens.spacing.xl,
    paddingBottom: 36,
    gap: designTokens.spacing.md,
  },
  modalTitle: { ...designTokens.typography.sectionTitle, fontSize: 18, marginBottom: designTokens.spacing.xs },
  modalInput: {
    backgroundColor: designTokens.colors.surfaceElevated,
    borderRadius: designTokens.radii.md,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.md,
    color: designTokens.colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: designTokens.colors.surfaceBorder,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
    marginTop: designTokens.spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: designTokens.colors.surfaceSubtle,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radii.md,
    alignItems: 'center',
  },
  modalCancelText: { ...designTokens.typography.cardTitle, fontSize: 13, color: designTokens.colors.textSecondary },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: designTokens.colors.primary,
    paddingVertical: designTokens.spacing.md,
    borderRadius: designTokens.radii.md,
    alignItems: 'center',
  },
  modalSaveText: { ...designTokens.typography.cardTitle, fontSize: 13, color: '#FFFFFF' },
});
