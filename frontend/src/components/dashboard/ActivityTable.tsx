import { Badge, Box, Flex, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";

const activities = [
  { project: "Orion migration", owner: "Maya Patel", status: "On track", updated: "12 min ago", color: "green" },
  { project: "Atlas rollout", owner: "Ethan Cole", status: "At risk", updated: "46 min ago", color: "orange" },
  { project: "Mercury audit", owner: "Sara Kim", status: "Complete", updated: "2 hr ago", color: "blue" },
  { project: "Nova onboarding", owner: "Jon Bell", status: "On track", updated: "3 hr ago", color: "green" },
];

export const ActivityTable = () => (
  <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" overflow="hidden">
    <Flex justify="space-between" align="center" p={{ base: 4, md: 5 }}><Box><Text fontWeight="800" fontSize="lg">Recent project activity</Text><Text color="gray.500" fontSize="sm" mt={1}>Keep an eye on your active workstreams.</Text></Box><Text color="brand.600" fontWeight="700" fontSize="sm" cursor="pointer">View all</Text></Flex>
    <Box overflowX="auto">
      <Table variant="simple" minW="620px"><Thead bg="gray.50"><Tr><Th>Project</Th><Th>Owner</Th><Th>Status</Th><Th>Last updated</Th></Tr></Thead><Tbody>{activities.map((activity) => <Tr key={activity.project}><Td fontWeight="700">{activity.project}</Td><Td color="gray.600">{activity.owner}</Td><Td><Badge colorScheme={activity.color} borderRadius="full" px={2} py={1} textTransform="none">{activity.status}</Badge></Td><Td color="gray.500">{activity.updated}</Td></Tr>)}</Tbody></Table>
    </Box>
  </Box>
);
