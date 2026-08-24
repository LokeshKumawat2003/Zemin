import {
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  BarChart3,
  Boxes,
  Clapperboard,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  ScrollText,
  Users,
  X,
  WalletCards,
} from "lucide-react";

/**
 * Sidebar tabs represent the main administrative sections in the dashboard.
 * Keeping this list in one place makes route switching easier to maintain.
 */
export type SidebarTab =
  | "Overview"
  | "Users"
  | "Creators"
  | "Reports"
  | "Analytics"
  | "Payments"
  | "Payouts"
  | "Chat Management"
  | "Posts"
  | "Comments"
  | "Activity Logs"
  | "Live Streams";

type SidebarProps = {
  activeTab: SidebarTab;
  onNavigate: (tab: SidebarTab) => void;
  onSignOut: () => void;
  onClose?: () => void;
};

type NavItemProps = {
  icon: typeof LayoutDashboard;
  label: SidebarTab;
  active?: boolean;
  onClick: () => void;
};

const NavItem = ({ icon, label, active, onClick }: NavItemProps) => (
  <Button
    onClick={onClick}
    justifyContent="flex-start"
    variant="ghost"
    color={active ? "white" : "#A8B6C4"}
    bg={active ? "brand.600" : "transparent"}
    _hover={{ bg: active ? "brand.600" : "#24333F", color: "white" }}
    leftIcon={<Icon as={icon} boxSize={4} />}
    width="full"
    height="44px"
    px={3}
  >
    {label}
  </Button>
);

/**
 * The dashboard sidebar groups all major modules and gives the user one
 * clear navigation surface across the admin experience.
 */
export const Sidebar = ({ activeTab, onNavigate, onSignOut, onClose }: SidebarProps) => {
  const navigate = (tab: SidebarTab) => {
    onNavigate(tab);
    onClose?.();
  };

  return (
    <Flex
      direction="column"
      bg="#17252F"
      color="white"
      width={{ base: "280px", lg: "248px" }}
      h={{ base: "100vh", lg: "100dvh" }}
      position={{ lg: "sticky" }}
      top={{ lg: 0 }}
      overflowY="auto"
      flexShrink={0}
      px={4}
      py={5}
    >
      <Flex align="center" justify="space-between" mb={10} px={2}>
        <HStack spacing={3}>
          <Flex bg="brand.500" borderRadius="8px" boxSize="34px" align="center" justify="center">
            <Icon as={Boxes} boxSize={5} />
          </Flex>
          <Text fontSize="lg" fontWeight="800" letterSpacing="-0.02em">
            ZEMIN App
          </Text>
        </HStack>
        {onClose && (
          <Button aria-label="Close navigation" onClick={onClose} variant="ghost" color="white" px={2}>
            <Icon as={X} />
          </Button>
        )}
      </Flex>

      <Text fontSize="xs" fontWeight="800" color="#718391" letterSpacing="0.12em" px={3} mb={3}>
        WORKSPACE
      </Text>
      <VStack align="stretch" spacing={1}>
        <NavItem icon={BarChart3} label="Analytics" active={activeTab === "Analytics"} onClick={() => navigate("Analytics")} />
        <NavItem icon={Users} label="Users" active={activeTab === "Users"} onClick={() => navigate("Users")} />
        <NavItem icon={Users} label="Creators" active={activeTab === "Creators"} onClick={() => navigate("Creators")} />
        <NavItem icon={FileText} label="Reports" active={activeTab === "Reports"} onClick={() => navigate("Reports")} />
      </VStack>

      <Text fontSize="xs" fontWeight="800" color="#718391" letterSpacing="0.12em" px={3} mt={9} mb={3}>
        MANAGE
      </Text>
      <VStack align="stretch" spacing={1}>
        <NavItem icon={WalletCards} label="Payments" active={activeTab === "Payments"} onClick={() => navigate("Payments")} />
        <NavItem icon={WalletCards} label="Payouts" active={activeTab === "Payouts"} onClick={() => navigate("Payouts")} />
        <NavItem icon={MessageCircle} label="Chat Management" active={activeTab === "Chat Management"} onClick={() => navigate("Chat Management")} />
        <NavItem icon={Clapperboard} label="Posts" active={activeTab === "Posts"} onClick={() => navigate("Posts")} />
        <NavItem icon={MessageCircle} label="Comments" active={activeTab === "Comments"} onClick={() => navigate("Comments")} />
        <NavItem icon={ScrollText} label="Activity Logs" active={activeTab === "Activity Logs"} onClick={() => navigate("Activity Logs")} />
        <NavItem icon={Clapperboard} label="Live Streams" active={activeTab === "Live Streams"} onClick={() => navigate("Live Streams")} />
      </VStack>

      <Box mt="auto">
        <Divider borderColor="#31434F" mb={4} />
        <Button
          onClick={onSignOut}
          justifyContent="flex-start"
          variant="ghost"
          color="#A8B6C4"
          _hover={{ bg: "#24333F", color: "white" }}
          leftIcon={<Icon as={LogOut} boxSize={4} />}
          width="full"
          height="44px"
          px={3}
        >
          Sign out
        </Button>
      </Box>
    </Flex>
  );
};
