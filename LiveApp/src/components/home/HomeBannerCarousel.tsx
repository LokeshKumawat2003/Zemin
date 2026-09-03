import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
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
          backgroundColor: '#170b2c',
        },
        bannerGlow: {
          position: 'absolute',
          width: sp(210),
          height: sp(210),
          borderRadius: sp(105),
          right: -sp(38),
          top: -sp(28),
          backgroundColor: '#5a176d',
          opacity: 0.8,
        },
        bannerGrid: {
          position: 'absolute',
          width: sp(240),
          height: sp(100),
          right: -sp(18),
          bottom: -sp(28),
          borderTopWidth: 1,
          borderColor: '#b42c9f',
          transform: [{ rotate: '-12deg' }],
          opacity: 0.65,
        },
        bannerMicStage: {
          position: 'absolute',
          right: sp(24),
          bottom: sp(10),
          width: sp(138),
          height: sp(138),
          borderRadius: sp(69),
          borderWidth: sp(2),
          borderColor: '#ff2fbe',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#ff2fbe',
          shadowOpacity: 0.8,
          shadowRadius: sp(16),
        },
        bannerMic: { transform: [{ rotate: '-10deg' }] },
        bannerSpark: { position: 'absolute', color: '#ff75d5' },
        bannerSparkOne: { right: sp(126), top: sp(28) },
        bannerSparkTwo: { right: sp(24), top: sp(82) },
        bannerImageShade: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(10, 5, 22, 0.22)',
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
        bannerLiveTagText: { color: '#fff', fontSize: fs(11), fontWeight: '700', marginLeft: sp(4) },
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
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.primary,
          alignSelf: 'flex-start',
          borderRadius: sp(24),
          paddingHorizontal: sp(20),
          paddingVertical: sp(10),
        },
        bannerCtaText: { color: '#fff', fontWeight: '700', fontSize: fs(14), marginRight: sp(8) },
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
              <>
                <View style={styles.bannerImagePlaceholder} />
                <View style={styles.bannerGlow} />
                <View style={styles.bannerGrid} />
                <View style={styles.bannerMicStage}>
                  <Icon name="mic" size={fs(78)} color="#ff4fba" style={styles.bannerMic} />
                </View>
                <Icon name="star" size={fs(18)} style={[styles.bannerSpark, styles.bannerSparkOne]} />
                <Icon name="favorite" size={fs(16)} style={[styles.bannerSpark, styles.bannerSparkTwo]} />
              </>
            )}
            {b.image && <View style={styles.bannerImageShade} />}
            <View style={styles.bannerLiveTag}>
              <Icon name="fiber-manual-record" size={fs(10)} color="#fff" />
              <Text style={styles.bannerLiveTagText}>LIVE</Text>
            </View>
            <View style={styles.bannerTextBlock}>
              <Text style={styles.bannerTitle}>{b.title}</Text>
              <Text style={styles.bannerSubtitle}>{b.subtitle}</Text>
              <TouchableOpacity style={styles.bannerCta} onPress={onCtaPress}>
                <Text style={styles.bannerCtaText}>{b.ctaLabel}</Text>
                <Icon name="sensors" size={fs(18)} color="#fff" />
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
