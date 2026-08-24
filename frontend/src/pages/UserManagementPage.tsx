import { Alert, AlertIcon, Badge, Box, Button, Flex, Heading, HStack, IconButton, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Select, SimpleGrid, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useDisclosure, useToast } from "@chakra-ui/react";
import { Ban, Eye, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { adminRequest, adminRequestWithMeta, ApiRecord, endpoint } from "../api/adminApi";
import { ActionButton } from "../components/ui/ActionButton";
import { Pagination } from "../components/dashboard/Pagination";

type UserRecord = ApiRecord & { id?: string; _id?: string; username?: string; email?: string; displayName?: string; role?: string; isBanned?: boolean; banReason?: string | null; isVerified?: boolean; createdAt?: string; lastLoginAt?: string; stats?: ApiRecord };
type PaymentMethod = ApiRecord & { _id?: string; type?: string; label?: string; details?: ApiRecord; isDefault?: boolean };
const userId = (user: UserRecord) => String(user.id || user._id || "");
const getUsers = (data: unknown): UserRecord[] => Array.isArray(data) ? data.filter((item): item is UserRecord => Boolean(item && typeof item === "object")) : [];
const getPaymentMethods = (data: unknown): PaymentMethod[] => data && typeof data === "object" && Array.isArray((data as ApiRecord).paymentMethods) ? (data as ApiRecord).paymentMethods as PaymentMethod[] : [];
const dateValue = (value?: string) => value ? new Date(value).toLocaleDateString() : "-";
const detailValue = (value: unknown) => value === null || value === undefined || value === "" ? "-" : String(value);
const Detail = ({ label, value }: { label: string; value: unknown }) => <Box><Text fontSize="xs" color="gray.500" fontWeight="700" textTransform="uppercase">{label}</Text><Text mt={1} fontWeight="600" wordBreak="break-word">{detailValue(value)}</Text></Box>;

export const UserManagementPage = () => {
  const toast = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [banFilter, setBanFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [details, setDetails] = useState<unknown>(null);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const detailsModal = useDisclosure();

  const load = async (nextPage = page) => {
    setLoading(true); setError("");
    const query = new URLSearchParams({ page: String(nextPage), limit: "20" });
    if (search.trim()) query.set("search", search.trim());
    if (role) query.set("role", role);
    if (banFilter) query.set("isBanned", banFilter);
    try {
      const response = await adminRequestWithMeta<UserRecord[]>(`/admin/users?${query.toString()}`);
      setUsers(getUsers(response.data)); setPage(nextPage);
      const metaPages = response.meta?.totalPages;
      setTotalPages(typeof metaPages === "number" ? Math.max(1, metaPages) : 1);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load users."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(1); }, [role, banFilter]);

  const viewDetails = async (user: UserRecord) => {
    const id = userId(user); if (!id) return;
    setSelectedUser(user); setDetails(null); setPayments([]); detailsModal.onOpen();
    try { const [profile, paymentResponse] = await Promise.all([adminRequest(endpoint.user(id)), adminRequest(endpoint.paymentMethods(id))]); setDetails(profile); setPayments(getPaymentMethods(paymentResponse)); }
    catch (requestError) { setDetails({ error: requestError instanceof Error ? requestError.message : "Unable to load details." }); }
  };

  const toggleBan = async (user: UserRecord) => {
    const id = userId(user); if (!id) return;
    setActionId(id); setError("");
    try { if (user.isBanned) await adminRequest(endpoint.userUnban(id), { method: "PATCH" }); else await adminRequest(endpoint.userBan(id), { method: "PATCH", body: JSON.stringify({ reason: "Administrative review" }) }); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to update user access."); }
    finally { setActionId(""); }
  };

  const changeRole = async (user: UserRecord, nextRole: string) => {
    const id = userId(user); if (!id || !nextRole || nextRole === user.role) return;
    setActionId(id); setError("");
    try { await adminRequest(endpoint.userRole(id), { method: "PATCH", body: JSON.stringify({ role: nextRole }) }); toast({ title: "User role updated", status: "success", duration: 2500, isClosable: true }); await load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to update role."); }
    finally { setActionId(""); }
  };

  const deletePayment = async (method: PaymentMethod) => {
    if (!selectedUser || !method._id) return;
    setActionId(method._id);
    try { await adminRequest(endpoint.deletePaymentMethod(userId(selectedUser), method._id), { method: "DELETE" }); setPayments((current) => current.filter((item) => item._id !== method._id)); toast({ title: "Payment method deleted", status: "success", duration: 2500, isClosable: true }); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to delete payment method."); }
    finally { setActionId(""); }
  };

  return <VStack align="stretch" spacing={5}>
    <Flex justify="space-between" align={{ base: "start", sm: "center" }} direction={{ base: "column", sm: "row" }} gap={3}><Box><Heading size="lg">User management</Heading><Text color="gray.500" mt={1}>Review accounts, roles, and access status.</Text></Box><Button size="sm" variant="outline" leftIcon={<RefreshCw size={15} />} onClick={() => void load()} isLoading={loading}>Refresh</Button></Flex>
    <Flex as="form" onSubmit={(event) => { event.preventDefault(); void load(1); }} gap={3} wrap="wrap" bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" p={4} align="center"><Input placeholder="Search username, display name, or email" value={search} onChange={(event) => setSearch(event.target.value)} maxW={{ base: "full", md: "320px" }} h="42px" /><Select placeholder="All roles" value={role} onChange={(event) => setRole(event.target.value)} maxW={{ base: "full", sm: "160px" }} h="42px"><option value="fan">Fan</option><option value="creator">Creator</option><option value="moderator">Moderator</option><option value="admin">Admin</option></Select><Select placeholder="All access" value={banFilter} onChange={(event) => setBanFilter(event.target.value)} maxW={{ base: "full", sm: "160px" }} h="42px"><option value="false">Active</option><option value="true">Banned</option></Select><ActionButton type="submit">Search</ActionButton></Flex>
    {error && <Alert status="error" borderRadius="8px"><AlertIcon />{error}</Alert>}
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" overflow="hidden">{loading ? <Flex minH="220px" justify="center" align="center"><Spinner color="brand.500" /></Flex> : users.length === 0 ? <Text p={8} color="gray.500">No users match these filters.</Text> : <Box overflowX="auto"><Table minW="980px"><Thead bg="gray.50"><Tr><Th>Username</Th><Th>Display name</Th><Th>Email</Th><Th>Role</Th><Th>Access</Th><Th>Created</Th><Th>Actions</Th></Tr></Thead><Tbody>{users.map((user, index) => <Tr key={userId(user) || index}><Td fontWeight="700">{user.username || "-"}</Td><Td>{user.displayName || "-"}</Td><Td>{user.email || "-"}</Td><Td><Select size="sm" value={user.role || "fan"} onChange={(event) => void changeRole(user, event.target.value)} isDisabled={actionId === userId(user)} width="130px"><option value="fan">Fan</option><option value="creator">Creator</option><option value="moderator">Moderator</option><option value="admin">Admin</option></Select></Td><Td><Badge colorScheme={user.isBanned ? "red" : "green"}>{user.isBanned ? "Banned" : "Active"}</Badge></Td><Td color="gray.600">{dateValue(user.createdAt)}</Td><Td><HStack spacing={1}><IconButton aria-label="View user details" title="View user details" icon={<Eye size={16} />} size="sm" variant="ghost" onClick={() => void viewDetails(user)} /><IconButton aria-label={user.isBanned ? "Unban user" : "Ban user"} title={user.isBanned ? "Unban user" : "Ban user"} icon={user.isBanned ? <UserCheck size={16} /> : <Ban size={16} />} size="sm" variant="ghost" colorScheme={user.isBanned ? "green" : "red"} isLoading={actionId === userId(user)} onClick={() => void toggleBan(user)} /></HStack></Td></Tr>)}</Tbody></Table></Box>}</Box>
    <Pagination page={page} totalPages={totalPages} onPageChange={(nextPage) => void load(nextPage)} isLoading={loading} />
    <Modal isOpen={detailsModal.isOpen} onClose={detailsModal.onClose} size="xl"><ModalOverlay /><ModalContent><ModalHeader>{selectedUser?.displayName || selectedUser?.username || "User"} details</ModalHeader><ModalCloseButton /><ModalBody pb={6}>{details ? <VStack align="stretch" spacing={5}><Box><Flex justify="space-between" align="start" gap={3}><Box><Heading size="md">{detailValue((details as UserRecord).displayName || (details as UserRecord).username)}</Heading><Text color="gray.500">@{detailValue((details as UserRecord).username)}</Text></Box><HStack><Badge colorScheme={(details as UserRecord).isVerified ? "green" : "gray"}>{(details as UserRecord).isVerified ? "Verified" : "Unverified"}</Badge><Badge colorScheme={(details as UserRecord).isBanned ? "red" : "green"}>{(details as UserRecord).isBanned ? "Banned" : "Active"}</Badge></HStack></Flex><SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4} mt={5}><Detail label="Email" value={(details as UserRecord).email} /><Detail label="Role" value={(details as UserRecord).role} /><Detail label="Creator" value={(details as UserRecord).isCreator ? "Yes" : "No"} /><Detail label="Created" value={dateValue((details as UserRecord).createdAt)} /><Detail label="Last login" value={dateValue((details as UserRecord).lastLoginAt)} /><Detail label="User ID" value={(details as UserRecord)._id} /></SimpleGrid></Box><Box><Text fontWeight="800" mb={2}>Profile</Text><Box bg="gray.50" p={4} borderRadius="8px"><Text color="gray.700" whiteSpace="pre-wrap">{detailValue((details as UserRecord).bio || "No bio added.")}</Text></Box></Box><Box><Text fontWeight="800" mb={2}>Statistics</Text><SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}><Detail label="Posts" value={(details as UserRecord).stats?.posts} /><Detail label="Comments" value={(details as UserRecord).stats?.comments} /><Detail label="Account age" value={(details as UserRecord).stats?.accountAge ? `${(details as UserRecord).stats?.accountAge} days` : "-"} /></SimpleGrid></Box><Box><Text fontWeight="800" mb={2}>Settings</Text><SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}><Detail label="Language" value={((details as UserRecord).settings as ApiRecord | undefined)?.language} /><Detail label="Theme" value={((details as UserRecord).settings as ApiRecord | undefined)?.theme} /><Detail label="Profile visibility" value={((details as UserRecord).settings as ApiRecord | undefined)?.privacy && (((details as UserRecord).settings as ApiRecord).privacy as ApiRecord).profileVisibility} /><Detail label="Push notifications" value={((details as UserRecord).settings as ApiRecord | undefined)?.notifications && (((details as UserRecord).settings as ApiRecord).notifications as ApiRecord).push ? "Enabled" : "Disabled"} /></SimpleGrid></Box></VStack> : <Flex minH="120px" justify="center" align="center"><Spinner color="brand.500" /></Flex>}<Box><Text fontWeight="800" mb={2}>Bank and UPI payment methods</Text>{payments.length === 0 ? <Text color="gray.500" fontSize="sm">No saved payment methods.</Text> : <VStack align="stretch">{payments.map((method) => <Flex key={method._id} justify="space-between" align="center" p={3} border="1px solid" borderColor="gray.200" borderRadius="8px"><Box><Text fontWeight="700">{method.label || method.type || "Payment method"} {method.isDefault && <Badge ml={2} colorScheme="green">Default</Badge>}</Text><Text fontSize="sm" color="gray.600">{Object.entries(method.details || {}).map(([key, value]) => `${key}: ${String(value)}`).join(" | ") || "No details"}</Text></Box><IconButton aria-label="Delete payment method" title="Delete payment method" icon={<Trash2 size={15} />} size="sm" colorScheme="red" variant="ghost" isLoading={actionId === method._id} onClick={() => void deletePayment(method)} /></Flex>)}</VStack>}</Box></ModalBody></ModalContent></Modal>
  </VStack>;
};

export default UserManagementPage;