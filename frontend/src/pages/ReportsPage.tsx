import { Alert, AlertIcon, Badge, Box, Button, Flex, Heading, HStack, IconButton, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Select, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useDisclosure, useToast } from "@chakra-ui/react";
import { Check, Eye, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { adminRequest, adminRequestWithMeta, ApiRecord, endpoint } from "../api/adminApi";
import { ActionButton } from "../components/ui/ActionButton";
import { Pagination } from "../components/dashboard/Pagination";

type Reporter = { _id?: string; username?: string; displayName?: string; email?: string; role?: string; isVerified?: boolean };
type Report = ApiRecord & { _id?: string; description?: string; reason?: string; status?: string; targetId?: string; targetType?: string; createdAt?: string; updatedAt?: string; reporterId?: Reporter };
const reportRows = (data: unknown): Report[] => Array.isArray(data) ? data.filter((item): item is Report => Boolean(item && typeof item === "object")) : [];
const dateValue = (value?: string) => value ? new Date(value).toLocaleString() : "-";
const label = (value?: string) => value ? value.replace(/_/g, " ") : "-";
const statusColor = (status?: string) => status === "pending" ? "orange" : status === "resolved" ? "green" : "blue";

export const ReportsPage = () => {
  const toast = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [targetType, setTargetType] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const detailsModal = useDisclosure();

  const load = async (nextPage = page) => {
    setLoading(true); setError("");
    const query = new URLSearchParams({ page: String(nextPage), limit: "10" });
    try {
      const response = await adminRequestWithMeta<Report[]>(`${endpoint.reports()}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}${status ? `&status=${encodeURIComponent(status)}` : ""}${targetType ? `&targetType=${encodeURIComponent(targetType)}` : ""}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`);
      const filtered = reportRows(response.data).filter((report) => (!status || report.status === status) && (!targetType || report.targetType === targetType) && (!reason || report.reason === reason));
      setReports(filtered); setPage(nextPage);
      const metaPages = response.meta?.totalPages;
      setTotalPages(typeof metaPages === "number" ? Math.max(1, metaPages) : 1);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to load reports."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(1); }, [status, reason, targetType]);

  const updateReport = async (report: Report, action: "resolve" | "dismiss") => {
    if (!report._id) return;
    setActionId(report._id); setError("");
    try {
      await adminRequest(action === "resolve" ? endpoint.reportResolve(report._id) : endpoint.reportDismiss(report._id), { method: "PATCH", body: JSON.stringify(action === "resolve" ? { resolution: "Reviewed by administration" } : { reason: "Report dismissed after review" }) });
      toast({ title: action === "resolve" ? "Report resolved" : "Report dismissed", status: "success", duration: 2500, isClosable: true });
      await load();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to update report."); }
    finally { setActionId(""); }
  };

  return <VStack align="stretch" spacing={5}>
    <Flex justify="space-between" align={{ base: "start", sm: "center" }} direction={{ base: "column", sm: "row" }} gap={3}><Box><Heading size="lg">Reports</Heading><Text color="gray.500" mt={1}>Review community reports and moderation decisions.</Text></Box><Button size="sm" variant="outline" leftIcon={<RefreshCw size={15} />} onClick={() => void load()} isLoading={loading}>Refresh</Button></Flex>
    <Flex as="form" onSubmit={(event) => { event.preventDefault(); void load(1); }} gap={3} wrap="wrap" bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" p={4} align="center"><Input placeholder="Search report description" value={search} onChange={(event) => setSearch(event.target.value)} maxW={{ base: "full", md: "260px" }} h="42px" /><Select placeholder="All statuses" value={status} onChange={(event) => setStatus(event.target.value)} maxW={{ base: "full", sm: "160px" }} h="42px"><option value="pending">Pending</option><option value="reviewed">Reviewed</option><option value="resolved">Resolved</option></Select><Select placeholder="All targets" value={targetType} onChange={(event) => setTargetType(event.target.value)} maxW={{ base: "full", sm: "150px" }} h="42px"><option value="post">Post</option><option value="user">User</option><option value="live">Live</option><option value="message">Message</option></Select><Select placeholder="All reasons" value={reason} onChange={(event) => setReason(event.target.value)} maxW={{ base: "full", sm: "160px" }} h="42px"><option value="hate_speech">Hate speech</option><option value="fake_account">Fake account</option><option value="sexual_content">Sexual content</option><option value="nudity">Nudity</option><option value="copyright">Copyright</option><option value="scam">Scam</option><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="inappropriate">Inappropriate</option></Select><ActionButton type="submit">Search</ActionButton></Flex>
    {error && <Alert status="error" borderRadius="8px"><AlertIcon />{error}</Alert>}
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" overflow="hidden">{loading ? <Flex minH="220px" justify="center" align="center"><Spinner color="brand.500" /></Flex> : reports.length === 0 ? <Text p={8} color="gray.500">No reports match these filters.</Text> : <Box overflowX="auto"><Table minW="1050px"><Thead bg="gray.50"><Tr><Th>Report</Th><Th>Reporter</Th><Th>Reason</Th><Th>Target</Th><Th>Status</Th><Th>Created</Th><Th>Actions</Th></Tr></Thead><Tbody>{reports.map((report, index) => <Tr key={report._id || index}><Td maxW="300px"><Text fontWeight="700" noOfLines={2}>{report.description || "No description"}</Text><Text fontSize="xs" color="gray.400" mt={1}>{report._id || "-"}</Text></Td><Td><Text fontWeight="600">{report.reporterId?.displayName || report.reporterId?.username || "-"}</Text><Text fontSize="xs" color="gray.500">{report.reporterId?.email || "-"}</Text></Td><Td><Badge colorScheme="purple" textTransform="none">{label(report.reason)}</Badge></Td><Td><Badge colorScheme="gray" textTransform="none">{label(report.targetType)}</Badge><Text fontSize="xs" color="gray.500" mt={1}>{report.targetId || "-"}</Text></Td><Td><Badge colorScheme={statusColor(report.status)} textTransform="capitalize">{label(report.status)}</Badge></Td><Td whiteSpace="nowrap" color="gray.600">{dateValue(report.createdAt)}</Td><Td><HStack spacing={1}><IconButton aria-label="View report details" title="View report details" icon={<Eye size={16} />} size="sm" variant="ghost" onClick={() => { setSelectedReport(report); detailsModal.onOpen(); }} /><IconButton aria-label="Resolve report" title="Resolve report" icon={<Check size={16} />} size="sm" colorScheme="green" variant="ghost" isDisabled={report.status === "resolved" || actionId === report._id} isLoading={actionId === report._id} onClick={() => void updateReport(report, "resolve")} /><IconButton aria-label="Dismiss report" title="Dismiss report" icon={<X size={16} />} size="sm" colorScheme="red" variant="ghost" isDisabled={report.status === "resolved" || actionId === report._id} onClick={() => void updateReport(report, "dismiss")} /></HStack></Td></Tr>)}</Tbody></Table></Box>}</Box>
    <Pagination page={page} totalPages={totalPages} onPageChange={(nextPage) => void load(nextPage)} isLoading={loading} />
    <Modal isOpen={detailsModal.isOpen} onClose={detailsModal.onClose} size="lg"><ModalOverlay /><ModalContent><ModalHeader>Report details</ModalHeader><ModalCloseButton /><ModalBody pb={6}>{selectedReport && <VStack align="stretch" spacing={4}><Box><Text fontSize="xs" color="gray.500" fontWeight="700">DESCRIPTION</Text><Text mt={1}>{selectedReport.description || "No description"}</Text></Box><Flex gap={3} wrap="wrap"><Badge colorScheme={statusColor(selectedReport.status)}>{label(selectedReport.status)}</Badge><Badge colorScheme="purple">{label(selectedReport.reason)}</Badge><Badge>{label(selectedReport.targetType)}</Badge></Flex><SimpleDetail label="Reporter" value={`${selectedReport.reporterId?.displayName || selectedReport.reporterId?.username || "-"} (${selectedReport.reporterId?.email || "-"})`} /><SimpleDetail label="Target ID" value={String(selectedReport.targetId || "")} /><SimpleDetail label="Created" value={dateValue(selectedReport.createdAt)} /><SimpleDetail label="Updated" value={dateValue(selectedReport.updatedAt)} /></VStack>}</ModalBody></ModalContent></Modal>
  </VStack>;
};

const SimpleDetail = ({ label, value }: { label: string; value?: string }) => <Box><Text fontSize="xs" color="gray.500" fontWeight="700">{label.toUpperCase()}</Text><Text mt={1}>{value || "-"}</Text></Box>;