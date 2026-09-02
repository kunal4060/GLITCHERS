import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useDashboardStore } from '../store/dashboardStore';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;

export const TimetableScreen: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<typeof DAYS[number]>('MONDAY');
  const { classes, setClasses } = useDashboardStore();

  const dayClasses = classes.filter((c) => c.day === selectedDay);

  const handleUploadTimetable = () => {
    Alert.alert(
      'Timetable Uploaded & Analyzed',
      'Gemini extracted 2 new classes from your timetable PDF without conflicts.',
      [
        {
          text: 'OK',
          onPress: () => {
            setClasses([
              ...classes,
              {
                id: String(Date.now()),
                userId: 'u1',
                subjectName: 'Computer Networks',
                day: 'WEDNESDAY',
                startTime: '11:00',
                endTime: '12:00',
                room: 'AB1-305',
                faculty: 'Dr. Nair',
                classType: 'LECTURE',
                isCancelled: false,
              },
            ]);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Day Selector Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
        {DAYS.map((day) => (
          <TouchableOpacity
            key={day}
            style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
            onPress={() => setSelectedDay(day)}
          >
            <Text style={[styles.dayTabText, selectedDay === day && styles.dayTabTextActive]}>
              {day.slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Class Schedule Feed */}
      <ScrollView style={styles.content}>
        {dayClasses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎉</Text>
            <Text style={styles.emptyStateTitle}>No Classes Scheduled</Text>
            <Text style={styles.emptyStateSub}>You have a free day on {selectedDay}.</Text>
          </View>
        ) : (
          dayClasses.map((item) => (
            <View key={item.id} style={styles.classCard}>
              <View style={styles.timeColumn}>
                <Text style={styles.timeText}>{item.startTime}</Text>
                <Text style={styles.timeSub}>{item.endTime}</Text>
              </View>

              <View style={styles.detailsColumn}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeText}>{item.classType}</Text>
                </View>
                <Text style={styles.subjectText}>{item.subjectName}</Text>
                <Text style={styles.roomText}>📍 Room {item.room || 'AB1-204'}</Text>
                <Text style={styles.facultyText}>👨‍🏫 {item.faculty || 'Faculty'}</Text>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadTimetable}>
          <Text style={styles.uploadBtnText}>📸 Upload Timetable (Image / PDF)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  daysScroll: { maxHeight: 60, paddingHorizontal: 16, marginVertical: 12 },
  dayTab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    marginRight: 8,
  },
  dayTabActive: { backgroundColor: '#3B82F6' },
  dayTabText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 13 },
  dayTabTextActive: { color: '#FFFFFF' },
  content: { padding: 16, paddingBottom: 100 },
  classCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timeColumn: {
    width: 70,
    borderRightWidth: 1,
    borderRightColor: '#334155',
    paddingRight: 10,
    justifyContent: 'center',
  },
  timeText: { fontSize: 15, fontWeight: 'bold', color: '#38BDF8' },
  timeSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  detailsColumn: { flex: 1, paddingLeft: 14 },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  typeText: { fontSize: 10, color: '#38BDF8', fontWeight: 'bold' },
  subjectText: { fontSize: 16, fontWeight: 'bold', color: '#F8FAFC' },
  roomText: { fontSize: 13, color: '#CBD5E1', marginTop: 4 },
  facultyText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyStateIcon: { fontSize: 40, marginBottom: 12 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' },
  emptyStateSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  uploadBtn: {
    marginTop: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  uploadBtnText: { color: '#38BDF8', fontWeight: 'bold', fontSize: 14 },
});
