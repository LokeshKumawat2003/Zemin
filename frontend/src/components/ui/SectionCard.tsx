import { Box, BoxProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

type SectionCardProps = BoxProps & {
  children: ReactNode;
};

/**
 * Shared container for data-heavy sections. Most admin tables and cards use the
 * same styling pattern, so this prevents repeated border/background logic.
 */
export const SectionCard = ({ children, ...props }: SectionCardProps) => (
  <Box
    bg="white"
    border="1px solid"
    borderColor="gray.200"
    borderRadius="12px"
    overflow="hidden"
    {...props}
  >
    {children}
  </Box>
);
