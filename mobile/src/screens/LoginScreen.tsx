import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, isLoading } = useAuthStore();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleGoogleLogin = async () => {
    await loginWithGoogle('student@university.edu', 'Kunal Ugale');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF7F2" />
      <View style={styles.container}>
        {/* Top Header Badge */}
        <View style={styles.topSection}>
          <View style={styles.brandIconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={28} color="#2E7470" />
            </View>
          </View>
          <Text style={styles.brandTitle}>GLITCHERS</Text>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>AI STUDENT COMPANION</Text>
          </View>
        </View>

        {/* Hero Value Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Your student life, organized intelligently.</Text>
          <Text style={styles.heroSubtitle}>
            Connect your Google account to bring your university email, class timetable, academic calendar, tasks, and daily expenses into one calm, private space.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <View style={styles.featureDot}>
                <Ionicons name="mail-outline" size={16} color="#2E7470" />
              </View>
              <Text style={styles.featureText}>Smart summaries for university notices & deadlines</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureDot}>
                <Ionicons name="calendar-outline" size={16} color="#2E7470" />
              </View>
              <Text style={styles.featureText}>Automated timetable & exam conflict detection</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureDot}>
                <Ionicons name="wallet-outline" size={16} color="#2E7470" />
              </View>
              <Text style={styles.featureText}>Student budget tracking with bill OCR scanning</Text>
            </View>
          </View>
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          {/* Sole Login Action: Continue with Google */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#2E7470" />
            ) : (
              <>
                <View style={styles.googleIconBadge}>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Privacy note */}
          <View style={styles.securityNoteContainer}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#7A7875" />
            <Text style={styles.securityNoteText}>
              Your Google password is never stored by this app.
            </Text>
          </View>

          {/* Privacy & Security Link */}
          <TouchableOpacity
            style={styles.privacyLink}
            onPress={() => setShowPrivacyModal(true)}
          >
            <Text style={styles.privacyLinkText}>Privacy & Security details</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Details Modal */}
        <Modal
          visible={showPrivacyModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPrivacyModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Privacy & Data Protection</Text>
                <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                  <Ionicons name="close" size={24} color="#1A1A1A" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalParagraph}>
                  • <Text style={styles.bold}>Google Identity Only:</Text> Login only requests your basic identity to link your student profile.
                </Text>
                <Text style={styles.modalParagraph}>
                  • <Text style={styles.bold}>Explicit Service Scopes:</Text> University email and Google Calendar permissions are requested separately during onboarding. You can choose which services to link.
                </Text>
                <Text style={styles.modalParagraph}>
                  • <Text style={styles.bold}>Zero Ad Profiling:</Text> Your student data, grades, and emails are never sold, monetized, or shared with third-party advertisers.
                </Text>
                <Text style={styles.modalParagraph}>
                  • <Text style={styles.bold}>On-Device Privacy Option:</Text> GLICHERS includes an on-device Hugging Face offline AI engine that operates 100% locally on your phone when desired.
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPrivacyModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Understood</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 28,
  },
  topSection: {
    alignItems: 'center',
  },
  brandIconContainer: {
    marginBottom: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6F0EF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46, 116, 112, 0.2)',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 2,
  },
  categoryPill: {
    marginTop: 6,
    backgroundColor: '#F0ECE4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7470',
    letterSpacing: 1,
  },
  heroCard: {
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
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 28,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#656360',
    marginBottom: 20,
  },
  featureList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F8F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3D3B39',
    flex: 1,
  },
  actionSection: {
    alignItems: 'center',
    width: '100%',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D8D4CC',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  googleIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F6F3ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  securityNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  securityNoteText: {
    fontSize: 12,
    color: '#7A7875',
  },
  privacyLink: {
    marginTop: 10,
    paddingVertical: 6,
  },
  privacyLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7470',
    textDecorationLine: 'underline',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalParagraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4A4846',
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalCloseButton: {
    backgroundColor: '#2E7470',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
