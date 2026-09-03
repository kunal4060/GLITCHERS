import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';

interface ClassItem {
  id: string;
  startTime: string;
  endTime: string;
  name: string;
  faculty: string;
  code: string;
  room: string;
  slot: string;
}

const SCHEDULE_DATA: Record<string, ClassItem[]> = {
  THU: [
    {
      id: '1',
      startTime: '9:00 AM',
      endTime: '9:50 AM',
      name: 'Artificial Intelligence',
      faculty: 'MITHILESH KUMAR DUBEY',
      code: 'CSE3002 - ETH',
      room: '120-CB',
      slot: 'C1+TCC1',
    },
    {
      id: '2',
      startTime: '10:01 AM',
      endTime: '10:51 AM',
      name: 'Entrepreneurship',
      faculty: 'Ishfaq Ahmad Thaku',
      code: 'MGT1040 - ETH',
      room: '408-CB',
      slot: 'G1+TG1',
    },
    {
      id: '3',
      startTime: '11:00 AM',
      endTime: '11:50 AM',
      name: 'Computer Organization and Architecture',
      faculty: 'PULLURI HARISH',
      code: 'ECE2002 - TH',
      room: '220-CB',
      slot: 'A1+TA1+TAA1',
    },
    {
      id: '4',
      startTime: '12:00 PM',
      endTime: '12:50 PM',
      name: 'Discrete Mathematical Structures',
      faculty: 'Venkatrajam Marka',
      code: 'MAT1003 - TH',
      room: '120-CB',
      slot: 'B1+TB1+TBB1',
    },
  ],
  MON: [
    {
      id: 'm1',
      startTime: '9:00 AM',
      endTime: '9:50 AM',
      name: 'Database Management Systems',
      faculty: 'Dr. Sharma',
      code: 'CSE2004 - ETH',
      room: 'AB1-204',
      slot: 'A1+TA1',
    },
    {
      id: 'm2',
      startTime: '11:00 AM',
      endTime: '12:50 PM',
      name: 'Operating Systems Lab',
      faculty: 'Prof. Verma',
      code: 'CSE2005 - ELA',
      room: 'AB2-301',
      slot: 'L1+L2',
    },
  ],
};

const DAYS = [
  { key: 'SUN', label: 'S' },
  { key: 'MON', label: 'M' },
  { key: 'TUE', label: 'T' },
  { key: 'WED', label: 'W' },
  { key: 'THU', label: 'T' },
  { key: 'FRI', label: 'F' },
  { key: 'SAT', label: 'S' },
];

export const TimetableScreen: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState('THU');
  const classes = SCHEDULE_DATA[selectedDay] || SCHEDULE_DATA.THU;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Timetable</Text>
          <Text style={styles.headerSubtitle}>
            You have {classes.length} classes Today
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* S M T W T F S Day Pills */}
      <View style={styles.daySelectorRow}>
        {DAYS.map((d, index) => {
          const isActive = d.key === selectedDay;
          return (
            <TouchableOpacity
              key={`${d.key}-${index}`}
              style={[styles.dayPill, isActive && styles.dayPillActive]}
              onPress={() => setSelectedDay(d.key)}
            >
              <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Timeline Schedule List */}
      <View style={styles.timelineContainer}>
        {classes.map((item, index) => {
          const isLast = index === classes.length - 1;
          return (
            <View key={item.id} style={styles.timelineItem}>
              {/* Left Rail: Node + Vertical Line */}
              <View style={styles.railColumn}>
                <View style={styles.nodeCircle}>
                  <View style={styles.innerDot} />
                </View>
                {!isLast && <View style={styles.verticalRail} />}
              </View>

              {/* Time Column */}
              <View style={styles.timeColumn}>
                <Text style={styles.startTimeText}>{item.startTime}</Text>
                <Text style={styles.endTimeText}>{item.endTime}</Text>
              </View>

              {/* Class Card */}
              <View style={styles.classCard}>
                <Text style={styles.className}>{item.name}</Text>
                <Text style={styles.facultyName}>{item.faculty}</Text>
                <Text style={styles.codeText}>{item.code}</Text>
                <Text style={styles.roomText}>{item.room}</Text>
                <Text style={styles.slotText}>{item.slot}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F15' },
  content: { padding: 18, paddingBottom: 100 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 6,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#151D2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#233247',
  },
  refreshIcon: {
    fontSize: 16,
  },
  daySelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#151D2A',
    padding: 6,
    borderRadius: 16,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#233247',
  },
  dayPill: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginHorizontal: 2,
  },
  dayPillActive: {
    backgroundColor: '#2563EB', // Bright royal blue from screenshot
  },
  dayText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 14,
  },
  dayTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  timelineContainer: {
    paddingTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    position: 'relative',
  },
  railColumn: {
    width: 20,
    alignItems: 'center',
    position: 'relative',
    marginRight: 8,
    alignSelf: 'stretch',
  },
  nodeCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: '#0B0F15',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    zIndex: 3,
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  verticalRail: {
    position: 'absolute',
    top: 18,
    bottom: -18,
    width: 2,
    backgroundColor: '#2563EB',
    zIndex: 1,
  },
  timeColumn: {
    width: 68,
    paddingTop: 2,
    marginRight: 6,
  },
  startTimeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  endTimeText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  classCard: {
    flex: 1,
    backgroundColor: '#151D2A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#233247',
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  facultyName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  codeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  roomText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
    marginTop: 4,
  },
  slotText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
