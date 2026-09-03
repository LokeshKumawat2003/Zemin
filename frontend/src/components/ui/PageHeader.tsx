import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/**
 * A shared header for route-level pages. This keeps page titles and actions
 * consistent without repeating the same JSX across multiple modules.
 */
export const PageHeader = ({ title, description, action }: PageHeaderProps) => (
  <Flex
    justify="space-between"
    align={{ base: "start", sm: "center" }}
    direction={{ base: "column", sm: "row" }}
    gap={3}
  >
    <Box>
      <Heading size={{ base: "md", md: "lg" }}>{title}</Heading>
      {description && (
        <Text color="gray.500" mt={1}>
          {description}
        </Text>
      )}
    </Box>
    {action}
  </Flex>
);
