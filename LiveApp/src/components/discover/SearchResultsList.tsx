import Icon from '@react-native-vector-icons/material-icons';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';

type Props = { fs: (value: number) => number; styles: any; results: any; query: string; followedCreators: Record<string, boolean>; onCreatorFollow: (id: string, following: boolean) => void; onPress: (item: any) => void };

export const SearchResultsList = ({ fs, styles, results, query, followedCreators, onCreatorFollow, onPress }: Props) => {
    const data = [...(results.creators || []).map((item: any) => ({ ...item, _type: 'creator' })), ...(results.posts || []).map((item: any) => ({ ...item, _type: 'post' })), ...(results.live || []).map((item: any) => ({ ...item, _type: 'live' }))];
    return <FlatList data={data} keyExtractor={(item, index) => `${item._type}-${item.id || index}`} contentContainerStyle={{ paddingHorizontal: 16 }} renderItem={({ item }) => {
        const following = followedCreators[item.id] ?? item.isFollowing ?? false;
        const live = item._type === 'live' || item.isLive;
        const avatar = item.avatar || item.avatarUrl || item.imageUrl;
        return <TouchableOpacity style={styles.resultCard} onPress={() => onPress(item)}><View style={styles.resultRow}><View style={styles.resultAvatarWrap}>{avatar ? <Image source={{ uri: avatar }} style={styles.resultAvatar} /> : <View style={styles.resultAvatarPlaceholder}><Text style={styles.resultAvatarInitial}>{(item.displayName || item.username || 'U').charAt(0).toUpperCase()}</Text></View>}{live && <View style={styles.resultLiveTag}><Text style={styles.resultLiveTagText}>LIVE</Text></View>}</View><View style={styles.resultDetails}><View style={styles.resultNameRow}><Text style={styles.resultTitle} numberOfLines={1}>{item.displayName || item.username || item.title || item.caption?.slice(0, 50)}</Text>{item._type === 'creator' && item.verified && <Icon name="verified" size={fs(15)} color="#ff2f6e" />}</View>{item._type === 'creator' ? <Text style={styles.resultMeta} numberOfLines={1}>@{item.username} {live ? `• ${item.viewers || 0} viewers` : ''}</Text> : <Text style={styles.resultSnippet} numberOfLines={2}>{item.caption || item.title || ''}</Text>}</View>{item._type === 'creator' && <TouchableOpacity style={[styles.followBtn, following && styles.followingBtn]} onPress={() => onCreatorFollow(item.id, following)}><Text style={[styles.followBtnText, following && styles.followingBtnText]}>{following ? 'Following' : 'Follow'}</Text></TouchableOpacity>}</View></TouchableOpacity>;
    }} ListEmptyComponent={<Text style={styles.empty}>No results for "{query}"</Text>} />;
};
