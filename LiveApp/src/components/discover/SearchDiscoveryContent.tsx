import Icon from '@react-native-vector-icons/material-icons';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { PopularTag, RecentSearch, SuggestedPerson } from '../../hooks/useSearchDiscovery';

type Props = {
  fs: (value: number) => number;
  styles: any;
  recentSearches: RecentSearch[];
  popularTags: PopularTag[];
  suggestedPeople: SuggestedPerson[];
  loadingDiscovery: boolean;
  onSearch: (value: string) => void;
  onClearRecent: () => void;
  onFollow: (person: SuggestedPerson) => void;
  onPersonPress: (username: string) => void;
  formatViewers: (value: number) => string;
};

export const SearchDiscoveryContent = ({ fs, styles, recentSearches, popularTags, suggestedPeople, loadingDiscovery, onSearch, onClearRecent, onFollow, onPersonPress, formatViewers }: Props) => (
  <ScrollView showsVerticalScrollIndicator={false}>
    {recentSearches.length > 0 && <View style={styles.section}>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent Searches</Text><TouchableOpacity onPress={onClearRecent}><Text style={styles.sectionLink}>Clear All</Text></TouchableOpacity></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {recentSearches.map(item => <TouchableOpacity key={item.id} style={styles.chip} onPress={() => onSearch(item.label)}><Icon name="history" size={fs(16)} color="#9b95a3" style={styles.chipIcon} /><Text style={styles.chipText}>{item.label}</Text></TouchableOpacity>)}
      </ScrollView>
    </View>}
    {popularTags.length > 0 && <View style={styles.section}>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Popular Tags</Text><Text style={styles.sectionLink}>See All</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
        {popularTags.map(tag => <TouchableOpacity key={tag.id} style={styles.tagCard} onPress={() => onSearch(tag.tag)}>{tag.image ? <Image source={{ uri: tag.image }} style={styles.tagImage} /> : <View style={[styles.tagImage, styles.tagImagePlaceholder]} />}<View style={styles.tagOverlay}><Text style={styles.tagLabel}>#{tag.tag}</Text><Text style={styles.tagCount}>{tag.count}</Text></View></TouchableOpacity>)}
      </ScrollView>
    </View>}
    <View style={styles.section}>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Suggested People</Text><Text style={styles.sectionLink}>See All</Text></View>
      {loadingDiscovery ? <ActivityIndicator color="#ff2f6e" style={{ marginTop: 24 }} /> : suggestedPeople.map((person, index) => <TouchableOpacity key={person.id} style={[styles.personRow, index === suggestedPeople.length - 1 && { borderBottomWidth: 0 }]} onPress={() => onPersonPress(person.username)}>
        <View style={styles.personAvatarWrap}>{person.avatar ? <Image source={{ uri: person.avatar }} style={styles.personAvatar} /> : <View style={[styles.personAvatar, styles.personAvatarPlaceholder]} />}{person.isLive && <View style={styles.personLiveTag}><Text style={styles.personLiveTagText}>LIVE</Text></View>}</View>
        <View style={styles.personInfo}><View style={styles.personNameRow}><Text style={styles.personName}>{person.displayName}</Text>{person.verified && <Icon name="verified" size={fs(15)} color="#ff2f6e" />}</View>{person.isLive && <View style={styles.personStatusRow}><View style={styles.personLiveBadge}><Text style={styles.personLiveBadgeText}>LIVE</Text></View><View style={styles.personViewers}><Icon name="visibility" size={fs(14)} color="#9b95a3" /><Text style={styles.personViewersText}>{formatViewers(person.viewers)}</Text></View></View>}{!!person.tagline && <Text style={styles.personTagline} numberOfLines={1}>{person.tagline}</Text>}</View>
        <TouchableOpacity style={[styles.followBtn, person.isFollowing && styles.followingBtn]} onPress={() => onFollow(person)}><Text style={[styles.followBtnText, person.isFollowing && styles.followingBtnText]}>{person.isFollowing ? 'Following' : 'Follow'}</Text></TouchableOpacity><Icon name="more-vert" size={fs(22)} color="#9b95a3" />
      </TouchableOpacity>)}
    </View>
  </ScrollView>
);
