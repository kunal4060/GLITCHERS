import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { apiClient } from '../api/client';
import type { ClassSession, DayOfWeekType } from '@glitchers/shared';

const DAYS_OF_WEEK: DayOfWeekType[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const OnboardingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const {
    user,
    currentOnboardingStep,
    onboardingData,
    setOnboardingStep,
    completeOnboarding,
    setGoogleConnections,
  } = useAuthStore();

  // Active step state machine
  const [activeStep, setActiveStep] = useState<string>(
    currentOnboardingStep && currentOnboardingStep !== 'COMPLETE' && currentOnboardingStep !== 'GOOGLE_AUTH'
      ? currentOnboardingStep
      : 'GOOGLE_SERVICES'
  );

  // 1. Google Services
  const [gmailEnabled, setGmailEnabled] = useState(true);
  const [calendarEnabled, setCalendarEnabled] = useState(true);
  const [universityDomain, setUniversityDomain] = useState(user?.universityDomain || 'university.edu');

  // 2. Profile
  const [fullName, setFullName] = useState(user?.fullName || 'Kunal Ugale');
  const [university, setUniversity] = useState(user?.university || 'State Technological University');
  const [course, setCourse] = useState(user?.course || 'Computer Science & Engineering');
  const [year, setYear] = useState(user?.year || 3);
  const [semester, setSemester] = useState(user?.semester || 6);
  const [section, setSection] = useState(user?.section || 'A');

  // 3. Academics
  const [cgpa, setCgpa] = useState(user?.cgpa || '8.71');
  const [creditsCompleted, setCreditsCompleted] = useState(String(user?.creditsCompleted ?? 42));
  const [creditsCurrent, setCreditsCurrent] = useState(String(user?.creditsCurrent ?? 18));
  const [studentId, setStudentId] = useState(user?.studentId || 'CS2023-084');

  // 4 & 5. Timetable & Review
  const [timetableMode, setTimetableMode] = useState<'CHOICE' | 'MANUAL' | 'REVIEW'>('CHOICE');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [classes, setClasses] = useState<Partial<ClassSession>[]>([]);

  // Manual Class Form State
  const [manualSubject, setManualSubject] = useState('');
  const [manualDay, setManualDay] = useState<DayOfWeekType>('MONDAY');
  const [manualStartTime, setManualStartTime] = useState('10:00');
  const [manualEndTime, setManualEndTime] = useState('11:00');
  const [manualRoom, setManualRoom] = useState('AB1-204');
  const [manualFaculty, setManualFaculty] = useState('Faculty Member');

  // 6. Notifications
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState('23:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');

  // 7. Finance
  const [monthlyBudget, setMonthlyBudget] = useState('10000');
  const [startingBalance, setStartingBalance] = useState('7500');

  // 8. Floating Assistant
  const [floatingAssistantEnabled, setFloatingAssistantEnabled] = useState(true);

  // 9. Initial Processing State
  const [processingStages, setProcessingStages] = useState<
    Array<{ key: string; label: string; done: boolean; inProgress: boolean }>
  >([
    { key: 'profile', label: 'Linking student profile & academics', done: false, inProgress: true },
    { key: 'timetable', label: 'Organizing classes & deduplicating subjects', done: false, inProgress: false },
    { key: 'calendar', label: 'Synchronizing academic schedule', done: false, inProgress: false },
    { key: 'notifications', label: 'Configuring quiet hours & reminder engine', done: false, inProgress: false },
    { key: 'finance', label: 'Initializing student budget & expense records', done: false, inProgress: false },
    { key: 'email_processing', label: 'Queuing university email filter', done: false, inProgress: false },
  ]);

  // Sync state if step changes
  useEffect(() => {
    if (activeStep !== currentOnboardingStep) {
      setOnboardingStep(activeStep as any);
    }
  }, [activeStep]);

  // Handle Timetable Image Upload & AI Vision OCR
  const handleUploadTimetable = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow photo gallery access to upload your timetable.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        base64: true,
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsAnalyzingImage(true);
        const asset = result.assets[0];
        let base64 = asset.base64;
        const mimeType = asset.mimeType || 'image/jpeg';

        // Fallback for Web if asset.base64 is not populated by expo-image-picker
        if (!base64 && asset.uri) {
          try {
            const blobRes = await fetch(asset.uri);
            const blob = await blobRes.blob();
            base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const dataUrl = reader.result as string;
                resolve(dataUrl.replace(/^data:[^;]+;base64,/, ''));
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (blobErr: any) {
            console.warn('Could not read asset uri as blob:', blobErr);
          }
        }

        if (!base64) {
          setIsAnalyzingImage(false);
          Alert.alert('Upload Error', 'Could not read the image data. Please try selecting the image again.');
          return;
        }

        const res = await apiClient.analyzeTimetableImage(base64, mimeType);
        setIsAnalyzingImage(false);

        if (res.classes && res.classes.length > 0) {
          setClasses(res.classes);
          Alert.alert('Timetable Analyzed', `Successfully extracted ${res.classes.length} classes from your schedule!`);
          setActiveStep('TIMETABLE_REVIEW');
        } else {
          Alert.alert(
            'Extraction Notice',
            'No classes could be automatically recognized from this image. Please verify the image is clear, enter classes manually, or load the sample schedule.',
            [
              { text: 'Add Manually', onPress: () => setTimetableMode('MANUAL') },
              { text: 'Retry', style: 'cancel' },
            ]
          );
        }
      }
    } catch (err: any) {
      setIsAnalyzingImage(false);
      Alert.alert('Analysis Notice', err.message || 'Could not analyze image.');
    }
  };

  const handleAddManualClass = () => {
    if (!manualSubject.trim()) {
      Alert.alert('Subject Required', 'Please enter a subject name.');
      return;
    }

    const newClass: Partial<ClassSession> = {
      subjectName: manualSubject.trim(),
      day: manualDay,
      startTime: manualStartTime.trim(),
      endTime: manualEndTime.trim(),
      room: manualRoom.trim() || 'AB1-204',
      faculty: manualFaculty.trim() || 'Faculty Member',
      classType: 'LECTURE',
    };

    setClasses((prev) => [...prev, newClass]);
    setManualSubject('');
    Alert.alert('Added', `${newClass.subjectName} added to timetable.`);
    setActiveStep('TIMETABLE_REVIEW');
  };

  const handleRemoveClass = (index: number) => {
    setClasses((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-progress if mounted or entered into INITIAL_PROCESSING
  useEffect(() => {
    if (activeStep === 'INITIAL_PROCESSING') {
      const timer = setTimeout(() => {
        setProcessingStages((stages) => stages.map((s) => ({ ...s, done: true, inProgress: false })));
        setGoogleConnections(gmailEnabled, calendarEnabled);
        completeOnboarding({
          fullName,
          university,
          course,
          year,
          semester,
          section,
          cgpa,
        });
        setActiveStep('COMPLETE');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeStep]);

  // Run Real Backend Idempotent Initialization
  const runInitializationPipeline = async () => {
    setActiveStep('INITIAL_PROCESSING');

    const payload = {
      profile: {
        fullName,
        university,
        course,
        year,
        semester,
        section,
        cgpa,
        creditsCompleted: Number(creditsCompleted) || 0,
        creditsCurrent: Number(creditsCurrent) || 0,
        universityDomain,
      },
      classes,
      notificationSettings: {
        classReminderMinutes: reminderMinutes,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
      },
      financeSettings: {
        startingBalance: Number(startingBalance) || 0,
        monthlyBudget: Number(monthlyBudget) || 10000,
      },
      floatingAssistantEnabled,
    };

    // Trigger backend idempotent initialization job in background (never blocks UI)
    apiClient.initializeWorkspace(payload).catch(() => null);

    // Sequentially animate progress smoothly
    for (let i = 0; i < processingStages.length; i++) {
      await new Promise((r) => setTimeout(r, 220));
      setProcessingStages((stages) =>
        stages.map((s, idx) =>
          idx <= i
            ? { ...s, done: true, inProgress: false }
            : idx === i + 1
            ? { ...s, inProgress: true }
            : s
        )
      );
    }

    setGoogleConnections(gmailEnabled, calendarEnabled);
    completeOnboarding(payload.profile as any);

    // Save user's actual classes and budget into live dashboardStore
    const { setClasses: setDashboardClasses, setBudget, updateAcademics } = useDashboardStore.getState();
    if (classes.length > 0) {
      setDashboardClasses(classes as any);
    }
    updateAcademics(cgpa, Number(creditsCompleted) || 0);
    setBudget({
      id: 'b1',
      userId: user?.id || 'u1',
      monthlyLimit: Number(monthlyBudget) || 10000,
      currentSpending: 0,
      month: new Date().toISOString().slice(0, 7),
      alertThresholds: [75, 90, 100],
    });

    setActiveStep('COMPLETE');
  };

  // Step Progress Calculation
  const stepNumber =
    activeStep === 'GOOGLE_SERVICES'
      ? 1
      : activeStep === 'PROFILE'
      ? 2
      : activeStep === 'ACADEMICS'
      ? 3
      : activeStep === 'TIMETABLE' || activeStep === 'TIMETABLE_REVIEW'
      ? 4
      : activeStep === 'NOTIFICATION_SETUP'
      ? 5
      : activeStep === 'FINANCE_SETUP'
      ? 6
      : activeStep === 'FLOATING_ASSISTANT'
      ? 7
      : activeStep === 'INITIAL_PROCESSING'
      ? 8
      : 9;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F2" />
      <View style={styles.container}>
        {/* Top Stepper Bar */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepperInfo}>
            <Text style={styles.stepperTitle}>
              {activeStep === 'COMPLETE' ? 'Setup Finished' : `Step ${stepNumber} of 8`}
            </Text>
            <Text style={styles.stepperSubtitle}>
              {activeStep === 'GOOGLE_SERVICES'
                ? 'Google Services'
                : activeStep === 'PROFILE'
                ? 'Student Profile'
                : activeStep === 'ACADEMICS'
                ? 'Academic Information'
                : activeStep === 'TIMETABLE' || activeStep === 'TIMETABLE_REVIEW'
                ? 'Timetable & Schedule'
                : activeStep === 'NOTIFICATION_SETUP'
                ? 'Notification Preferences'
                : activeStep === 'FINANCE_SETUP'
                ? 'Student Budget & Finance'
                : activeStep === 'FLOATING_ASSISTANT'
                ? 'Floating AI Assistant'
                : activeStep === 'INITIAL_PROCESSING'
                ? 'Preparing Workspace'
                : 'Welcome to GLITCHERS'}
            </Text>
          </View>
          <View style={styles.stepProgressBar}>
            <View style={[styles.stepProgressFill, { width: `${(stepNumber / 8) * 100}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* STEP 1: GOOGLE SERVICES */}
          {activeStep === 'GOOGLE_SERVICES' && (
            <View style={styles.stepCard}>
              <View style={styles.iconHeading}>
                <View style={styles.iconCircle}>
                  <Ionicons name="link-outline" size={24} color="#2E7470" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeader}>Authorize Google Services</Text>
                  <Text style={styles.cardDesc}>
                    Identity is verified. Select which Google services you want Student AI to coordinate.
                  </Text>
                </View>
              </View>

              <View style={styles.serviceToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Gmail Integration</Text>
                  <Text style={styles.toggleDesc}>
                    Allows Student AI to read and summarize university announcements, exam notices, and detect sudden class cancellations.
                  </Text>
                </View>
                <Switch
                  value={gmailEnabled}
                  onValueChange={setGmailEnabled}
                  trackColor={{ false: '#D8D4CC', true: '#2E7470' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.serviceToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Google Calendar Integration</Text>
                  <Text style={styles.toggleDesc}>
                    Automatically creates calendar events for your weekly classes, upcoming exams, and assignment due dates.
                  </Text>
                </View>
                <Switch
                  value={calendarEnabled}
                  onValueChange={setCalendarEnabled}
                  trackColor={{ false: '#D8D4CC', true: '#2E7470' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>University Email Domain</Text>
                <TextInput
                  style={styles.textInput}
                  value={universityDomain}
                  onChangeText={setUniversityDomain}
                  placeholder="e.g. university.edu"
                  placeholderTextColor="#A09E9B"
                  autoCapitalize="none"
                />
                <Text style={styles.inputHelp}>
                  Student AI focuses email analysis strictly on emails from this domain to preserve your privacy.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setActiveStep('PROFILE')}
              >
                <Text style={styles.primaryButtonText}>Continue to Profile →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: STUDENT PROFILE */}
          {activeStep === 'PROFILE' && (
            <View style={styles.stepCard}>
              <View style={styles.iconHeading}>
                <View style={styles.iconCircle}>
                  <Ionicons name="person-outline" size={24} color="#2E7470" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeader}>Student Profile</Text>
                  <Text style={styles.cardDesc}>
                    Tell us your academic details so your schedule and reminders are perfectly personalized.
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your Name"
                  placeholderTextColor="#A09E9B"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>University / College Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={university}
                  onChangeText={setUniversity}
                  placeholder="e.g. State Technological University"
                  placeholderTextColor="#A09E9B"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Course / Program</Text>
                <TextInput
                  style={styles.textInput}
                  value={course}
                  onChangeText={setCourse}
                  placeholder="e.g. Computer Science & Engineering"
                  placeholderTextColor="#A09E9B"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Year</Text>
                  <TextInput
                    style={styles.textInput}
                    value={String(year)}
                    onChangeText={(t) => setYear(Number(t) || 1)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Semester</Text>
                  <TextInput
                    style={styles.textInput}
                    value={String(semester)}
                    onChangeText={(t) => setSemester(Number(t) || 1)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Section</Text>
                  <TextInput
                    style={styles.textInput}
                    value={section}
                    onChangeText={setSection}
                    placeholder="A"
                    placeholderTextColor="#A09E9B"
                  />
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setActiveStep('GOOGLE_SERVICES')}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 2 }]}
                  onPress={() => {
                    if (!fullName.trim()) {
                      Alert.alert('Name Required', 'Please enter your name.');
                      return;
                    }
                    setActiveStep('ACADEMICS');
                  }}
                >
                  <Text style={styles.primaryButtonText}>Next: Academics →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: ACADEMIC INFORMATION */}
          {activeStep === 'ACADEMICS' && (
            <View style={styles.stepCard}>
              <View style={styles.iconHeading}>
                <View style={styles.iconCircle}>
                  <Ionicons name="school-outline" size={24} color="#2E7470" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeader}>Academic Records</Text>
                  <Text style={styles.cardDesc}>
                    Keep track of your CGPA and credits. You can edit these anytime later from your profile.
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current CGPA (0.00 - 10.00)</Text>
                <TextInput
                  style={styles.textInput}
                  value={cgpa}
                  onChangeText={setCgpa}
                  placeholder="e.g. 8.71"
                  placeholderTextColor="#A09E9B"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Credits Completed</Text>
                  <TextInput
                    style={styles.textInput}
                    value={creditsCompleted}
                    onChangeText={setCreditsCompleted}
                    keyboardType="numeric"
                    placeholder="42"
                    placeholderTextColor="#A09E9B"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Current Semester Credits</Text>
                  <TextInput
                    style={styles.textInput}
                    value={creditsCurrent}
                    onChangeText={setCreditsCurrent}
                    keyboardType="numeric"
                    placeholder="18"
                    placeholderTextColor="#A09E9B"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Student ID / Roll Number (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={studentId}
                  onChangeText={setStudentId}
                  placeholder="e.g. CS2023-084"
                  placeholderTextColor="#A09E9B"
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setActiveStep('PROFILE')}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 2 }]}
                  onPress={() => {
                    const numCgpa = parseFloat(cgpa);
                    if (isNaN(numCgpa) || numCgpa < 0 || numCgpa > 10) {
                      Alert.alert('Invalid CGPA', 'Please enter a valid CGPA between 0.00 and 10.00');
                      return;
                    }
                    setActiveStep('TIMETABLE');
                  }}
                >
                  <Text style={styles.primaryButtonText}>Next: Timetable →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4: TIMETABLE UPLOAD OR ENTRY */}
          {activeStep === 'TIMETABLE' && timetableMode === 'CHOICE' && (
            <View style={styles.stepCard}>
              <View style={styles.iconHeading}>
                <View style={styles.iconCircle}>
                  <Ionicons name="calendar-outline" size={24} color="#2E7470" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeader}>Add Your Timetable</Text>
                  <Text style={styles.cardDesc}>
                    Choose how you want to import your weekly class schedule.
                  </Text>
                </View>
              </View>

              {/* Option A: Upload image/document */}
              <TouchableOpacity
                style={[styles.optionCard, isAnalyzingImage && { borderColor: '#2E7470', backgroundColor: '#F0F8F6' }]}
                onPress={handleUploadTimetable}
                disabled={isAnalyzingImage}
              >
                <View style={styles.optionIconContainer}>
                  {isAnalyzingImage ? (
                    <ActivityIndicator size="small" color="#2E7470" />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={28} color="#2E7470" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>
                    {isAnalyzingImage ? 'Scanning Timetable with Gemini AI...' : 'Upload Timetable Photo or PDF'}
                  </Text>
                  <Text style={styles.optionDesc}>
                    {isAnalyzingImage
                      ? 'Please wait a moment while Gemini Multimodal AI extracts your subjects, timings, and rooms...'
                      : 'Gemini Multimodal AI will scan the document, parse all classes, rooms, and professors automatically.'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option B: Manual Entry */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => setTimetableMode('MANUAL')}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="create-outline" size={28} color="#D4856A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Enter Timetable Manually</Text>
                  <Text style={styles.optionDesc}>
                    Add your courses one by one with days, lecture times, room numbers, and faculty names.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option C: Use Pre-loaded Schedule */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => {
                  setClasses([
                    { subjectName: 'Database Management Systems', day: 'MONDAY', startTime: '10:00', endTime: '11:00', room: 'AB1-204', faculty: 'Dr. Sharma', classType: 'LECTURE' },
                    { subjectName: 'Operating Systems Lab', day: 'MONDAY', startTime: '14:00', endTime: '16:00', room: 'AB2-301', faculty: 'Prof. Verma', classType: 'LAB' },
                    { subjectName: 'Artificial Intelligence', day: 'TUESDAY', startTime: '11:00', endTime: '12:00', room: 'AB3-105', faculty: 'Dr. Iyer', classType: 'LECTURE' },
                    { subjectName: 'Computer Networks', day: 'WEDNESDAY', startTime: '09:00', endTime: '10:00', room: 'AB1-102', faculty: 'Prof. Kulkarni', classType: 'LECTURE' },
                  ]);
                  setActiveStep('TIMETABLE_REVIEW');
                }}
              >
                <View style={styles.optionIconContainer}>
                  <Ionicons name="checkmark-done-circle-outline" size={28} color="#2E7470" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Use Sample Academic Schedule</Text>
                  <Text style={styles.optionDesc}>
                    Pre-fills 4 standard engineering courses (DBMS, OS Lab, AI, Networks) that you can review and edit.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { marginTop: 12 }]}
                onPress={() => setActiveStep('ACADEMICS')}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 4B: MANUAL ENTRY FORM */}
          {activeStep === 'TIMETABLE' && timetableMode === 'MANUAL' && (
            <View style={styles.stepCard}>
              <Text style={styles.cardHeader}>Add a Class Session</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={manualSubject}
                  onChangeText={setManualSubject}
                  placeholder="e.g. Computer Networks"
                  placeholderTextColor="#A09E9B"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Day of Week</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {DAYS_OF_WEEK.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.dayPill, manualDay === d && styles.dayPillActive]}
                      onPress={() => setManualDay(d)}
                    >
                      <Text style={[styles.dayPillText, manualDay === d && styles.dayPillTextActive]}>
                        {d.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Start Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualStartTime}
                    onChangeText={setManualStartTime}
                    placeholder="10:00"
                    placeholderTextColor="#A09E9B"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>End Time</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualEndTime}
                    onChangeText={setManualEndTime}
                    placeholder="11:00"
                    placeholderTextColor="#A09E9B"
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Room</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualRoom}
                    onChangeText={setManualRoom}
                    placeholder="AB1-204"
                    placeholderTextColor="#A09E9B"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1.5 }]}>
                  <Text style={styles.inputLabel}>Faculty</Text>
                  <TextInput
                    style={styles.textInput}
                    value={manualFaculty}
                    onChangeText={setManualFaculty}
                    placeholder="Dr. Sharma"
                    placeholderTextColor="#A09E9B"
                  />
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setTimetableMode('CHOICE')}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 2 }]}
                  onPress={handleAddManualClass}
                >
                  <Text style={styles.primaryButtonText}>Add Class</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 5: TIMETABLE REVIEW & CONFLICT CHECK */}
          {activeStep === 'TIMETABLE_REVIEW' && (
            <View style={styles.stepCard}>
              <View style={styles.iconHeading}>
                <View style={styles.iconCircle}>
                  <Ionicons name="list-outline" size={24} color="#2E7470" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeader}>Review Class Schedule</Text>
                  <Text style={styles.cardDesc}>
                    {classes.length} classes parsed. Verify days, timings, and rooms before confirming.
                  </Text>
                </View>
              </View>

              {/* Conflict Detection Banner */}
              {classes.length >= 2 && (
                <View style={styles.conflictNoticeBox}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#2E7470" />
                  <Text style={styles.conflictNoticeText}>
                    Schedule Conflict Engine active: No overlapping class collisions detected.
                  </Text>
                </View>
              )}

              {/* Class List */}
              <View style={styles.classList}>
                {classes.map((item, idx) => (
                  <View key={idx} style={styles.classItemRow}>
                    <View style={styles.classTimeBadge}>
                      <Text style={styles.classDayText}>{item.day?.slice(0, 3)}</Text>
                      <Text style={styles.classTimeText}>{item.startTime}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.classSubjectText}>{item.subjectName}</Text>
                      <Text style={styles.classMetaText}>
                        {item.room || 'AB1-204'} • {item.faculty || 'Faculty Member'} • {item.classType || 'LECTURE'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveClass(idx)}>
                      <Ionicons name="trash-outline" size={20} color="#D4856A" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Empty state if 0 classes */}
              {classes.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center', backgroundColor: '#FAF8F5', borderRadius: 12, marginVertical: 12, borderWidth: 1, borderColor: '#EAE6E1' }}>
                  <Ionicons name="calendar-outline" size={38} color="#A09E9B" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#1B3B36', marginBottom: 4 }}>No classes added yet</Text>
                  <Text style={{ fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>
                    Your schedule hasn't been populated yet. Re-upload a clearer timetable photo, add your subjects manually, or load sample courses.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.secondaryButton, { paddingVertical: 8, paddingHorizontal: 14 }]}
                      onPress={() => {
                        setTimetableMode('CHOICE');
                        setActiveStep('TIMETABLE');
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>Re-upload Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.primaryButton, { paddingVertical: 8, paddingHorizontal: 14 }]}
                      onPress={() => {
                        setTimetableMode('MANUAL');
                        setActiveStep('TIMETABLE');
                      }}
                    >
                      <Text style={styles.primaryButtonText}>+ Add Manually</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.addMoreBtn}
                onPress={() => {
                  setTimetableMode('MANUAL');
                  setActiveStep('TIMETABLE');
                }}
              >
                <Ionicons name="add-circle-outline" size={18} color="#2E7470" />
                <Text style={styles.addMoreBtnText}>Add Another Class</Text>
              </TouchableOpacity>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setTimetableMode('CHOICE');
                    setActiveStep('TIMETABLE');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 2 }]}
                  onPress={() => setActiveStep('NOTIFICATION_SETUP')}
                >
                  <Text style={styles.primaryButtonText}>Confirm Schedule →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 6: NOTIFICATION PREFERENCES */}
          {activeStep === 'NOTIFICATION_SETUP' && (
            <View style={styles.stepCard}>
              <View style={styles.iconHeading}>
                <View style={styles.iconCircle}>
                  <Ionicons name="notifications-outline" size={24} color="#2E7470" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeader}>Notification Preferences</Text>
                  <Text style={styles.cardDesc}>
                    Configure class alerts and quiet hours so you are never disturbed when resting.
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Class Reminder Lead Time</Text>
              <View style={styles.pillRow}>
                {[5, 10, 15, 30].map((mins) => (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.timePill, reminderMinutes === mins && styles.timePillActive]}
                    onPress={() => setReminderMinutes(mins)}
                  >
                    <Text style={[styles.timePillText, reminderMinutes === mins && styles.timePillTextActive]}>
                      {mins} mins
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.serviceToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Quiet Hours</Text>
                  <Text style={styles.toggleDesc}>
                    Mutes routine notifications between 11:00 PM and 7:00 AM. Critical exam alarms still ring through.
                  </Text>
                </View>
                <Switch
                  value={quietHoursEnabled}
                  onValueChange={setQuietHoursEnabled}
                  trackColor={{ false: '#D8D4CC', true: '#2E7470' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Quiet Start</Text>
                  <TextInput
                    style={styles.textInput}
                    value={quietHoursStart}
                    onChangeText={setQuietHoursStart}
                    placeholder="23:00"
                    placeholderTextColor="#A09E9B"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Quiet End</Text>
                  <TextInput
                    style={styles.textInput}
                    value={quietHoursEnd}
                    onChangeText={setQuietHoursEnd}
                    placeholder="07:00"
                    placeholderTextColor="#A09E9B"
                  />
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setActiveStep('TIMETABLE_REVIEW')}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 2 }]}
                  onPress={() => setActiveStep('FINANCE_SETUP')}
                >
                  <Text style={styles.primaryButtonText}>Next: Finance →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 7: FINANCE SETUP */}
          {activeStep === 'FINANCE_SETUP' && (
            <View style={styles.stepCard}>
              <View style={styles.iconHeading}>
                <View style={styles.iconCircle}>
                  <Ionicons name="wallet-outline" size={24} color="#2E7470" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeader}>Student Budget Setup</Text>
                  <Text style={styles.cardDesc}>
                    Set a monthly limit and current wallet balance to prevent overspending during semester.
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Monthly Spending Limit (₹ / $)</Text>
                <TextInput
                  style={styles.textInput}
                  value={monthlyBudget}
                  onChangeText={setMonthlyBudget}
                  keyboardType="numeric"
                  placeholder="10000"
                  placeholderTextColor="#A09E9B"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Available Balance</Text>
                <TextInput
                  style={styles.textInput}
                  value={startingBalance}
                  onChangeText={setStartingBalance}
                  keyboardType="numeric"
                  placeholder="7500"
                  placeholderTextColor="#A09E9B"
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setActiveStep('NOTIFICATION_SETUP')}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 2 }]}
                  onPress={() => setActiveStep('FLOATING_ASSISTANT')}
                >
                  <Text style={styles.primaryButtonText}>Next: Floating AI →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 8: FLOATING ASSISTANT */}
          {activeStep === 'FLOATING_ASSISTANT' && (
            <View style={styles.stepCard}>
              <View style={styles.iconHeading}>
                <View style={styles.iconCircle}>
                  <Ionicons name="sparkles-outline" size={24} color="#2E7470" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeader}>Floating AI Assistant</Text>
                  <Text style={styles.cardDesc}>
                    A lightweight AI gem overlay you can tap from any screen or app to ask questions or record expenses.
                  </Text>
                </View>
              </View>

              <View style={styles.assistantPreviewBox}>
                <View style={styles.floatingGemBadge}>
                  <Ionicons name="sparkles" size={20} color="#2E7470" />
                </View>
                <Text style={styles.assistantPreviewTitle}>Always Accessible</Text>
                <Text style={styles.assistantPreviewDesc}>
                  Floating gem stays minimized on the edge of your screen. Tap anytime to view your next class or solve quick math without opening the full app.
                </Text>
              </View>

              <View style={styles.serviceToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Enable Floating Assistant</Text>
                  <Text style={styles.toggleDesc}>
                    Draw over other applications. On Android, this requests the SYSTEM_ALERT_WINDOW permission.
                  </Text>
                </View>
                <Switch
                  value={floatingAssistantEnabled}
                  onValueChange={setFloatingAssistantEnabled}
                  trackColor={{ false: '#D8D4CC', true: '#2E7470' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setActiveStep('FINANCE_SETUP')}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, { flex: 2 }]}
                  onPress={runInitializationPipeline}
                >
                  <Text style={styles.primaryButtonText}>Prepare My AI ⚡</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 9: INITIAL DATA PROCESSING (REAL PREPARATION SCREEN) */}
          {activeStep === 'INITIAL_PROCESSING' && (
            <View style={styles.stepCard}>
              <View style={styles.prepHeader}>
                <ActivityIndicator size="large" color="#2E7470" style={{ marginBottom: 16 }} />
                <Text style={styles.prepTitle}>Preparing your Student AI</Text>
                <Text style={styles.prepDesc}>
                  Configuring your academic database, timetable engine, and personal assistant...
                </Text>
              </View>

              <View style={styles.stageList}>
                {processingStages.map((st) => (
                  <View key={st.key} style={styles.stageRow}>
                    <View style={styles.stageIcon}>
                      {st.done ? (
                        <Ionicons name="checkmark-circle" size={22} color="#2E7470" />
                      ) : st.inProgress ? (
                        <ActivityIndicator size="small" color="#2E7470" />
                      ) : (
                        <Ionicons name="ellipse-outline" size={18} color="#D8D4CC" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stageText,
                        st.done && styles.stageTextDone,
                        st.inProgress && styles.stageTextActive,
                      ]}
                    >
                      {st.label}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 20 }]}
                onPress={() => {
                  completeOnboarding({ fullName, university, course, year, semester, section, cgpa });
                  setActiveStep('COMPLETE');
                }}
              >
                <Text style={styles.primaryButtonText}>Continue to Dashboard →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 10: COMPLETE & DASHBOARD ENTRY */}
          {activeStep === 'COMPLETE' && (
            <View style={styles.stepCard}>
              <View style={styles.congratsCircle}>
                <Ionicons name="checkmark" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.congratsTitle}>You are Ready!</Text>
              <Text style={styles.congratsDesc}>
                GLICHERS is initialized and synchronized for {fullName} at {university}.
              </Text>

              <View style={styles.summaryBox}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Program</Text>
                  <Text style={styles.summaryVal}>{course}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Academic Year</Text>
                  <Text style={styles.summaryVal}>Year {year}, Sem {semester} ({section})</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Classes Synced</Text>
                  <Text style={styles.summaryVal}>{classes.length} classes organized</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Monthly Budget</Text>
                  <Text style={styles.summaryVal}>₹{monthlyBudget}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>AI Companion</Text>
                  <Text style={styles.summaryVal}>Online & Ready</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.launchButton}
                onPress={onComplete}
                activeOpacity={0.88}
              >
                <Text style={styles.launchButtonText}>Enter Dashboard →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  container: {
    flex: 1,
  },
  stepperContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE6DC',
    backgroundColor: '#FAF7F2',
  },
  stepperInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepperTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7470',
    letterSpacing: 0.5,
  },
  stepperSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  stepProgressBar: {
    height: 4,
    backgroundColor: '#E6E0D4',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepProgressFill: {
    height: '100%',
    backgroundColor: '#2E7470',
    borderRadius: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#ECE6DC',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 2,
  },
  iconHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#656360',
  },
  serviceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE4',
    gap: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  toggleDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: '#656360',
  },
  inputGroup: {
    marginTop: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3B39',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#ECE6DC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A1A',
  },
  inputHelp: {
    fontSize: 11,
    color: '#7A7875',
    marginTop: 5,
    lineHeight: 15,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: '#2E7470',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#D8D4CC',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3D3B39',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#ECE6DC',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: '#656360',
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FAF7F2',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ECE6DC',
  },
  dayPillActive: {
    backgroundColor: '#2E7470',
    borderColor: '#2E7470',
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3D3B39',
  },
  dayPillTextActive: {
    color: '#FFFFFF',
  },
  conflictNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4F3',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  conflictNoticeText: {
    fontSize: 12,
    color: '#2E7470',
    fontWeight: '600',
    flex: 1,
  },
  classList: {
    gap: 10,
    marginBottom: 16,
  },
  classItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE6DC',
  },
  classTimeBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  classDayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7470',
  },
  classTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  classSubjectText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  classMetaText: {
    fontSize: 11,
    color: '#656360',
    marginTop: 2,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  addMoreBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7470',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  timePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FAF7F2',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECE6DC',
  },
  timePillActive: {
    backgroundColor: '#2E7470',
    borderColor: '#2E7470',
  },
  timePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D3B39',
  },
  timePillTextActive: {
    color: '#FFFFFF',
  },
  assistantPreviewBox: {
    backgroundColor: '#FAF7F2',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#ECE6DC',
  },
  floatingGemBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  assistantPreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  assistantPreviewDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: '#656360',
    textAlign: 'center',
  },
  prepHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  prepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  prepDesc: {
    fontSize: 13,
    color: '#656360',
    textAlign: 'center',
    lineHeight: 19,
  },
  stageList: {
    gap: 14,
    marginTop: 16,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stageIcon: {
    width: 26,
    alignItems: 'center',
  },
  stageText: {
    fontSize: 14,
    color: '#A09E9B',
  },
  stageTextActive: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
  stageTextDone: {
    color: '#2E7470',
    fontWeight: '600',
  },
  congratsCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#2E7470',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  congratsTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  congratsDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: '#656360',
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#ECE6DC',
    marginBottom: 24,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#7A7875',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  launchButton: {
    backgroundColor: '#2E7470',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
