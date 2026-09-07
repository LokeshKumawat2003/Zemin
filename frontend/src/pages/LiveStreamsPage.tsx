import { Alert, AlertIcon, Badge, Box, Button, Flex, FormControl, FormLabel, Heading, Input, SimpleGrid, Spinner, Stat, StatLabel, StatNumber, Table, Tbody, Td, Text, Th, Thead, Tr, VStack } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import { adminRequestWithMeta, ApiRecord, endpoint } from "../api/adminApi";

type RoomRecord = ApiRecord & {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  status?: string;
  viewerCount?: number;
  viewers?: number;
  userId?: ApiRecord | string;
  host?: ApiRecord;
  creator?: ApiRecord;
  createdAt?: string;
  playbackType?: string;
};

const getRooms = (value: unknown): RoomRecord[] => {
  if (Array.isArray(value)) return value as RoomRecord[];
  if (!value || typeof value !== "object") return [];
  const record = value as ApiRecord;
  const nested = [record.rooms, record.liveRooms, record.liveStreams, record.items, record.results, record.data].find(Array.isArray);
  return Array.isArray(nested) ? nested as RoomRecord[] : [];
};

const roomId = (room: RoomRecord, index: number) => String(room._id || room.id || index);
const roomName = (room: RoomRecord) => String(room.title || room.name || room.roomName || "Untitled room");
const roomCode = (room: RoomRecord) => String(room._id || room.id || "-");
const roomHost = (room: RoomRecord): ApiRecord => {
  const host = room.userId || room.host || room.creator;
  if (host && typeof host === "object") return host as ApiRecord;
  return { _id: host || room.hostName || room.username || "-" };
};
const viewerCount = (room: RoomRecord) => Number(room.viewerCount ?? room.viewers ?? room.currentViewers ?? 0);
const displayDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export const LiveStreamsPage = () => {
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ userId: "", title: "", videoUrl: "", thumbnail: "", category: "general" });
  const [creating, setCreating] = useState(false);
  const [stoppingId, setStoppingId] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminRequestWithMeta<unknown>(endpoint.liveStreams);
      setRooms(getRooms(response.data));
    } catch (requestError) {
      setRooms([]);
      setError(requestError instanceof Error ? requestError.message : "Unable to load live rooms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRooms(); }, [loadRooms]);

  const createFakeStream = async () => {
    setCreating(true);
    setError("");
    try {
      await adminRequestWithMeta(endpoint.fakeLive, { method: "POST", body: JSON.stringify(form) });
      setForm({ userId: "", title: "", videoUrl: "", thumbnail: "", category: "general" });
      await loadRooms();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to start fake live stream.");
    } finally {
      setCreating(false);
    }
  };

  const playFakeStream = async (id: string) => {
    try {
      await adminRequestWithMeta(endpoint.playFakeLive(id), { method: "POST" });
      await loadRooms();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to play fake live stream.");
    }
  };

  const stopFakeStream = async (id: string) => {
    setStoppingId(id);
    setError("");
    try {
      await adminRequestWithMeta(endpoint.stopLive(id), {
        method: "DELETE",
        body: JSON.stringify({ reason: "Stopped by admin" }),
      });
      await loadRooms();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to stop fake live stream.");
    } finally {
      setStoppingId(null);
    }
  };

  const totalViewers = rooms.reduce((total, room) => total + viewerCount(room), 0);

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Heading size="lg">Live Streams</Heading>
        <Text color="gray.500" mt={2}>Monitor active rooms and viewer activity across the platform.</Text>
      </Box>

      {error && <Alert status="error" borderRadius="8px"><AlertIcon />{error}</Alert>}

      <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" p={5}>
        <Heading size="md">Start fake live video</Heading>
        <Text color="gray.500" mt={1} mb={4}>Choose the account viewers should see and provide a hosted MP4 or HLS URL.</Text>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <FormControl><FormLabel>Host user ID</FormLabel><Input value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} placeholder="MongoDB user ID" /></FormControl>
          <FormControl><FormLabel>Live title</FormLabel><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Tonight's live" /></FormControl>
          <FormControl gridColumn={{ md: "span 2" }}><FormLabel>Video URL</FormLabel><Input value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} placeholder="https://cdn.example.com/live.mp4" /></FormControl>
          <FormControl><FormLabel>Thumbnail URL</FormLabel><Input value={form.thumbnail} onChange={(event) => setForm({ ...form, thumbnail: event.target.value })} placeholder="Optional" /></FormControl>
          <FormControl><FormLabel>Category</FormLabel><Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></FormControl>
        </SimpleGrid>
        <Button mt={4} colorScheme="brand" onClick={() => void createFakeStream()} isLoading={creating}>Start video live</Button>
      </Box>
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
        <Stat bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" p={4}>
          <StatLabel>Active rooms</StatLabel>
          <StatNumber>{rooms.filter((room) => ["live", "waiting"].includes(String(room.status || "").toLowerCase())).length}</StatNumber>
        </Stat>
        <Stat bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" p={4}>
          <StatLabel>Current viewers</StatLabel>
          <StatNumber>{totalViewers.toLocaleString()}</StatNumber>
        </Stat>
        <Stat bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" p={4}>
          <StatLabel>Ended rooms</StatLabel>
          <StatNumber>{rooms.filter((room) => String(room.status || "").toLowerCase() === "ended").length}</StatNumber>
        </Stat>
        <Stat bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" p={4}>
          <StatLabel>Total rooms</StatLabel>
          <StatNumber>{rooms.length}</StatNumber>
        </Stat>
      </SimpleGrid>

      <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" overflow="hidden">
        {loading ? <Flex minH="220px" justify="center" align="center"><Spinner color="brand.500" /></Flex> : rooms.length === 0 ? (
          <Text p={8} color="gray.500">No live rooms are active right now.</Text>
        ) : <Box overflowX="auto"><Table minW="1260px" sx={{ tableLayout: "fixed" }}><Thead bg="gray.50"><Tr><Th width="220px">Room</Th><Th width="180px">Host ID</Th><Th width="150px">Display name</Th><Th width="130px">Username</Th><Th width="240px">Email</Th><Th width="100px">Status</Th><Th width="90px" isNumeric>Viewers</Th><Th width="140px">Source</Th><Th width="180px">Started</Th><Th width="180px">Action</Th></Tr></Thead><Tbody>{rooms.map((room, index) => { const host = roomHost(room); const id = roomId(room, index); const isFake = room.playbackType === "video"; return <Tr key={id}><Td whiteSpace="normal" wordBreak="break-word"><Text fontWeight="700">{roomName(room)}</Text><Text fontSize="xs" color="gray.500" mt={1} wordBreak="break-all">Room ID: {roomCode(room)}</Text></Td><Td fontSize="xs" color="gray.600" whiteSpace="normal" wordBreak="break-all">{String(host._id || host.id || "-")}</Td><Td whiteSpace="normal" wordBreak="break-word" fontWeight="600">{String(host.displayName || host.name || "-")}</Td><Td whiteSpace="normal" wordBreak="break-word">{String(host.username || "-")}</Td><Td fontSize="sm" whiteSpace="normal" wordBreak="break-word">{String(host.email || "-")}</Td><Td><Badge colorScheme={String(room.status || "live").toLowerCase() === "live" ? "green" : "gray"}>{String(room.status || "live")}</Badge></Td><Td isNumeric>{viewerCount(room).toLocaleString()}</Td><Td>{isFake ? "Fake video" : "LiveKit"}</Td><Td color="gray.600" whiteSpace="normal">{displayDate(room.createdAt)}</Td><Td>{isFake && room.status === "live" ? <Button size="sm" colorScheme="red" isLoading={stoppingId === id} onClick={() => void stopFakeStream(id)}>Stop</Button> : isFake ? <Button size="sm" onClick={() => void playFakeStream(id)}>Play</Button> : "-"}</Td></Tr>; })}</Tbody></Table></Box>}
      </Box>
    </VStack>
  );
};

export default LiveStreamsPage;
