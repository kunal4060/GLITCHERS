import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { theme } from '../theme/theme';
import { useAuthStore } from '../store/authStore';

export const OnboardingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const { user, setUser, setGoogleConnections } = useAuthStore();

  const [university, setUniversity] = useState(user?.university || 'State Technological University');
  const [course, setCourse] = useState(user?.course || 'Computer Science & Engineering');
  const [semester, setSemester] = useState('6');
  const [budget, setBudget] = useState('10000');

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      if (user) {
        setUser({
          ...user,
          university,
          course,
          semester: parseInt(semester, 10) || 1,
        });
      }
      setGoogleConnections(true, true);
      Alert.alert('Setup Complete', 'Welcome to GLITCHERS AI Student Life Companion!');
      onComplete();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress Indicator */}
      <View style={styles.progressRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.progressDot, step >= i && styles.progressDotActive]} />
        ))}
      </View>

      {step === 1 && (
        <View style={styles.stepContainer}>
          <Text style={styles.badge}>🎓 AI STUDENT COMPANION</Text>
          <Text style={styles.title}>Welcome to GLITCHERS</Text>
          <Text style={styles.description}>
            The intelligent operating system for your student life. Connect your university email, schedule, tasks,
            and finances in one unified companion.
          </Text>

          <View style={styles.featureBox}>
            <Text style={styles.featureItem}>• 📧 Intelligent University Email Summaries</Text>
            <Text style={styles.featureItem}>• 🗓 Automatic Timetable & Conflict Detection</Text>
            <Text style={styles.featureItem}>• 💰 Conversational Expense & Budget Tracking</Text>
            <Text style={styles.featureItem}>• 🎓 Android Floating Assistant over any app</Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>Get Started →</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContainer}>
          <Text style={styles.badge}>🔐 ONE GOOGLE IDENTITY</Text>
          <Text style={styles.title}>Continue with Google</Text>
          <Text style={styles.description}>
            Log in once with your Google account. We will securely link your student identity, university Gmail, and
            Google Calendar.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Permissions Requested:</Text>
            <Text style={styles.cardText}>
              • <Text style={styles.bold}>Gmail Readonly:</Text> To filter university circulars and detect class rescheduling.
            </Text>
            <Text style={styles.cardText}>
              • <Text style={styles.bold}>Google Calendar:</Text> To synchronize classes, exams, and assignment deadlines.
            </Text>
            <Text style={styles.privacyNote}>🔒 Your Google password is never stored or requested.</Text>
          </View>

          <TouchableOpacity style={styles.googleBtn} onPress={handleNext}>
            <Text style={styles.googleBtnText}>🌐 Sign In with Google</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepContainer}>
          <Text style={styles.badge}>🏫 ACADEMIC SETUP</Text>
          <Text style={styles.title}>University Profile</Text>
          <Text style={styles.description}>Tell us your university details to customize reminders and email filters.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>University / College Name</Text>
            <TextInput
              style={styles.input}
              value={university}
              onChangeText={setUniversity}
              placeholder="e.g. State University"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputLabel}>Degree / Course</Text>
            <TextInput
              style={styles.input}
              value={course}
              onChangeText={setCourse}
              placeholder="e.g. B.Tech Computer Science"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputLabel}>Current Semester</Text>
            <TextInput
              style={styles.input}
              value={semester}
              onChangeText={setSemester}
              placeholder="e.g. 6"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 4 && (
        <View style={styles.stepContainer}>
          <Text style={styles.badge}>💸 FINANCIAL GOALS</Text>
          <Text style={styles.title}>Monthly Budget</Text>
          <Text style={styles.description}>Set your monthly spending target. The AI will notify you at 75% and 90% utilization.</Text>

          <View style={styles.budgetBox}>
            <Text style={styles.budgetCurrency}>₹</Text>
            <TextInput
              style={styles.budgetInput}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
              placeholder="10000"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Floating Assistant Enabled</Text>
            <Text style={styles.infoText}>
              A compact floating bubble (🎓) will stay accessible over other apps so you can check schedule, add
              expenses, or ask AI without opening the full app.
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>Enter Dashboard 🚀</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 },
  progressDot: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.surfaceBorder },
  progressDotActive: { backgroundColor: theme.colors.primary },
  stepContainer: { flex: 1 },
  badge: { fontSize: 11, fontWeight: 'bold', color: theme.colors.primary, letterSpacing: 1, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text, marginBottom: 12 },
  description: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  featureBox: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, gap: 12, marginBottom: 32 },
  featureItem: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  primaryBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...theme.shadow,
  },
  primaryBtnText: { color: '#0B0F19', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 18, marginBottom: 32 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.text, marginBottom: 10 },
  cardText: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  bold: { color: theme.colors.text, fontWeight: 'bold' },
  privacyNote: { fontSize: 12, color: theme.colors.success, marginTop: 8, fontWeight: '600' },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...theme.shadow,
  },
  googleBtnText: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  formGroup: { marginBottom: 32 },
  inputLabel: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    borderRadius: 12,
    padding: 14,
    color: theme.colors.text,
    fontSize: 14,
  },
  budgetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  budgetCurrency: { fontSize: 32, fontWeight: 'bold', color: theme.colors.primary, marginRight: 8 },
  budgetInput: { fontSize: 36, fontWeight: 'bold', color: theme.colors.text, minWidth: 120 },
  infoCard: { backgroundColor: theme.colors.surfaceSubtle, borderRadius: 12, padding: 16, marginBottom: 32 },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text, marginBottom: 4 },
  infoText: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 18 },
});
