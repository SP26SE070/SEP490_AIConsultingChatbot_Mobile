import { Image, StyleSheet, View } from 'react-native';
import { useState } from 'react';

const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/dhaltx1cv/image/upload/v1779854128/copy_of_uirfjb5hfsfz2xhbszik.png';

interface AppLogoProps {
  size?: number;
  tenantLogoUrl?: string | null;
  tenantName?: string | null;
}

export function AppLogo({ size = 40, tenantLogoUrl = null, tenantName = null }: AppLogoProps) {
  const [imageError, setImageError] = useState(false);
  const resolvedLogoUrl = tenantLogoUrl?.trim() || DEFAULT_LOGO_URL;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {!imageError ? (
        <Image
          source={{ uri: resolvedLogoUrl }}
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
