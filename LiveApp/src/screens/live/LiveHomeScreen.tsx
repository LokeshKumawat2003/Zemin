import React from 'react';
import { View, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LiveStackParamList } from '../../navigation/types';
import { LiveRoomSection } from '../../components/live/LiveRoomSection';
import { LiveStudioHeader } from '../../components/live/LiveStudioHeader';
import { LiveHomeRoomCard } from '../../components/live/LiveHomeRoomCard';
import { LiveHomeJoinModal } from '../../components/live/LiveHomeJoinModal';
import { LiveHomeCreateRoomCard } from '../../components/live/LiveHomeCreateRoomCard';
import { LiveHomeVipRoomCard } from '../../components/live/LiveHomeVipRoomCard';
import { styles } from './LiveHomeScreen.styles';
import { useLiveHomeScreen } from './useLiveHomeScreen';

type Props = NativeStackScreenProps<LiveStackParamList, 'LiveHome'>;

export const LiveHomeScreen = ({ navigation }: Props) => {
  const {
    cardWidth,
    userId,
    fs,
    liveRooms,
    vipRooms,
    streamMode,
    startMode,
    title,
    selectedGift,
    scheduledDate,
    loading,
    starting,
    joiningGift,
    selectedJoinRoom,
    myVipRooms,
    joinGiftEmoji,
    joinGiftCost,
    setTitle,
    setSelectedGift,
    setScheduledDate,
    setStreamMode,
    setStartMode,
    setSelectedJoinRoom,
    goLive,
    startScheduledVip,
    openVipJoin,
    payGiftAndJoin,
  } = useLiveHomeScreen(navigation);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LiveStudioHeader roomCount={vipRooms.length + liveRooms.length} />

        <LiveHomeCreateRoomCard
          streamMode={streamMode}
          startMode={startMode}
          title={title}
          setTitle={setTitle}
          selectedGift={selectedGift}
          setSelectedGift={setSelectedGift}
          scheduledDate={scheduledDate}
          setScheduledDate={setScheduledDate}
          starting={starting}
          onStreamModeChange={setStreamMode}
          onStartModeChange={setStartMode}
          onGoLive={goLive}
          fs={fs}
        />
{/* 
        <LiveRoomSection
          title="Top Live Now"
          countLabel={`${liveRooms.length} live`}
          loading={loading}
          isEmpty={liveRooms.length === 0}
          emptyTitle="No public rooms are live"
          emptySubtitle="Come back soon to find creators live now"
          style={styles.roomSection}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.liveGrid}
          >
            {liveRooms.map((item: any) => (
              <LiveHomeRoomCard
                key={String(item.id)}
                item={item}
                onPress={() =>
                  navigation.navigate('LiveViewer', {
                    roomId: String(item.id),
                    title: item.title,
                    hostName: item.host?.displayName || item.host?.username || 'Creator',
                    hostId: String(item.host?.id || ''),
                  })
                }
              />
            ))}
          </ScrollView>
        </LiveRoomSection> */}

        <LiveRoomSection
          title="VIP Rooms"
          countLabel={`${myVipRooms.length} scheduled`}
          loading={loading}
          isEmpty={myVipRooms.length === 0}
          emptyTitle="No scheduled VIP rooms"
          emptySubtitle="Your scheduled VIP rooms will appear here"
          style={styles.roomSection}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vipGrid}
          >
            {myVipRooms.map((item: any) => {
              const isMine = String(item.host?.id) === String(userId);
              const isLive = item.status === 'live';

              return (
                <LiveHomeVipRoomCard
                  key={String(item.id)}
                  item={item}
                  cardWidth={cardWidth}
                  isMine={isMine}
                  isLive={isLive}
                  starting={starting}
                  onPress={() => openVipJoin(item)}
                  onStart={() => startScheduledVip(item)}
                />
              );
            })}
          </ScrollView>
        </LiveRoomSection>
      </ScrollView>

      <LiveHomeJoinModal
        visible={!!selectedJoinRoom}
        room={selectedJoinRoom}
        joinGiftEmoji={joinGiftEmoji}
        joinGiftCost={joinGiftCost}
        joiningGift={joiningGift}
        onClose={() => setSelectedJoinRoom(null)}
        onJoin={payGiftAndJoin}
        fs={fs}
      />
    </View>
  );
};

