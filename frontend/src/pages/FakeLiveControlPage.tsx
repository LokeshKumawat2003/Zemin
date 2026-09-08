import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  IconButton,
  Input,
  Select,
  Textarea,
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
  videoDurationSeconds?: number;
  autoConvertToPrivate?: boolean;
  autoPrivateAfterSeconds?: number;
  autoPrivateEntryGiftId?: string;
  thumbnail?: string;
  category?: string;
  fakeComments?: unknown[];
  fakeGifts?: unknown[];
  stats?: ApiRecord;
  createdAt?: string;
  userId?: ApiRecord | string;
};

type GiftOption = { giftId: string; name: string; emoji?: string; coinCost?: number };

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

const secondsToTimeValue = (seconds: number | null) => {
  if (!seconds || seconds < 0) return "";
  const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${remainingSeconds}`;
};

const timeValueToSeconds = (value: string) => {
  const parts = value.split(":").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

const commentPresets = {
  welcome: [
    { name: "Maya", text: "Amazing live!", delaySeconds: 20 },
    { name: "Arjun", text: "Hello everyone", delaySeconds: 35 },
    { name: "Nina", text: "The video quality is great", delaySeconds: 50 },
  ],
  hype: [
    { name: "Leo", text: "This is so good!", delaySeconds: 15 },
    { name: "Sara", text: "Keep going", delaySeconds: 30 },
    { name: "Omar", text: "Who else is watching?", delaySeconds: 45 },
  ],
};

const giftPresets = {
  light: [
    { name: "Leo", giftId: "gift_rose", quantity: 1, delaySeconds: 40 },
    { name: "Maya", giftId: "gift_heart", quantity: 1, delaySeconds: 75 },
  ],
  celebration: [
    { name: "Nina", giftId: "gift_party", quantity: 1, delaySeconds: 30 },
    { name: "Arjun", giftId: "gift_fire", quantity: 2, delaySeconds: 60 },
  ],
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
    autoConvertToPrivate: false,
    autoPrivateAfterSeconds: "",
    autoPrivateEntryGiftId: "",
    fakeComments: "[]",
    fakeGifts: "[]",
  });
  const [commentPreset, setCommentPreset] = useState("");
  const [giftPreset, setGiftPreset] = useState("");
  const [giftCatalog, setGiftCatalog] = useState<GiftOption[]>([]);
  const [selectedGiftId, setSelectedGiftId] = useState("");
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [detectedVideoDuration, setDetectedVideoDuration] = useState<number | null>(null);
  const [durationStatus, setDurationStatus] = useState("");

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

  useEffect(() => {
    adminRequestWithMeta<unknown>(endpoint.giftCatalog)
      .then((response) => {
        const value = response.data as ApiRecord;
        const gifts = Array.isArray(value) ? value : Array.isArray(value?.gifts) ? value.gifts : [];
        setGiftCatalog(gifts as GiftOption[]);
      })
      .catch(() => setGiftCatalog([]));
  }, []);

  useEffect(() => {
    setVideoDuration(null);
    setDetectedVideoDuration(null);
    if (!form.videoUrl) {
      setDurationStatus("");
      return;
    }
    setDurationStatus("Reading video length...");
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const seconds = Number.isFinite(video.duration) ? Math.round(video.duration) : null;
      setDetectedVideoDuration(seconds);
      setVideoDuration(seconds);
      setDurationStatus(seconds ? `${Math.floor(seconds / 60)}m ${seconds % 60}s detected` : "Duration unavailable");
    };
    video.onerror = () => setDurationStatus("Could not read duration from this URL");
    video.src = form.videoUrl;
    return () => {
      video.onloadedmetadata = null;
      video.onerror = null;
      video.src = "";
    };
  }, [form.videoUrl]);

  const chooseCommentPreset = (value: string) => {
    setCommentPreset(value);
    setForm((current) => ({
      ...current,
      fakeComments: value ? JSON.stringify(commentPresets[value as keyof typeof commentPresets], null, 2) : "[]",
    }));
  };

  const chooseGiftPreset = (value: string) => {
    setGiftPreset(value);
    setForm((current) => ({
      ...current,
      fakeGifts: value ? JSON.stringify(giftPresets[value as keyof typeof giftPresets], null, 2) : "[]",
    }));
  };

  const chooseGift = (giftId: string) => {
    setSelectedGiftId(giftId);
    const gift = giftCatalog.find((item) => item.giftId === giftId);
    if (!gift) return;
    setForm((current) => ({
      ...current,
      fakeGifts: JSON.stringify([{ name: "Viewer", giftId: gift.giftId, giftName: gift.name, giftEmoji: gift.emoji || "🎁", coinCost: gift.coinCost || 0, quantity: 1, delaySeconds: 30 }], null, 2),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await adminRequestWithMeta(
        editingId ? endpoint.updateFakeLive(editingId) : endpoint.fakeLive,
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify({ ...form, videoDurationSeconds: videoDuration }),
        },
      );
      setForm({
        userId: "",
        title: "",
        videoUrl: "",
        thumbnail: "",
        category: "general",
        autoConvertToPrivate: false,
        autoPrivateAfterSeconds: "",
        autoPrivateEntryGiftId: "",
        fakeComments: "[]",
        fakeGifts: "[]",
      });
      setSelectedGiftId("");
      setVideoDuration(null);
      setDetectedVideoDuration(null);
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
      autoConvertToPrivate: Boolean(room.autoConvertToPrivate),
      autoPrivateAfterSeconds: room.autoPrivateAfterSeconds ? String(room.autoPrivateAfterSeconds) : "",
      autoPrivateEntryGiftId: String(room.autoPrivateEntryGiftId || ""),
      fakeComments: JSON.stringify(room.fakeComments || [], null, 2),
      fakeGifts: JSON.stringify(room.fakeGifts || [], null, 2),
    });
    setVideoDuration(room.videoDurationSeconds || null);
    setDetectedVideoDuration(room.videoDurationSeconds || null);
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
      autoConvertToPrivate: false,
      autoPrivateAfterSeconds: "",
      autoPrivateEntryGiftId: "",
      fakeComments: "[]",
      fakeGifts: "[]",
    });
    setVideoDuration(null);
    setDetectedVideoDuration(null);
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

  const maximumVideoDuration = detectedVideoDuration ?? videoDuration;
  const selectedConversionSeconds = Number(form.autoPrivateAfterSeconds) || videoDuration || 0;
  const conversionProgress = maximumVideoDuration
    ? Math.min(100, (selectedConversionSeconds / maximumVideoDuration) * 100)
    : 0;

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
          <FormControl gridColumn={{ md: "span 2" }}>
            <Checkbox
              isChecked={form.autoConvertToPrivate}
              onChange={(event) => setForm({ ...form, autoConvertToPrivate: event.target.checked })}
            >
              Automatically convert this public fake live to private
            </Checkbox>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Conversion runs on the server, even if this admin page is closed.
            </Text>
          </FormControl>
          {form.autoConvertToPrivate && (
            <>
              <FormControl>
                <FormLabel>Convert after</FormLabel>
                <Input
                  type="time"
                  step={1}
                  max={secondsToTimeValue(maximumVideoDuration)}
                  value={secondsToTimeValue(selectedConversionSeconds)}
                  onChange={(event) => {
                    const requestedSeconds = timeValueToSeconds(event.target.value);
                    const seconds = requestedSeconds === null
                      ? null
                      : maximumVideoDuration
                        ? Math.min(requestedSeconds, maximumVideoDuration)
                        : requestedSeconds;
                    setForm({ ...form, autoPrivateAfterSeconds: seconds === null ? "" : String(seconds) });
                  }}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Maximum: {secondsToTimeValue(maximumVideoDuration) || "waiting for video length"}.
                </Text>
                <Box mt={2} h="8px" bg="gray.100" borderRadius="full" overflow="hidden">
                  <Box h="100%" w={`${conversionProgress}%`} bg="brand.500" transition="width 0.2s" />
                </Box>
                <Text fontSize="xs" color="gray.600" mt={1}>
                  {secondsToTimeValue(selectedConversionSeconds) || "00:00:00"} / {secondsToTimeValue(maximumVideoDuration) || "00:00:00"}
                </Text>
              </FormControl>
              <FormControl>
                <FormLabel>New viewer entry gift</FormLabel>
                <Select
                  value={form.autoPrivateEntryGiftId}
                  onChange={(event) => setForm({ ...form, autoPrivateEntryGiftId: event.target.value })}
                >
                  <option value="">Choose entry gift</option>
                  {giftCatalog.map((gift) => (
                    <option key={gift.giftId} value={gift.giftId}>
                      {gift.emoji || "🎁"} {gift.name} ({gift.coinCost || 0} coins)
                    </option>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
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
            <Text fontSize="xs" color={durationStatus.includes("detected") ? "green.600" : "gray.500"} mt={1}>
              {durationStatus || "Paste a public video URL to detect its length."}
            </Text>
            <FormLabel mt={3}>Video length</FormLabel>
            <Input
              type="time"
              step={1}
              max={secondsToTimeValue(detectedVideoDuration)}
              value={secondsToTimeValue(videoDuration)}
              onChange={(event) => {
                const requestedSeconds = timeValueToSeconds(event.target.value);
                const seconds = requestedSeconds === null
                  ? null
                  : detectedVideoDuration
                    ? Math.min(requestedSeconds, detectedVideoDuration)
                    : requestedSeconds;
                setVideoDuration(seconds);
                if (seconds !== null && Number(form.autoPrivateAfterSeconds) > seconds) {
                  setForm({ ...form, autoPrivateAfterSeconds: String(seconds) });
                }
                setDurationStatus(seconds === null ? "Duration unavailable" : "Manual duration selected");
              }}
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              Video length: {secondsToTimeValue(detectedVideoDuration) || "not detected yet"}. You cannot select longer than the video.
            </Text>
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
          <FormControl gridColumn={{ md: "span 2" }}>
            <FormLabel>Fake comments JSON</FormLabel>
            <Select mb={2} value={commentPreset} onChange={(event) => chooseCommentPreset(event.target.value)}>
              <option value="">Select a comment preset</option>
              <option value="welcome">Welcome viewers</option>
              <option value="hype">High-energy comments</option>
            </Select>
            <Textarea minH="110px" fontFamily="mono" fontSize="sm" value={form.fakeComments} onChange={(event) => setForm({ ...form, fakeComments: event.target.value })} placeholder={'[{"name":"Maya","text":"Amazing live!","delaySeconds":20}]'} />
            <Text fontSize="xs" color="gray.500" mt={1}>Each comment repeats after its own delay in seconds.</Text>
          </FormControl>
          <FormControl gridColumn={{ md: "span 2" }}>
            <FormLabel>Fake gifts JSON</FormLabel>
            <Select mb={2} value={selectedGiftId} onChange={(event) => chooseGift(event.target.value)}>
              <option value="">Choose an app gift icon</option>
              {giftCatalog.map((gift) => <option key={gift.giftId} value={gift.giftId}>{gift.emoji || "🎁"} {gift.name} ({gift.coinCost || 0} coins)</option>)}
            </Select>
            <Select mb={2} value={giftPreset} onChange={(event) => chooseGiftPreset(event.target.value)}>
              <option value="">Select a gift preset</option>
              <option value="light">Light gifts</option>
              <option value="celebration">Celebration gifts</option>
            </Select>
            <Textarea minH="110px" fontFamily="mono" fontSize="sm" value={form.fakeGifts} onChange={(event) => setForm({ ...form, fakeGifts: event.target.value })} placeholder={'[{"name":"Leo","giftId":"rose","quantity":1,"delaySeconds":45}]'} />
            <Text fontSize="xs" color="gray.500" mt={1}>Fake gifts are display-only and never affect wallets, profit, or gift totals.</Text>
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
                  <Th width="110px">Length</Th>
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
                        <Td>{room.videoDurationSeconds ? `${Math.floor(room.videoDurationSeconds / 60)}m ${room.videoDurationSeconds % 60}s` : "-"}</Td>
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
