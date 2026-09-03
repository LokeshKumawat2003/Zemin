import { colors as baseColors } from '../../theme';

export const homeColors = {
  ...baseColors,
  background: '#0d0b10',
  surface: '#18151c',
  surfaceAlt: '#211d27',
  primary: '#ff2f6e',
  accentPurple: '#7c3aed',
  gold: '#f5b400',
  text: '#ffffff',
  textSecondary: '#9b95a3',
  border: '#2a2530',
};

export type CategoryTab = 'foryou' | 'vip' | 'live' | 'following' | 'new';

export interface StreamerCardData {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  verified: boolean;
  tagline: string;
  viewers: number;
  coinPrice: number;
  thumbnail?: string;
  isLive: boolean;
  source?: 'live' | 'feed';
}

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  image?: string;
}

export const CATEGORY_TABS: { key: CategoryTab; label: string }[] = [
  { key: 'foryou', label: 'For You' },
  { key: 'vip', label: '👑 VIP' },
];

export const formatViewers = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);
