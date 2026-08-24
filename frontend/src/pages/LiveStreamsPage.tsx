import { Alert, AlertIcon, Badge, Box, Flex, Heading, SimpleGrid, Spinner, Stat, StatLabel, StatNumber, Table, Tbody, Td, Text, Th, Thead, Tr, VStack } from "@chakra-ui/react";
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

  const totalViewers = rooms.reduce((total, room) => total + viewerCount(room), 0);

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Heading size="lg">Live Streams</Heading>
        <Text color="gray.500" mt={2}>Monitor active rooms and viewer activity across the platform.</Text>
      </Box>

      {error && <Alert status="error" borderRadius="8px"><AlertIcon />{error}</Alert>}

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Stat bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" p={4}>
          <StatLabel>Active rooms</StatLabel>
          <StatNumber>{rooms.length}</StatNumber>
        </Stat>
        <Stat bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" p={4}>
          <StatLabel>Current viewers</StatLabel>
          <StatNumber>{totalViewers.toLocaleString()}</StatNumber>
        </Stat>
        <Stat bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" p={4}>
          <StatLabel>Room status</StatLabel>
          <StatNumber>{rooms.length ? "Live" : "-"}</StatNumber>
        </Stat>
      </SimpleGrid>

      <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" overflow="hidden">
        {loading ? <Flex minH="220px" justify="center" align="center"><Spinner color="brand.500" /></Flex> : rooms.length === 0 ? (
          <Text p={8} color="gray.500">No live rooms are active right now.</Text>
        ) : <Box overflowX="auto"><Table minW="1050px" sx={{ tableLayout: "fixed" }}><Thead bg="gray.50"><Tr><Th width="220px">Room</Th><Th width="180px">Host ID</Th><Th width="150px">Display name</Th><Th width="130px">Username</Th><Th width="240px">Email</Th><Th width="100px">Status</Th><Th width="90px" isNumeric>Viewers</Th><Th width="180px">Started</Th></Tr></Thead><Tbody>{rooms.map((room, index) => { const host = roomHost(room); return <Tr key={roomId(room, index)}><Td whiteSpace="normal" wordBreak="break-word"><Text fontWeight="700">{roomName(room)}</Text><Text fontSize="xs" color="gray.500" mt={1} wordBreak="break-all">Room ID: {roomCode(room)}</Text></Td><Td fontSize="xs" color="gray.600" whiteSpace="normal" wordBreak="break-all">{String(host._id || host.id || "-")}</Td><Td whiteSpace="normal" wordBreak="break-word" fontWeight="600">{String(host.displayName || host.name || "-")}</Td><Td whiteSpace="normal" wordBreak="break-word">{String(host.username || "-")}</Td><Td fontSize="sm" whiteSpace="normal" wordBreak="break-word">{String(host.email || "-")}</Td><Td><Badge colorScheme={String(room.status || "live").toLowerCase() === "live" ? "green" : "gray"}>{String(room.status || "live")}</Badge></Td><Td isNumeric>{viewerCount(room).toLocaleString()}</Td><Td color="gray.600" whiteSpace="normal">{displayDate(room.createdAt)}</Td></Tr>; })}</Tbody></Table></Box>}
      </Box>
    </VStack>
  );
};

export default LiveStreamsPage;
