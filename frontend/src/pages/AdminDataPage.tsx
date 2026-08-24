import { Alert, AlertIcon, Badge, Box, Button, Flex, Heading, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr, VStack } from "@chakra-ui/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { adminRequest, ApiRecord } from "../api/adminApi";

const getRows = (data: unknown): ApiRecord[] => {
  if (Array.isArray(data)) return data.filter((item): item is ApiRecord => Boolean(item && typeof item === "object"));
  if (data && typeof data === "object") {
    const record = data as ApiRecord;
    for (const key of ["users", "reports", "items", "logs", "streams", "results"]) {
      if (Array.isArray(record[key])) return getRows(record[key]);
    }
  }
  return data && typeof data === "object" ? [data as ApiRecord] : [];
};

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const columnsFor = (rows: ApiRecord[]) => {
  const preferred = ["id", "username", "email", "role", "status", "reason", "createdAt", "updatedAt"];
  const available = new Set(rows.flatMap((row) => Object.keys(row)));
  return preferred.filter((column) => available.has(column)).slice(0, 6);
};

type AdminDataPageProps = { title: string; description: string; path: string; action?: (row: ApiRecord) => React.ReactNode };

export const AdminDataPage = ({ title, description, path, action }: AdminDataPageProps) => {
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setRows(getRows(await adminRequest(path)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load this page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [path]);
  const columns = columnsFor(rows);

  return <VStack align="stretch" spacing={5}>
    <Flex justify="space-between" align={{ base: "start", sm: "center" }} direction={{ base: "column", sm: "row" }} gap={3}>
      <Box><Heading size="lg">{title}</Heading><Text color="gray.500" mt={1}>{description}</Text></Box>
      <Button size="sm" variant="outline" leftIcon={<RefreshCw size={15} />} onClick={() => void load()} isLoading={loading}>Refresh</Button>
    </Flex>
    {error && <Alert status="error" borderRadius="8px"><AlertIcon />{error}</Alert>}
    <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="12px" overflow="hidden">
      {loading ? <Flex minH="180px" justify="center" align="center"><Spinner color="brand.500" /></Flex> : rows.length === 0 ? <Text p={8} color="gray.500">No records returned by this endpoint.</Text> : <Box overflowX="auto"><Table minW="680px"><Thead bg="gray.50"><Tr>{columns.map((column) => <Th key={column}>{column}</Th>)}{action && <Th>Actions</Th>}</Tr></Thead><Tbody>{rows.map((row, index) => <Tr key={String(row.id || index)}>{columns.map((column) => <Td key={column} maxW="260px" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">{column === "status" || column === "role" ? <Badge colorScheme="blue" textTransform="none">{displayValue(row[column])}</Badge> : displayValue(row[column])}</Td>)}{action && <Td>{action(row)}</Td>}</Tr>)}</Tbody></Table></Box>}
    </Box>
  </VStack>;
};
