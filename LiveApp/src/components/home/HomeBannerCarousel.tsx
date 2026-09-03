import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { homeColors as colors, BannerSlide } from './homeTheme';

interface Props {
  banners: BannerSlide[];
  onCtaPress: () => void;
}

export const HomeBannerCarousel = ({ banners, onCtaPress }: Props) => {
  const { fs, sp, width, horizontalPadding } = useResponsive();
  const [activeIndex, setActiveIndex] = useState(0);
  const bannerWidth = width - horizontalPadding * 2;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        bannerScroll: {
          width: '100%',
          borderRadius: sp(16),
          marginBottom: sp(16),
        },
        bannerScrollContent: { alignItems: 'center' },
        banner: {
          width: bannerWidth,
          height: sp(200),
          borderRadius: sp(20),
          overflow: 'hidden',
          backgroundColor: colors.accentPurple,
          padding: sp(16),
          justifyContent: 'flex-end',
        },
        bannerImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' as const },
        bannerImagePlaceholder: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.accentPurple,
        },
        bannerLiveTag: {
          position: 'absolute',
          top: sp(16),
          right: sp(16),
          backgroundColor: colors.primary,
          borderRadius: sp(12),
          paddingHorizontal: sp(10),
          paddingVertical: sp(4),
        },
        bannerLiveTagText: { color: '#fff', fontSize: fs(11), fontWeight: '700' },
        bannerTextBlock: { maxWidth: '65%' },
        bannerTitle: {
          color: '#fff',
          fontSize: fs(28),
          fontWeight: '800',
          lineHeight: fs(32),
        },
        bannerSubtitle: {
          color: 'rgba(255,255,255,0.85)',
          fontSize: fs(13),
          marginTop: sp(8),
          marginBottom: sp(14),
        },
        bannerCta: {
          backgroundColor: colors.primary,
          alignSelf: 'flex-start',
          borderRadius: sp(24),
          paddingHorizontal: sp(20),
          paddingVertical: sp(10),
        },
        bannerCtaText: { color: '#fff', fontWeight: '700', fontSize: fs(14) },
        dotsRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: sp(6),
          marginTop: sp(10),
          marginBottom: sp(16),
        },
        dot: {
          width: sp(6),
          height: sp(6),
          borderRadius: sp(3),
          backgroundColor: colors.border,
        },
        dotActive: { backgroundColor: colors.primary, width: sp(16) },
      }),
    [fs, sp, bannerWidth]
  );

  return (
    <>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
          );
          setActiveIndex(idx);
        }}
        style={styles.bannerScroll}
        contentContainerStyle={styles.bannerScrollContent}
      >
        {banners.map((b) => (
          <View key={b.id} style={styles.banner}>
            {b.image ? (
              <Image source={{ uri: b.image }} style={styles.bannerImage} />
            ) : (
              <View style={styles.bannerImagePlaceholder} />
            )}
            <View style={styles.bannerLiveTag}>
              <Text style={styles.bannerLiveTagText}>🔴 LIVE</Text>
            </View>
            <View style={styles.bannerTextBlock}>
              <Text style={styles.bannerTitle}>{b.title}</Text>
              <Text style={styles.bannerSubtitle}>{b.subtitle}</Text>
              <TouchableOpacity style={styles.bannerCta} onPress={onCtaPress}>
                <Text style={styles.bannerCtaText}>{b.ctaLabel}  🔴</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dotsRow}>
        {banners.map((b, i) => (
          <View key={b.id} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </>
  );
};
