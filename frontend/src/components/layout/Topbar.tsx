import { Bell, ChevronDown, LogOut, Menu, Search } from "lucide-react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Select,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminRequest, adminRequestWithMeta, ApiRecord, endpoint } from "../../api/adminApi";
import { useAdminProfile } from "../../hooks/useAdminProfile";

import type { SidebarTab } from "./Sidebar";

/**
 * Topbar shows the current workspace context and the active admin profile.
 * It keeps global actions such as sign out and notifications in one place.
 */
type TopbarProps = {
  onOpen: () => void;
  role: string;
  activeTab?: SidebarTab;
  onRoleChange: (role: string) => void;
  onSignOut: () => void;
};

const getNotificationItems = (value: unknown): ApiRecord[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  const record = value as ApiRecord;
  const candidates = [record.notifications, record.items, record.results, record.docs, record.data];
  const nestedItems = candidates.find(Array.isArray);
  return Array.isArray(nestedItems) ? nestedItems as ApiRecord[] : [];
};

const isUnreadNotification = (item: ApiRecord) => item.isRead === false || item.read === false;
const currentDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());
const currentHour = new Date().getHours();
const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

export const Topbar = ({ onOpen, role, onSignOut }: TopbarProps) => {
  const { profile, adminUser, displayName, profileRole, loadingProfile, profileError, loadProfile } = useAdminProfile(role);
  const toast = useToast();
  const [notifications, setNotifications] = useState<ApiRecord[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [users, setUsers] = useState<ApiRecord[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [notificationType, setNotificationType] = useState("system");
  const [notificationTitle, setNotificationTitle] = useState("System update");
  const [notificationBody, setNotificationBody] = useState("Platform sync completed successfully.");
  const [sendPush, setSendPush] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<"user" | "selected" | "all">("user");
  const [notificationView, setNotificationView] = useState<"inbox" | "compose">("inbox");

  const unreadNotifications = useMemo(
    () => notifications.filter(isUnreadNotification),
    [notifications],
  );
  const readNotifications = useMemo(
    () => notifications.filter((item) => !isUnreadNotification(item)),
    [notifications],
  );
  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [user.username, user.displayName, user.email].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [userSearch, users]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await adminRequest<{ count: number }>(endpoint.unreadNotifications);
      setUnreadCount(Number(response?.count || 0));
    } catch (error) {
      console.error("Unable to load unread notification count", error);
      setUnreadCount(0);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationLoading(true);
    try {
      const response = await adminRequestWithMeta<unknown>(endpoint.notifications(1, 50));
      const items = getNotificationItems(response.data);
      setNotifications(items);
    } catch (error) {
      console.error("Unable to load notifications", error);
      setNotifications([]);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await adminRequestWithMeta<unknown>("/admin/users?page=1&limit=100");
      setUsers(getNotificationItems(response.data));
    } catch (error) {
      console.error("Unable to load users for notification", error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await Promise.all([loadNotifications(), loadUnreadCount()]);
  }, [loadNotifications, loadUnreadCount]);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await adminRequest(endpoint.markAllNotificationsRead, { method: "PUT" });
      await refreshNotifications();
    } catch (error) {
      console.error("Unable to mark notifications as read", error);
    }
  }, [refreshNotifications]);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await adminRequest(endpoint.markNotificationRead(id), { method: "PUT" });
      await refreshNotifications();
    } catch (error) {
      console.error("Unable to mark notification as read", error);
    }
  }, [refreshNotifications]);

  const sendDemoNotification = useCallback(async () => {
    if (!notificationTitle.trim() || !notificationBody.trim()) return;
    if (broadcastTarget !== "all" && selectedUserIds.length === 0) return;

    setSendingNotification(true);
    try {
      const dedupeKey = `${notificationType}-${Date.now()}`;
      const payload = {
        ...(broadcastTarget === "user" ? { userId: selectedUserIds[0] } : {}),
        ...(broadcastTarget === "selected" ? { userIds: selectedUserIds } : {}),
        ...(broadcastTarget === "all" ? { all: true } : {}),
        type: notificationType,
        title: notificationTitle,
        body: notificationBody,
        ...(broadcastTarget === "all" ? { dedupeKey } : {}),
        ...(broadcastTarget === "user" ? { data: { targetType: "user", targetId: selectedUserIds[0], action: "open_profile" } } : {}),
        sendPush,
      };

      const requestPath = broadcastTarget === "user" ? endpoint.sendNotification : endpoint.broadcastNotifications;
      await adminRequest(requestPath, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await refreshNotifications();
      setNotificationView("inbox");
      setNotificationTitle("System update");
      setNotificationBody("Platform sync completed successfully.");
      setSelectedUserIds([]);
      setUserSearch("");
      toast({
        title: "Notification sent",
        description: broadcastTarget === "all" ? "The notification was sent to all users." : "The notification was sent successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Unable to send notification", error);
      toast({
        title: "Notification failed",
        description: error instanceof Error ? error.message : "Unable to send the notification.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSendingNotification(false);
    }
  }, [broadcastTarget, notificationBody, notificationTitle, notificationType, refreshNotifications, selectedUserIds, sendPush, toast]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (notificationView === "compose" && broadcastTarget !== "all" && users.length === 0) void loadUsers();
  }, [broadcastTarget, loadUsers, notificationView, users.length]);

  return (
    <Flex
      as="header"
      height={{ base: "72px", md: "82px" }}
      position="sticky"
      top={0}
      zIndex={5}
      align="center"
      justify="space-between"
      px={{ base: 4, md: 8 }}
      borderBottom="1px solid"
      borderColor="gray.200"
      bg="white"
    >
      <HStack spacing={3} minW={0}>
        <IconButton
          aria-label="Open navigation"
          icon={<Icon as={Menu} />}
          variant="ghost"
          display={{ base: "flex", lg: "none" }}
          onClick={onOpen}
        />
        <Box display={{ base: "none", md: "block" }}>
          <Text fontSize="sm" color="gray.500">
            {currentDate}
          </Text>
          <Text fontSize="xl" fontWeight="800">
            {greeting}, {displayName}
          </Text>
        </Box>
        <Text display={{ base: "block", md: "none" }} fontWeight="800" fontSize="lg">
          Overview
        </Text>
      </HStack>

      <HStack spacing={{ base: 2, md: 5 }}>
        {/* <InputGroup display={{ base: "none", xl: "block" }} width="250px">
          <InputLeftElement>
            <Icon as={Search} color="gray.400" boxSize={4} />
          </InputLeftElement>
          <Input placeholder="Search workspace" size="sm" bg="gray.50" border="none" />
        </InputGroup> */}
        <Popover placement="bottom-end">
          <PopoverTrigger>
            <Box position="relative">
              <IconButton aria-label="Notifications" icon={<Icon as={Bell} />} variant="ghost" color="gray.600" />
              {unreadCount > 0 && (
                <Badge
                  position="absolute"
                  top="-4px"
                  right="-2px"
                  colorScheme="red"
                  borderRadius="full"
                  px={1.5}
                  fontSize="10px"
                >
                  {unreadCount}
                </Badge>
              )}
            </Box>
          </PopoverTrigger>
          <PopoverContent width="380px" boxShadow="lg">
            <PopoverArrow />
            <PopoverCloseButton />

            <PopoverHeader borderBottom="none" py={3}>
              <Flex align="center" justify="space-between" gap={2}>
                <Text fontWeight="700">Admin notifications</Text>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => void markAllNotificationsRead()}
                  isDisabled={unreadNotifications.length === 0}
                >
                  Read all
                </Button>
              </Flex>
            </PopoverHeader>

            <Box px={3} pb={3} borderBottom="1px solid" borderColor="gray.200">
              <HStack spacing={2} mb={3}>
                <Button
                  size="sm"
                  flex={1}
                  variant={notificationView === "inbox" ? "solid" : "ghost"}
                  colorScheme={notificationView === "inbox" ? "brand" : undefined}
                  onClick={() => setNotificationView("inbox")}
                >
                  Inbox ({unreadCount})
                </Button>
                <Button
                  size="sm"
                  flex={1}
                  variant={notificationView === "compose" ? "solid" : "ghost"}
                  colorScheme={notificationView === "compose" ? "brand" : undefined}
                  onClick={() => setNotificationView("compose")}
                >
                  Send new
                </Button>
              </HStack>

              {notificationView === "inbox" ? (
                <Text fontSize="xs" color="gray.500">
                  Review unread alerts and recent notification history.
                </Text>
              ) : null}
            </Box>

            {notificationView === "compose" && <Box px={3} py={3} borderBottom="1px solid" borderColor="gray.200">
              <VStack spacing={3} align="stretch">
                <Select size="sm" value={broadcastTarget} onChange={(event) => {
                  const target = event.target.value as "user" | "selected" | "all";
                  setBroadcastTarget(target);
                  setSelectedUserIds([]);
                  setUserSearch("");
                }}>
                  <option value="user">Send to one user</option>
                  <option value="selected">Send to selected users</option>
                  <option value="all">Send to all users</option>
                </Select>

                {broadcastTarget !== "all" && (
                  <FormControl>
                    <FormLabel fontSize="xs" mb={1}>
                      {broadcastTarget === "user" ? "Choose one user" : "Choose users"}
                    </FormLabel>
                    <Input
                      size="sm"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="Search username, name, or email"
                      mb={2}
                    />
                    <Box maxH="150px" overflowY="auto" border="1px solid" borderColor="gray.200" borderRadius="md" p={2}>
                      {usersLoading ? (
                        <Flex justify="center" py={3}><Spinner size="sm" color="brand.500" /></Flex>
                      ) : filteredUsers.length === 0 ? (
                        <Text fontSize="xs" color="gray.500">No users found.</Text>
                      ) : (
                        <VStack align="stretch" spacing={1}>
                          {filteredUsers.map((user, index) => {
                            const id = String(user.id || user._id || "");
                            if (!id) return null;
                            const label = String(user.displayName || user.username || user.email || id);
                            const detail = String(user.email || user.username || id);
                            return (
                              <Checkbox
                                key={id || index}
                                size="sm"
                                isChecked={selectedUserIds.includes(id)}
                                onChange={(event) => setSelectedUserIds((current) => event.target.checked
                                  ? broadcastTarget === "user" ? [id] : [...new Set([...current, id])]
                                  : current.filter((selectedId) => selectedId !== id))}
                              >
                                <Text fontSize="xs" fontWeight="600">{label}</Text>
                                <Text fontSize="10px" color="gray.500">{detail}</Text>
                              </Checkbox>
                            );
                          })}
                        </VStack>
                      )}
                    </Box>
                    <Text fontSize="10px" color="gray.500" mt={1}>
                      {selectedUserIds.length} user{selectedUserIds.length === 1 ? "" : "s"} selected
                    </Text>
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel fontSize="xs" mb={1}>Type</FormLabel>
                  <Select size="sm" value={notificationType} onChange={(event) => setNotificationType(event.target.value)}>
                    <option value="system">system</option>
                    <option value="report">report</option>
                    <option value="payment">payment</option>
                    <option value="payout">payout</option>
                    <option value="follow">follow</option>
                    <option value="like">like</option>
                    <option value="comment">comment</option>
                    <option value="gift">gift</option>
                    <option value="subscription">subscription</option>
                    <option value="live">live</option>
                    <option value="message">message</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" mb={1}>Title</FormLabel>
                  <Input size="sm" value={notificationTitle} onChange={(event) => setNotificationTitle(event.target.value)} />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" mb={1}>Body</FormLabel>
                  <Textarea size="sm" value={notificationBody} onChange={(event) => setNotificationBody(event.target.value)} rows={3} />
                </FormControl>

                <Checkbox size="sm" isChecked={sendPush} onChange={(event) => setSendPush(event.target.checked)}>
                  Send push notification
                </Checkbox>

                <Button
                  size="sm"
                  colorScheme="brand"
                  isLoading={sendingNotification}
                  onClick={() => void sendDemoNotification()}
                >
                  Send notification
                </Button>
              </VStack>
            </Box>}

            {notificationView === "inbox" && <PopoverBody maxH="320px" overflowY="auto" px={3} py={3}>
              {notificationLoading ? <Flex justify="center" py={4}><Spinner color="brand.500" /></Flex> : <VStack align="stretch" spacing={4}>
                <Box>
                  <Text fontSize="xs" fontWeight="800" color="red.500" mb={2}>UNREAD ({unreadNotifications.length})</Text>
                  <VStack align="stretch" spacing={2}>
                    {unreadNotifications.length === 0 ? <Text fontSize="sm" color="gray.500">You are all caught up.</Text> : unreadNotifications.map((item, index) => (
                      <Box key={String(item._id || `${item.title}-${index}`)} p={3} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.100" onClick={() => item._id && void markNotificationRead(String(item._id))} cursor={item._id ? "pointer" : "default"}>
                        <Text fontSize="sm" fontWeight="700">{String(item.title || item.type || "Admin update")}</Text>
                        <Text fontSize="xs" color="gray.600" mt={1}>{String(item.body || item.message || "New admin activity")}</Text>
                        <Text fontSize="xs" color="gray.400" mt={2}>{String(item.createdAt || item.time || "Just now")}</Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
                <Box>
                  <Text fontSize="xs" fontWeight="800" color="gray.500" mb={2}>READ ({readNotifications.length})</Text>
                  <VStack align="stretch" spacing={2}>
                    {readNotifications.length === 0 ? <Text fontSize="sm" color="gray.500">No read notifications yet.</Text> : readNotifications.map((item, index) => (
                      <Box key={String(item._id || `${item.title}-read-${index}`)} p={3} bg="white" borderRadius="md" border="1px solid" borderColor="gray.100">
                        <Text fontSize="sm" fontWeight="600">{String(item.title || item.type || "Admin update")}</Text>
                        <Text fontSize="xs" color="gray.600" mt={1}>{String(item.body || item.message || "Notification")}</Text>
                        <Text fontSize="xs" color="gray.400" mt={2}>{String(item.createdAt || item.time || "Just now")}</Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </VStack>}
            </PopoverBody>}
          </PopoverContent>
        </Popover>

        <Popover placement="bottom-end" onOpen={() => void loadProfile(true)}>
          <PopoverTrigger>
            <Button variant="ghost" rightIcon={<Icon as={ChevronDown} boxSize={4} />} display={{ base: "none", sm: "flex" }}>
              <Avatar size="xs" name={displayName} bg="coral" mr={2} />
              <Text fontSize="sm">{profileRole}</Text>
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader>
              <HStack>
                <Avatar size="sm" name={displayName} bg="coral" />
                <Box>
                  <Text fontWeight="800">{displayName}</Text>
                  <Text fontSize="xs" color="gray.500">Administrator profile</Text>
                </Box>
              </HStack>
            </PopoverHeader>
            <PopoverBody>
              <VStack align="stretch" spacing={4}>
                {loadingProfile ? <Flex justify="center" py={4}><Spinner color="brand.500" /></Flex> : profileError ? <Text color="red.500" fontSize="sm">{profileError}</Text> : profile && (
                  <SimpleGrid columns={2} spacing={3}>
                    <Box><Text fontSize="xs" color="gray.500">Email</Text><Text fontSize="sm" fontWeight="600" wordBreak="break-word">{String(adminUser?.email || "-")}</Text></Box>
                    <Box><Text fontSize="xs" color="gray.500">Role</Text><Text fontSize="sm" fontWeight="600">{profileRole}</Text></Box>
                    <Box><Text fontSize="xs" color="gray.500">Username</Text><Text fontSize="sm" fontWeight="600">{String(adminUser?.username || "-")}</Text></Box>
                    <Box><Text fontSize="xs" color="gray.500">Verified</Text><Text fontSize="sm" fontWeight="600">{adminUser?.isVerified ? "Yes" : "No"}</Text></Box>
                  </SimpleGrid>
                )}
                <Button size="sm" variant="outline" leftIcon={<Icon as={LogOut} boxSize={4} />} onClick={onSignOut}>Sign out</Button>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>

        <Popover placement="bottom-end" onOpen={() => void loadProfile(true)}>
          <PopoverTrigger>
            <IconButton
              aria-label="View admin profile"
              icon={<Avatar size="sm" name={displayName} bg="coral" />}
              variant="ghost"
              display={{ base: "flex", sm: "none" }}
            />
          </PopoverTrigger>
          <PopoverContent>
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverHeader>{displayName}</PopoverHeader>
            <PopoverBody>
              <VStack align="stretch">
                <Text fontSize="sm" color="gray.600">
                  {loadingProfile ? "Loading profile..." : String(adminUser?.email || "-")}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Role: {profileRole}
                </Text>
                <Button size="sm" leftIcon={<Icon as={LogOut} boxSize={4} />} onClick={onSignOut}>
                  Sign out
                </Button>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </HStack>
    </Flex>
  );
};
