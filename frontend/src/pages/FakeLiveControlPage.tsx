import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  IconButton,
  Input,
  SimpleGrid,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { Copy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminRequestWithMeta, ApiRecord, endpoint } from "../api/adminApi";

type FakeRoom = ApiRecord & {
  _id?: string;
  id?: string;
  title?: string;
  status?: string;
  playbackType?: string;
  playbackUrl?: string;
  thumbnail?: string;
  category?: string;
  stats?: ApiRecord;
  createdAt?: string;
  userId?: ApiRecord | string;
};

const getRooms = (value: unknown): FakeRoom[] => {
  if (Array.isArray(value)) return value as FakeRoom[];
  if (!value || typeof value !== "object") return [];
  const record = value as ApiRecord;
  const nested = [
    record.rooms,
    record.liveRooms,
    record.liveStreams,
    record.items,
    record.results,
    record.data,
  ].find(Array.isArray);
  return Array.isArray(nested) ? (nested as FakeRoom[]) : [];
};

const idOf = (room: FakeRoom, index: number) =>
  String(room._id || room.id || index);
const hostName = (room: FakeRoom) => {
  if (room.userId && typeof room.userId === "object") {
    const host = room.userId as ApiRecord;
    return String(
      host.displayName || host.username || host._id || "Unknown host",
    );
  }
  return String(room.userId || "Unknown host");
};
const viewerCount = (room: FakeRoom) => {
  const stats = room.stats;
  return stats && typeof stats.currentViewers === "number"
    ? stats.currentViewers
    : 0;
};
const compactUrl = (value?: string) => {
  if (!value) return "-";
  if (value.length <= 34) return value;
  return `${value.slice(0, 16)}...${value.slice(-14)}`;
};

