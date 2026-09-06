import { StyleSheet } from 'react-native';
import { typography } from '../../theme';
import { homeColors as colors } from './homeTheme';

type Props = {
  fs: (value: number) => number;
  sp: (value: number) => number;
  horizontalPadding: number;
  contentMaxWidth: number;
  isTablet: boolean;
};

export const createHomeFeedStyles = ({
  fs,
  sp,
  horizontalPadding,
  contentMaxWidth,
  isTablet,
}: Props) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contentWrap: {
      flex: 1,
      width: '100%',
      maxWidth: contentMaxWidth,
      alignSelf: 'center',
    },
    topBarFixed: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      backgroundColor: colors.background,
      overflow: 'hidden',
      alignItems: 'center',
    },
    topBarInner: { width: '100%', maxWidth: contentMaxWidth },
    list: { paddingHorizontal: horizontalPadding, paddingBottom: sp(40) },
    gridRow: {
      gap: sp(8),
      justifyContent: isTablet ? 'flex-start' : 'space-between',
    },
    empty: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: sp(60),
      fontSize: fs(16),
    },
    fab: {
      position: 'absolute',
      bottom: sp(24),
      right: sp(24),
      width: sp(56),
      height: sp(56),
      borderRadius: sp(28),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
    },
    fabText: {
      color: '#fff',
      fontSize: fs(28),
      fontWeight: '700',
      marginTop: -2,
    },
  });
