import { useCallback, useEffect, useState } from 'react';
import { createMMKV } from 'react-native-mmkv';
import { creatorApi, liveApi, searchApi } from '../api';

export type RecentSearch = { id: string; label: string };
export type PopularTag = { id: string; tag: string; count: string; image?: string };
export type SuggestedPerson = { id: string; username: string; displayName: string; verified: boolean; isLive: boolean; viewers: number; tagline: string; avatar?: string; isFollowing?: boolean };

const recentSearchStorage = createMMKV({ id: 'search-recent-history' });
const RECENT_SEARCH_LIMIT = 5;

const getSavedRecentSearches = (): RecentSearch[] => {
  const raw = recentSearchStorage.getString('recent-searches');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_SEARCH_LIMIT) : [];
  } catch {
    return [];
  }
};

const saveRecentSearches = (items: RecentSearch[]) => recentSearchStorage.set('recent-searches', JSON.stringify(items.slice(0, RECENT_SEARCH_LIMIT)));

export const useSearchDiscovery = (user?: { id?: string; username?: string }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(getSavedRecentSearches());
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [suggestedPeople, setSuggestedPeople] = useState<SuggestedPerson[]>([]);
  const [followedCreators, setFollowedCreators] = useState<Record<string, boolean>>({});
  const [loadingDiscovery, setLoadingDiscovery] = useState(true);

  const loadDiscovery = useCallback(async () => {
    setLoadingDiscovery(true);
    try {
      setRecentSearches(getSavedRecentSearches());
      setPopularTags([
        { id: '1', tag: 'live', count: 'Now streaming' },
        { id: '2', tag: 'gaming', count: 'Trending' },
        { id: '3', tag: 'music', count: 'Hot right now' },
        { id: '4', tag: 'fashion', count: 'Fresh creators' },
      ]);
      const [liveRes] = await Promise.all([
        liveApi.getActive().catch(() => ({ data: [] })),
        creatorApi.getProfile(user?.username || '').catch(() => ({ data: null })),
      ]);
      const suggested = (Array.isArray(liveRes?.data) ? liveRes.data : [])
        .map((room: any, index: number) => ({
          id: room.userId?._id || room.hostId || room.id || `live-${index}`,
          username: room.userId?.username || room.host?.username || room.username || '',
          displayName: room.userId?.displayName || room.host?.displayName || room.title || 'Live Creator',
          verified: Boolean(room.userId?.isVerified || room.host?.isVerified),
          isLive: true,
          viewers: room.viewerCount || room.stats?.currentViewers || 0,
          tagline: room.title || 'Live now',
          avatar: room.userId?.avatar || room.host?.avatar || room.thumbnail || undefined,
          isFollowing: false,
        }))
        .filter((item: SuggestedPerson) => item.username)
        .filter((item: SuggestedPerson) => String(user?.id) !== String(item.id) && user?.username?.toLowerCase() !== item.username.toLowerCase())
        .slice(0, 4);
      setSuggestedPeople(suggested.length ? suggested : [{ id: 'fallback-live', username: 'live-now', displayName: 'Live creators', verified: false, isLive: true, viewers: 1200, tagline: 'Join the most active rooms', isFollowing: false }]);
    } catch {
      setSuggestedPeople([]);
    } finally {
      setLoadingDiscovery(false);
    }
  }, [user?.id, user?.username]);

  useEffect(() => { void loadDiscovery(); }, [loadDiscovery]);

  const addRecentSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setRecentSearches(previous => {
      const next = [{ id: `${Date.now()}-${trimmed}`, label: trimmed }, ...previous.filter(item => item.label.toLowerCase() !== trimmed.toLowerCase())].slice(0, RECENT_SEARCH_LIMIT);
      saveRecentSearches(next);
      return next;
    });
  }, []);

  const search = async (value: string) => {
    const trimmed = value.trim();
    setQuery(trimmed);
    if (trimmed.length < 2) { setResults(null); return; }
    addRecentSearch(trimmed);
    setLoading(true);
    try {
      const response = await searchApi.search(value);
      const payload = response?.data || { creators: [], posts: [], live: [] };
      const isCurrentUser = (item: any) => {
        const id = item.id || item.userId || item.hostId || item.user?._id;
        const username = item.username || item.user?.username;
        return (user?.id && id && String(user.id) === String(id)) || (user?.username && username && user.username.toLowerCase() === String(username).toLowerCase());
      };
      setResults({ creators: Array.isArray(payload.creators) ? payload.creators.filter((item: any) => !isCurrentUser(item)) : [], posts: Array.isArray(payload.posts) ? payload.posts : [], live: Array.isArray(payload.live) ? payload.live.filter((item: any) => !isCurrentUser(item)) : [] });
    } catch {
      setResults({ creators: [], posts: [], live: [] });
    } finally { setLoading(false); }
  };

  const clearAllRecent = () => { setRecentSearches([]); saveRecentSearches([]); };
  const toggleCreatorFollow = async (id: string, currentlyFollowing: boolean) => {
    setFollowedCreators(previous => ({ ...previous, [id]: !currentlyFollowing }));
    try { currentlyFollowing ? await creatorApi.unfollow(id) : await creatorApi.follow(id); }
    catch { setFollowedCreators(previous => ({ ...previous, [id]: currentlyFollowing })); }
  };
  const toggleFollow = async (person: SuggestedPerson) => {
    setSuggestedPeople(previous => previous.map(item => item.id === person.id ? { ...item, isFollowing: !item.isFollowing } : item));
    try { person.isFollowing ? await creatorApi.unfollow(person.id) : await creatorApi.follow(person.id); }
    catch { setSuggestedPeople(previous => previous.map(item => item.id === person.id ? { ...item, isFollowing: person.isFollowing } : item)); }
  };

  return { query, results, loading, recentSearches, popularTags, suggestedPeople, followedCreators, loadingDiscovery, search, clearAllRecent, toggleCreatorFollow, toggleFollow };
};
