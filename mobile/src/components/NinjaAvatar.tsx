import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface NinjaAvatarProps {
  size?: 'small' | 'large';
  cgpa?: string;
  credits?: number;
  showBadges?: boolean;
  onPressCgpa?: () => void;
  onPressCredits?: () => void;
}

export const NinjaAvatar: React.FC<NinjaAvatarProps> = ({
  size = 'large',
  cgpa = '8.71',
  credits = 42,
  showBadges = true,
  onPressCgpa,
  onPressCredits,
}) => {
  const isLarge = size === 'large';
  const containerSize = isLarge ? 160 : 46;

  return (
    <View style={[styles.wrapper, { width: containerSize, height: containerSize }]}>
      {/* Top Left CGPA Badge */}
      {isLarge && showBadges && (
        <TouchableOpacity
          activeOpacity={onPressCgpa ? 0.7 : 1}
          onPress={onPressCgpa}
          disabled={!onPressCgpa}
          style={styles.cgpaBadge}
        >
          <Text style={styles.badgeNumber}>{cgpa}</Text>
          <Text style={styles.badgeLabel}>cgpa{onPressCgpa ? ' ✎' : ''}</Text>
        </TouchableOpacity>
      )}

      {/* Main Circular Avatar Body */}
      <View
        style={[
          styles.circleBase,
          {
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
          },
        ]}
      >
        {/* Sword on back */}
        <View style={[styles.sword, isLarge ? styles.swordLarge : styles.swordSmall]} />

        {/* Ninja Head */}
        <View style={[styles.ninjaHead, isLarge ? styles.headLarge : styles.headSmall]}>
          {/* Red Headband */}
          <View style={[styles.headband, isLarge ? styles.bandLarge : styles.bandSmall]} />
          {/* Skin Face Mask Opening */}
          <View style={[styles.faceOpening, isLarge ? styles.faceLarge : styles.faceSmall]} />
        </View>

        {/* Ninja Shoulders */}
        <View style={[styles.ninjaShoulders, isLarge ? styles.shoulderLarge : styles.shoulderSmall]} />
      </View>

      {/* Bottom Right Credits Badge */}
      {isLarge && showBadges && (
        <TouchableOpacity
          activeOpacity={onPressCredits ? 0.7 : 1}
          onPress={onPressCredits}
          disabled={!onPressCredits}
          style={styles.creditsBadge}
        >
          <Text style={styles.badgeNumber}>{credits}</Text>
          <Text style={styles.badgeLabel}>credits{onPressCredits ? ' ✎' : ''}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 2.5,
    borderColor: '#E5C4B0',
    borderRadius: 999,
    padding: 2,
    backgroundColor: '#F7F4EE',
  },
  circleBase: {
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
  },
  sword: {
    position: 'absolute',
    backgroundColor: '#92400E',
    transform: [{ rotate: '45deg' }],
  },
  swordLarge: {
    width: 14,
    height: 100,
    top: 15,
    left: 18,
    borderRadius: 4,
  },
  swordSmall: {
    width: 4,
    height: 30,
    top: 4,
    left: 4,
    borderRadius: 2,
  },
  ninjaHead: {
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    position: 'relative',
  },
  headLarge: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: -10,
  },
  headSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginBottom: -4,
  },
  headband: {
    backgroundColor: '#EF4444', // Red headband
    position: 'absolute',
    top: '22%',
    width: '100%',
  },
  bandLarge: {
    height: 12,
  },
  bandSmall: {
    height: 4,
  },
  faceOpening: {
    backgroundColor: '#FCD34D', // Skin tone
    borderRadius: 6,
    zIndex: 3,
  },
  faceLarge: {
    width: 38,
    height: 14,
    marginTop: 6,
  },
  faceSmall: {
    width: 12,
    height: 5,
    marginTop: 2,
  },
  ninjaShoulders: {
    backgroundColor: '#0F172A',
    width: '120%',
    zIndex: 1,
  },
  shoulderLarge: {
    height: 55,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  shoulderSmall: {
    height: 18,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cgpaBadge: {
    position: 'absolute',
    top: -6,
    left: -18,
    backgroundColor: '#D97706',
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0B0F15',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  creditsBadge: {
    position: 'absolute',
    bottom: -4,
    right: -14,
    backgroundColor: '#2563EB',
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0B0F15',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  badgeNumber: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 15,
  },
  badgeLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    fontSize: 9,
    textTransform: 'lowercase',
  },
});
