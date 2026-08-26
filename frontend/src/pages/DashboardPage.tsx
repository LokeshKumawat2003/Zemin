import { Box, Button, Flex, Heading, SimpleGrid, Text, useDisclosure } from "@chakra-ui/react";
import { Activity, Check, CheckCircle2, Clock3, Eye, Plus, RotateCcw, ShieldCheck, Trash2, UserX, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActivityTable } from "../components/dashboard/ActivityTable";
import { Sidebar } from "../components/layout/Sidebar";
import type { SidebarTab } from "../components/layout/Sidebar";
import { StatCard } from "../components/dashboard/StatCard";
import { Topbar } from "../components/layout/Topbar";
import { AdminDataPage } from "./AdminDataPage";
import AnalyticsPage from "./AnalyticsView";
import { ReportsPage } from "./ReportsPage";
import PaymentsPage from "./PaymentsView";
import PayoutsPage from "./PayoutsView";
import { ChatManagementPage } from "./ChatManagementPage";
import AdminResourcePage from "./AdminResourceView";
import UserManagementPage from "./UserManagementView";
import LiveStreamsPage from "./LiveStreamsView";
import { endpoint } from "../api/adminApi";

export const DashboardPage = () => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const navigate = useNavigate();
    const [role, setRole] = useState("Administrator");
    const [activeTab, setActiveTab] = useState<SidebarTab>("Analytics");
    const roleDescription = role === "Administrator"
        ? "Organization-wide health, compliance, and delivery at a glance."
        : "Team delivery, workload, and project health at a glance.";
    const signOut = () => {
        localStorage.removeItem("adminToken");
        navigate("/login", { replace: true });
    };
    const page = activeTab === "Users"
        ? <UserManagementPage />
        : activeTab === "Creators"
            ? <AdminResourcePage title="Creators" description="Review creator verification, live status, and earnings." endpoint={(page: number, limit: number, filters: Record<string, string>) => `${endpoint.creators(page, limit)}&search=${encodeURIComponent(filters.search || "")}${filters.verificationStatus ? `&verificationStatus=${filters.verificationStatus}` : ""}${filters.isLive ? `&isLive=${filters.isLive}` : ""}`} columns={["userId", "verificationStatus", "isLive", "totalEarnings", "availableBalance", "stats"]} filters={[{ key: "verificationStatus", label: "Verification status", options: ["pending", "approved", "rejected"] }, { key: "isLive", label: "Live status", options: ["true", "false"] }]} actions={[{ label: "Approve creator", icon: Check, path: (row) => endpoint.creatorApprove(String(row._id || row.id)), body: {} }, { label: "Reject creator", icon: X, path: (row) => endpoint.creatorReject(String(row._id || row.id)), body: { reason: "Identity verification failed" }, colorScheme: "red" }, { label: "Suspend creator", icon: UserX, path: (row) => endpoint.creatorSuspend(String(row._id || row.id)), body: { reason: "Policy review required" }, colorScheme: "orange" }]} />
            : activeTab === "Reports"
                ? <ReportsPage />
                : activeTab === "Payments"
                    ? <PaymentsPage />
                    : activeTab === "Payouts"
                        ? <PayoutsPage />
                        : activeTab === "Chat Management"
                            ? <ChatManagementPage />
                            : activeTab === "Posts"
                                ? <AdminResourcePage title="Posts" description="Review published content and visibility status." endpoint={(page: number, limit: number, filters: Record<string, string>) => `${endpoint.contentPosts(page, limit)}&search=${encodeURIComponent(filters.search || "")}${filters.visibility ? `&visibility=${filters.visibility}` : ""}${filters.isDeleted ? `&isDeleted=${filters.isDeleted}` : ""}`} columns={["_id", "userId", "caption", "visibility", "isDeleted", "createdAt"]} filters={[{ key: "visibility", label: "Visibility", options: ["public", "private"] }, { key: "isDeleted", label: "Deleted", options: ["true", "false"] }]} actions={[{ label: "Hide post", icon: Eye, path: (row) => endpoint.postHide(String(row._id || row.id)), body: { reason: "Policy violation" }, colorScheme: "orange", disabled: (row) => row.isDeleted === true }, { label: "Restore post", icon: RotateCcw, path: (row) => endpoint.postRestore(String(row._id || row.id)), body: {}, colorScheme: "green", disabled: (row) => row.isDeleted !== true }]} />
                                : activeTab === "Comments"
                                    ? <AdminResourcePage title="Comments" description="Review comments and restore removed content." endpoint={(page: number, limit: number, filters: Record<string, string>) => `${endpoint.contentComments(page, limit)}&search=${encodeURIComponent(filters.search || "")}${filters.isDeleted ? `&isDeleted=${filters.isDeleted}` : ""}`} columns={["_id", "userId", "text", "isDeleted", "createdAt"]} filters={[{ key: "isDeleted", label: "Deleted", options: ["true", "false"] }]} actions={[{ label: "Restore comment", icon: RotateCcw, path: (row) => endpoint.commentRestore(String(row._id || row.id)), body: {}, colorScheme: "green", disabled: (row) => row.isDeleted !== true }, { label: "Delete comment", icon: Trash2, path: (row) => endpoint.commentDelete(String(row._id || row.id)), method: "DELETE", body: {}, colorScheme: "red", disabled: (row) => row.isDeleted === true }]} />
                                    : activeTab === "Activity Logs"
                                        ? <AdminResourcePage title="Activity Logs" description="Audit administrator actions across the platform." endpoint={(page: number, limit: number, filters: Record<string, string>) => `${endpoint.activity(page, limit)}&action=${encodeURIComponent(filters.action || "")}${filters.targetType ? `&targetType=${filters.targetType}` : ""}`} columns={["adminId", "action", "targetType", "targetId", "reason", "createdAt"]} filters={[{ key: "targetType", label: "Target type", options: ["user", "report", "post", "payment", "payout"] }]} />
                                        : activeTab === "Live Streams"
                                            ? <LiveStreamsPage />
                                            : activeTab === "Analytics"
                                                ? <AnalyticsPage />
                                                : <><SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4} mb={6}><StatCard label="Active projects" value="24" change="12.5%" trend="up" icon={Activity} color="brand" /><StatCard label="Tasks completed" value="1,284" change="8.2%" trend="up" icon={CheckCircle2} color="green" /><StatCard label="Avg. cycle time" value="4.6 days" change="4.1%" trend="down" icon={Clock3} color="orange" /><StatCard label="Compliance score" value="100%" change="3.4%" trend="up" icon={ShieldCheck} color="blue" /></SimpleGrid><ActivityTable /></>;
    return <Flex minH="100vh"><Box display={{ base: "none", lg: "block" }}><Sidebar activeTab={activeTab} onNavigate={setActiveTab} onSignOut={signOut} /></Box><Box position="fixed" zIndex={20} display={{ base: isOpen ? "block" : "none", lg: "none" }}><Sidebar activeTab={activeTab} onNavigate={setActiveTab} onSignOut={signOut} onClose={onClose} /></Box>{isOpen && <Box position="fixed" inset={0} bg="blackAlpha.600" zIndex={10} onClick={onClose} display={{ lg: "none" }} />}<Box flex="1" minW={0}><Topbar onOpen={onOpen} role={role} onRoleChange={setRole} onSignOut={signOut} /><Box as="main" p={{ base: 4, md: 8 }} maxW="1440px" mx="auto"><Flex justify="space-between" align={{ base: "start", sm: "center" }} direction={{ base: "column", sm: "row" }} gap={4} mb={activeTab === "Analytics" || activeTab === "Users" || activeTab === "Reports" || activeTab === "Payments" || activeTab === "Payouts" || activeTab === "Chat Management" || activeTab === "Creators" || activeTab === "Posts" || activeTab === "Comments" || activeTab === "Activity Logs" || activeTab === "Live Streams" ? 4 : 8}><Box>{activeTab !== "Analytics" && activeTab !== "Users" && activeTab !== "Reports" && activeTab !== "Payments" && activeTab !== "Payouts" && activeTab !== "Chat Management" && activeTab !== "Creators" && activeTab !== "Posts" && activeTab !== "Comments" && activeTab !== "Activity Logs" && activeTab !== "Live Streams" && <><Heading fontSize={{ base: "2xl", md: "3xl" }} letterSpacing="-0.03em">{role} {activeTab.toLowerCase()}</Heading><Text color="gray.500" mt={2}>{activeTab === "Overview" ? roleDescription : `${activeTab} workspace for your organization.`}</Text></>}</Box></Flex>{page}</Box></Box></Flex>;
};
