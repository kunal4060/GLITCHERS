import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Platform,
  Linking,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { designTokens } from '../theme/designTokens';
import { LabelCaps, NiaCard } from '../components/nia';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';

const C = designTokens.colors;
const APP_LOGO = require('../../assets/logo.png');

// L16: client ID comes from the environment so it can differ per build;
// the embedded value is only a fallback for local development.
const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '536972184941-i8lk8v0n5csl128mo12ougplo6bbf7ao.apps.googleusercontent.com';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, isLoading } = useAuthStore();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setIsRedirecting(true);

      // Determine returnUrl for OAuth callback redirect
      let returnUrl = 'http://localhost:8082';
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
        returnUrl = window.location.origin;
      } else {
        returnUrl = 'nexa://auth';
      }

      let googleAuthUrl: string | null = null;

      // 1. Try to fetch dynamic OAuth URL from backend
      try {
        const res = await apiClient.get<{ url: string }>(`/auth/google/url?returnUrl=${encodeURIComponent(returnUrl)}`);
        if (res?.url) {
          googleAuthUrl = res.url;
        }
      } catch (backendErr: any) {
        console.warn('Backend OAuth URL fetch delayed, using direct OAuth composition:', backendErr?.message);
      }

      // 2. Resilient Fallback: If backend is slow/cold, compose the exact OAuth URL directly
      if (!googleAuthUrl) {
        const clientId = GOOGLE_CLIENT_ID;
        const isLocalWeb = Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const redirectUri = isLocalWeb
          ? 'http://localhost:5000/api/auth/google/callback'
          : 'https://glitchers-backend.onrender.com/api/auth/google/callback';

        // Safe Base64 encoding of returnUrl for OAuth state
        let stateB64 = '';
        try {
          if (typeof btoa === 'function') {
            stateB64 = btoa(returnUrl);
          } else {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
            let output = '';
            for (let block = 0, charCode, i = 0, map = chars; returnUrl.charAt(i | 0) || ((map = '='), i % 1); output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))) {
              charCode = returnUrl.charCodeAt((i += 3 / 4));
              if (charCode > 0xff) throw new Error();
              block = (block << 8) | charCode;
            }
            stateB64 = output;
          }
        } catch {
          stateB64 = encodeURIComponent(returnUrl);
        }

        const scopes = [
          'openid',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/calendar.events',
        ].join(' ');

        googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&prompt=consent&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(stateB64)}&response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        // Wake up backend in background so it is warm when Google redirects
        apiClient.get('/health').catch(() => null);
      }

      // 3. Open Google OAuth Consent Page
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = googleAuthUrl;
        return;
      } else {
        await Linking.openURL(googleAuthUrl);
        return;
      }
    } catch (err: any) {
      console.warn('Google Sign-In Error:', err);
      const rawMsg = err?.message || '';
      const msg = rawMsg.toLowerCase().includes('abort')
        ? 'Connection timed out while opening Google login. Please tap again to retry.'
        : rawMsg || 'Unable to open Google Sign-In. Please check your network connection.';
      if (Platform.OS === 'web') {
        alert('Google Sign-In: ' + msg);
      } else {
        Alert.alert('Google Sign-In', msg);
      }
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleDirectDemoLogin = async () => {
    try {
      const emailToUse = customEmail.trim() || 'student@university.edu';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
        Alert.alert('Invalid email', 'Please enter a valid email address.');
        return;
      }
      let nameToUse = customName.trim();
      if (!nameToUse) {
        const prefix = emailToUse.split('@')[0];
        nameToUse = prefix
          .split(/[._-]/)
          .filter(Boolean)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' ') || 'Student User';
      }
      await loginWithGoogle(emailToUse, nameToUse);
    } catch (err: any) {
      Alert.alert('Login failed', err?.message || 'Could not sign in. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Top Header Badge */}
        <View style={styles.topSection}>
          <View style={styles.brandIconContainer}>
            <Image source={APP_LOGO} style={styles.brandLogo} resizeMode="cover" />
          </View>
          <Text style={styles.brandTitle}>NEXA</Text>
          <View style={styles.categoryPill}>
            <LabelCaps color={C.primaryDeep}>AI STUDENT COMPANION • POWERED BY NIA</LabelCaps>
          </View>
        </View>

        {/* Hero Value Card */}
        <NiaCard style={styles.heroCard}>
          <Text style={styles.heroTitle}>Your student life, organized intelligently.</Text>
          <Text style={styles.heroSubtitle}>
            Connect your Google account to bring your university email, class timetable, academic calendar, tasks, and daily expenses into one calm, private space.
          </Text>

          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <View style={styles.featureDot}>
                <Ionicons name="mail-outline" size={16} color={C.primaryDeep} />
              </View>
              <Text style={styles.featureText}>Smart summaries for university notices & deadlines</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureDot}>
                <Ionicons name="calendar-outline" size={16} color={C.primaryDeep} />
              </View>
              <Text style={styles.featureText}>Automated timetable & exam conflict detection</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureDot}>
                <Ionicons name="wallet-outline" size={16} color={C.primaryDeep} />
              </View>
              <Text style={styles.featureText}>Student budget tracking with bill OCR scanning</Text>
            </View>
          </View>
        </NiaCard>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <View style={styles.accountBox}>
            <LabelCaps>STUDENT ACCOUNT DETAILS</LabelCaps>
            <View style={[styles.accountInputRow, styles.accountInputRowBorder]}>
              <Ionicons name="person-outline" size={18} color={C.primaryDeep} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.accountTextInput}
                value={customName}
                onChangeText={setCustomName}
                placeholder="Your Full Name (e.g. Rahul Sharma)"
                placeholderTextColor={C.textMuted}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.accountInputRow}>
              <Ionicons name="mail-outline" size={18} color={C.primaryDeep} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.accountTextInput}
                value={customEmail}
                onChangeText={setCustomEmail}
                placeholder="Email (e.g. student@university.edu)"
                placeholderTextColor={C.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Primary Action: Continue with Google */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isLoading || isRedirecting}
            activeOpacity={0.88}
          >
            {isLoading || isRedirecting ? (
              <ActivityIndicator size="small" color={C.primaryDeep} />
            ) : (
              <>
                <View style={styles.googleIconBadge}>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Action: Direct Demo Sign-In */}
          <TouchableOpacity
            style={styles.directButton}
            onPress={handleDirectDemoLogin}
            disabled={isLoading || isRedirecting}
            activeOpacity={0.85}
          >
            <Ionicons name="school-outline" size={16} color={C.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.directButtonText}>Direct Demo Sign In (Offline)</Text>
          </TouchableOpacity>

          {/* Privacy note */}
          <View style={styles.securityNoteContainer}>
            <Ionicons name="shield-checkmark-outline" size={15} color={C.textSecondary} />
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

          {/* Ideation Credit */}
          <View style={styles.creditContainer}>
            <Text style={styles.creditText}>Ideated by Kartiki More</Text>
          </View>
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
                  <Ionicons name="close" size={24} color={C.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalParagraph}>
                  • <Text style={styles.bold}>Google Identity Only:</Text> Login only requests your basic identity to link your student profile.
                </Text>
                <Text style={styles.modalParagraph}>
                  • <Text style={styles.bold}>Service Scopes:</Text> Sign-in requests read-only access to your university email and calendar so NIA can summarize notices and sync deadlines. You can pause either service anytime from the Privacy screen.
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  container: {
    flexGrow: 1,
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
  brandLogo: {
    width: 68,
    height: 68,
    borderRadius: 18,
    shadowColor: C.primaryDeep,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: 2,
  },
  categoryPill: {
    marginTop: 6,
    backgroundColor: C.primaryPill,
    borderWidth: 1,
    borderColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.textPrimary,
    lineHeight: 28,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: C.textSecondary,
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
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.textPrimary,
    flex: 1,
  },
  actionSection: {
    alignItems: 'center',
    width: '100%',
  },
  accountBox: {
    width: '100%',
    backgroundColor: C.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  accountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountInputRowBorder: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.surfaceBorder,
    paddingBottom: 6,
  },
  accountTextInput: {
    flex: 1,
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '600',
    paddingVertical: 2,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceCard,
    borderWidth: 1.5,
    borderColor: C.surfaceBorder,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    ...designTokens.shadows.card,
    gap: 12,
  },
  googleIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
  },
  directButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    backgroundColor: C.surfaceSecondary,
    width: '100%',
  },
  directButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
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
    color: C.textSecondary,
  },
  privacyLink: {
    marginTop: 10,
    paddingVertical: 6,
  },
  privacyLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primaryDeep,
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
    backgroundColor: C.surfaceCard,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: C.surfaceBorder,
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
    color: C.textPrimary,
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalParagraph: {
    fontSize: 14,
    lineHeight: 22,
    color: C.textSecondary,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
    color: C.textPrimary,
  },
  modalCloseButton: {
    backgroundColor: C.primaryDeep,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  creditContainer: {
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.textMuted,
    letterSpacing: 0.5,
  },
});
