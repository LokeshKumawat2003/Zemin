import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";

type StatCardProps = { label: string; value: string; change: string; trend: "up" | "down"; icon: LucideIcon; color: string };

export const StatCard = ({ label, value, change, trend, icon, color }: StatCardProps) => (
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" p={{ base: 4, md: 5 }}>
        <Flex justify="space-between" align="start">
            <Box><Text color="gray.500" fontSize="sm" fontWeight="600">{label}</Text><Text fontSize="2xl" fontWeight="800" mt={2}>{value}</Text></Box>
            <Flex boxSize="40px" borderRadius="10px" bg={`${color}.50`} color={`${color}.500`} align="center" justify="center"><Icon as={icon} boxSize={5} /></Flex>
        </Flex>
        <Flex align="center" mt={4} gap={1} fontSize="sm"><Icon as={trend === "up" ? ArrowUpRight : ArrowDownRight} color={trend === "up" ? "green.500" : "orange.500"} boxSize={4} /><Text fontWeight="700" color={trend === "up" ? "green.600" : "orange.600"}>{change}</Text><Text color="gray.500">vs last month</Text></Flex>
    </Box>
);
