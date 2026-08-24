import { Alert, AlertIcon, Box, Button, FormControl, FormLabel, Heading, HStack, Icon, IconButton, Input, InputGroup, InputLeftElement, InputRightElement, Stack, Text } from "@chakra-ui/react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { adminLogin } from "../api/adminApi";

export const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState("demo-zemin@gmail.com");
    const [password, setPassword] = useState("demo123");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        try {
            await adminLogin(email, password);
            const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";
            navigate(destination, { replace: true });
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Login failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box minH="100vh" bg="canvas" display="flex" alignItems="center" justifyContent="center" p={{ base: 0, md: 6 }}>
            <Box width="full" maxW="1040px" minH={{ base: "100vh", md: "650px" }} display="grid" gridTemplateColumns={{ base: "1fr", md: "0.9fr 1.1fr" }} bg="white" borderRadius={{ base: 0, md: "24px" }} overflow="hidden" boxShadow={{ base: "none", md: "0 24px 70px rgba(23, 33, 43, 0.12)" }}>
                <Box bg="brand.700" color="white" p={{ base: 6, md: 10 }} display={{ base: "none", md: "flex" }} flexDirection="column" justifyContent="space-between" position="relative" overflow="hidden">
                    <Box position="relative" zIndex={1}>
                        <HStack spacing={3}>
                            <Box bg="coral" p={2} borderRadius="10px"><Icon as={ShieldCheck} boxSize={6} /></Box>
                            <Text fontSize="xl" fontWeight="800">Zemin App</Text>
                        </HStack>
                        <Heading mt={16} size="xl" lineHeight="1.15">Keep the whole platform moving.</Heading>
                        <Text mt={4} color="whiteAlpha.800" lineHeight="1.7">Manage users, live rooms, payments, and reports from one calm workspace.</Text>
                    </Box>
                    <Text position="relative" zIndex={1} fontSize="sm" color="whiteAlpha.700">Secure workspace access for authorized administrators.</Text>
                    <Box position="absolute" width="260px" height="260px" borderRadius="full" bg="coral" opacity={0.18} right="-90px" bottom="-70px" />
                    <Box position="absolute" width="180px" height="180px" borderRadius="full" border="1px solid" borderColor="whiteAlpha.300" right="80px" bottom="70px" />
                </Box>

                <Box as="form" onSubmit={submit} p={{ base: 6, sm: 10, md: 14 }} display="flex" flexDirection="column" justifyContent="center">
                    <HStack display={{ base: "flex", md: "none" }} spacing={2} mb={10}>
                        <Box bg="brand.500" color="white" p={2} borderRadius="9px"><Icon as={ShieldCheck} boxSize={5} /></Box>
                        <Text fontWeight="800" fontSize="lg">Zemin App</Text>
                    </HStack>
                    <Text fontSize="sm" fontWeight="700" color="brand.600" textTransform="uppercase" letterSpacing="0.08em">Welcome back</Text>
                    <Heading size="xl" mt={2}>Zemin App sign in</Heading>
                    <Text color="gray.500" mt={3} mb={8}>Access your administration workspace securely.</Text>
                    <Stack spacing={5}>
                        <FormControl isRequired>
                            <FormLabel fontSize="sm">Email address</FormLabel>
                            <InputGroup>
                                <InputLeftElement pointerEvents="none"><Icon as={Mail} color="gray.400" boxSize={4} /></InputLeftElement>
                                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" size="lg" pl={10} />
                            </InputGroup>
                        </FormControl>
                        <FormControl isRequired>
                            <FormLabel fontSize="sm">Password</FormLabel>
                            <InputGroup>
                                <InputLeftElement pointerEvents="none"><Icon as={LockKeyhole} color="gray.400" boxSize={4} /></InputLeftElement>
                                <Input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" size="lg" pl={10} pr={12} />
                                <InputRightElement height="full"><IconButton aria-label={showPassword ? "Hide password" : "Show password"} icon={<Icon as={showPassword ? EyeOff : Eye} boxSize={4} />} variant="ghost" size="sm" onClick={() => setShowPassword((visible) => !visible)} /></InputRightElement>
                            </InputGroup>
                        </FormControl>
                        {error && <Alert status="error" borderRadius="8px" fontSize="sm"><AlertIcon />{error}</Alert>}
                        <Button type="submit" colorScheme="brand" size="lg" rightIcon={<Icon as={ArrowRight} boxSize={4} />} isLoading={loading} loadingText="Signing in">Sign in</Button>
                    </Stack>
                    <Text fontSize="xs" color="gray.400" mt={10}>Authorized access only. Activity may be monitored.</Text>
                </Box>
            </Box>
        </Box>
    );
};