export const FakeLiveControlPage = () => {
  const [rooms, setRooms] = useState<FakeRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    userId: "",
    title: "",
    videoUrl: "",
    thumbnail: "",
    category: "general",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminRequestWithMeta<unknown>(
        endpoint.liveStreams,
      );
      setRooms(
        getRooms(response.data).filter((room) => room.playbackType === "video"),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load fake live streams.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await adminRequestWithMeta(
        editingId ? endpoint.updateFakeLive(editingId) : endpoint.fakeLive,
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(form),
        },
      );
      setForm({
        userId: "",
        title: "",
        videoUrl: "",
        thumbnail: "",
        category: "general",
      });
      setEditingId(null);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start fake live stream.",
      );
    } finally {
      setSaving(false);
    }
  };

  const editRoom = (room: FakeRoom, index: number) => {
    setEditingId(idOf(room, index));
    setForm({
      userId: typeof room.userId === "string" ? room.userId : "",
      title: String(room.title || ""),
      videoUrl: String(room.playbackUrl || ""),
      thumbnail: String(room.thumbnail || ""),
      category: String(room.category || "general"),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      userId: "",
      title: "",
      videoUrl: "",
      thumbnail: "",
      category: "general",
    });
  };

  const deleteRoom = async (roomId: string) => {
    if (!window.confirm("Delete this fake livestream permanently?")) return;
    setBusyId(roomId);
    setError("");
    try {
      await adminRequestWithMeta(endpoint.deleteFakeLive(roomId), {
        method: "DELETE",
      });
      if (editingId === roomId) cancelEdit();
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete fake live stream.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const setPlayback = async (roomId: string, action: "play" | "stop") => {
    setBusyId(roomId);
    setError("");
    try {
      await adminRequestWithMeta(
        action === "play"
          ? endpoint.playFakeLive(roomId)
          : endpoint.stopLive(roomId),
        {
          method: action === "play" ? "POST" : "DELETE",
          ...(action === "stop"
            ? { body: JSON.stringify({ reason: "Stopped by admin" }) }
            : {}),
        },
      );
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : `Unable to ${action} fake live stream.`,
      );
    } finally {
      setBusyId(null);
    }
  };

  const copyUrl = async (value: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedUrl(value);
    window.setTimeout(() => setCopiedUrl(""), 1600);
  };

  return (
    <VStack align="stretch" spacing={5}>
      <Box>
        <Heading size="lg">Fake Live Control</Heading>
        <Text color="gray.500" mt={2}>
          Start, stop, and replay video-backed live rooms from one admin
          section.
        </Text>
      </Box>
      {error && (
        <Alert status="error" borderRadius="8px">
          <AlertIcon />
          {error}
        </Alert>
      )}
      <Box
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="12px"
        p={5}
      >
        <Heading size="md">
          {editingId ? "Edit fake live" : "Create fake live"}
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
          <FormControl>
            <FormLabel>Host user ID</FormLabel>
            <Input
              value={form.userId}
              onChange={(event) =>
                setForm({ ...form, userId: event.target.value })
              }
              placeholder="MongoDB user ID"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Live title</FormLabel>
            <Input
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="Tonight's live"
            />
          </FormControl>
          <FormControl gridColumn={{ md: "span 2" }}>
            <FormLabel>Video URL</FormLabel>
            <Input
              value={form.videoUrl}
              onChange={(event) =>
                setForm({ ...form, videoUrl: event.target.value })
              }
              placeholder="https://cdn.example.com/live.mp4"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Thumbnail URL</FormLabel>
            <Input
              value={form.thumbnail}
              onChange={(event) =>
                setForm({ ...form, thumbnail: event.target.value })
              }
              placeholder="Optional"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Category</FormLabel>
            <Input
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
            />
          </FormControl>
        </SimpleGrid>
        <Button
          mt={4}
          colorScheme="brand"
          onClick={() => void save()}
          isLoading={saving}
        >
          {editingId ? "Save changes" : "Start video live"}
        </Button>
        {editingId && (
          <Button mt={4} ml={3} variant="outline" onClick={cancelEdit}>
            Cancel
          </Button>
        )}
      </Box>
      <Box
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="12px"
        overflow="hidden"
      >
        {loading ? (
          <Box minH="180px" display="grid" placeItems="center">
            <Spinner color="brand.500" />
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table minW="1180px" sx={{ tableLayout: "fixed" }}>
              <Thead bg="gray.50">
                <Tr>
                  <Th width="150px">Title</Th>
                  <Th width="130px">Host</Th>
                  <Th width="150px">Room ID</Th>
                  <Th width="100px">Category</Th>
                  <Th width="90px">Status</Th>
                  <Th width="80px" isNumeric>
                    Viewers
                  </Th>
                  <Th width="220px">Video URL</Th>
                  <Th width="220px">Thumbnail URL</Th>
                  <Th width="160px">Created</Th>
                  <Th width="220px">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rooms.length === 0 ? (
                  <Tr>
                    <Td colSpan={10} color="gray.500">
                      No fake live streams created yet.
                    </Td>
                  </Tr>
                ) : (
                  rooms.map((room, index) => {
                    const roomId = idOf(room, index);
                    const active = room.status === "live";
                    const videoUrl = String(room.playbackUrl || "");
                    const thumbnailUrl = String(room.thumbnail || "");
                    const urlCell = (value: string) =>
                      value ? (
                        <Flex align="center" gap={1} minW={0}>
                          <Tooltip label={value} placement="top">
                            <Text
                              noOfLines={1}
                              flex="1"
                              minW={0}
                              fontSize="xs"
                              color="gray.600"
                            >
                              {compactUrl(value)}
                            </Text>
                          </Tooltip>
                          <Tooltip
                            label={copiedUrl === value ? "Copied" : "Copy URL"}
                          >
                            <IconButton
                              aria-label="Copy URL"
                              icon={<Copy size={14} />}
                              size="xs"
                              variant="ghost"
                              onClick={() => void copyUrl(value)}
                            />
                          </Tooltip>
                        </Flex>
                      ) : (
                        <Text fontSize="xs" color="gray.400">
                          -
                        </Text>
                      );
                    return (
                      <Tr key={roomId}>
                        <Td
                          fontWeight="700"
                          whiteSpace="normal"
                          wordBreak="break-word"
                        >
                          {String(room.title || "Untitled room")}
                        </Td>
                        <Td whiteSpace="normal" wordBreak="break-word">
                          {hostName(room)}
                        </Td>
                        <Td fontSize="xs" wordBreak="break-all">
                          {roomId}
                        </Td>
                        <Td>{String(room.category || "general")}</Td>
                        <Td>
                          <Badge colorScheme={active ? "green" : "gray"}>
                            {String(room.status || "ended")}
                          </Badge>
                        </Td>
                        <Td isNumeric>{viewerCount(room).toLocaleString()}</Td>
                        <Td>{urlCell(videoUrl)}</Td>
                        <Td>{urlCell(thumbnailUrl)}</Td>
                        <Td whiteSpace="normal">
                          {room.createdAt
                            ? new Date(room.createdAt).toLocaleString()
                            : "-"}
                        </Td>
                        <Td verticalAlign="middle">
                          <Flex align="center" gap={2} wrap="wrap" minW="200px">
                            <Button size="sm" flexShrink={0} variant="outline" onClick={() => editRoom(room, index)}>
                              Edit
                            </Button>
                            {active ? (
                              <Button size="sm" flexShrink={0} colorScheme="red" isLoading={busyId === roomId} onClick={() => void setPlayback(roomId, "stop")}>
                                Stop
                              </Button>
                            ) : (
                              <Button size="sm" flexShrink={0} isLoading={busyId === roomId} onClick={() => void setPlayback(roomId, "play")}>
                                Play
                              </Button>
                            )}
                            <Button size="sm" flexShrink={0} colorScheme="red" variant="ghost" isLoading={busyId === roomId} onClick={() => void deleteRoom(roomId)}>
                              Delete
                            </Button>
                          </Flex>
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    </VStack>
  );
};

export default FakeLiveControlPage;
