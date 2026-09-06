import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppSelector } from '../../redux/hooks';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';
import { useResponsive } from '../../hooks/useResponsive';
import { useSearchDiscovery } from '../../hooks/useSearchDiscovery';
import { SearchInput } from '../../components/discover/SearchInput';
import { SearchDiscoveryContent } from '../../components/discover/SearchDiscoveryContent';
import { SearchResultsList } from '../../components/discover/SearchResultsList';
import { searchColors, searchStyles } from '../../components/discover/searchStyles';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'Search' | 'DiscoverMain'>;
const formatViewers = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}K` : `${value}`;

export const SearchScreen = ({ navigation }: Props) => {
  const user = useAppSelector(state => state.auth.user);
  const { fs } = useResponsive();
  const discovery = useSearchDiscovery(user || undefined);
  const { query, results, loading, recentSearches, popularTags, suggestedPeople, followedCreators, loadingDiscovery, search, clearAllRecent, toggleCreatorFollow, toggleFollow } = discovery;

  const handleResultPress = (item: any) => {
    if (item._type === 'creator') {
      navigation.navigate('CreatorProfile', { username: item.username });
    } else if (item._type === 'live') {
      navigation.navigate('LiveViewer', { roomId: item.id, title: item.title || item.displayName || 'Live now', hostName: item.displayName || item.username || 'Live host', hostId: item.hostId || item.id });
    }
  };

  return (
    <View style={searchStyles.container}>
      <SearchInput fs={fs} value={query} onChangeText={search} />
      {loading ? <ActivityIndicator color={searchColors.primary} style={{ marginTop: 24 }} /> : results ? (
        <SearchResultsList fs={fs} styles={searchStyles} results={results} query={query} followedCreators={followedCreators} onCreatorFollow={toggleCreatorFollow} onPress={handleResultPress} />
      ) : (
        <SearchDiscoveryContent fs={fs} styles={searchStyles} recentSearches={recentSearches} popularTags={popularTags} suggestedPeople={suggestedPeople} loadingDiscovery={loadingDiscovery} onSearch={search} onClearRecent={clearAllRecent} onFollow={toggleFollow} onPersonPress={username => navigation.navigate('CreatorProfile', { username })} formatViewers={formatViewers} />
      )}
    </View>
  );
};
