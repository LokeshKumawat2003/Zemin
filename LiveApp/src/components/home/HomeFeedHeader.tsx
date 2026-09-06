import { View } from 'react-native';
import { HomeCategoryTabs } from './HomeCategoryTabs';
import { HomeBannerCarousel } from './HomeBannerCarousel';
import { SectionHeader } from './SectionHeader';
import type { BannerSlide, CategoryTab } from './homeTheme';

type Props = { activeTab: CategoryTab; banners: BannerSlide[]; onTabPress: (tab: CategoryTab) => void; onCtaPress: () => void };

export const HomeFeedHeader = ({ activeTab, banners, onTabPress, onCtaPress }: Props) => (
  <View>
    <HomeCategoryTabs activeTab={activeTab} onTabPress={onTabPress} />
    <HomeBannerCarousel banners={banners} onCtaPress={onCtaPress} />
    <SectionHeader title="Live Now" />
  </View>
);
