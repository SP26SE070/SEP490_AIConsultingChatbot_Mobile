import { Image, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import AdaptiveIconAsset from '../../assets/adaptive-icon.png';

interface AppLogoProps {
  size?: number;
  tenantLogoUrl?: string | null;
  tenantName?: string | null;
}

export function AppLogo({ size = 40, tenantLogoUrl = null, tenantName = null }: AppLogoProps) {
  const [imageError, setImageError] = useState(false);

  const hasTenantLogo = tenantLogoUrl?.trim() && tenantLogoUrl.startsWith('http');

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {!imageError ? (
        <Image
          source={hasTenantLogo ? { uri: tenantLogoUrl } : AdaptiveIconAsset}
          style={styles.logo}
          resizeMode="contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.fallback, { width: size * 0.7, height: size * 0.7 }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '70%',
    height: '70%',
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
});
