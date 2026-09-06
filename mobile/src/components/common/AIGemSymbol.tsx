import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';

interface AIGemSymbolProps {
  size?: number;
  style?: ViewStyle;
}

export const AIGemSymbol: React.FC<AIGemSymbolProps> = ({ size = 56, style }) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={require('../../../assets/ai_gem_symbol.png')}
        style={[styles.gemImage, { width: size, height: size }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gemImage: {
    // Crisp rendering
  },
});
