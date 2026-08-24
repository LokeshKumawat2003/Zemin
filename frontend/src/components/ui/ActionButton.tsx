import { Button, ButtonProps } from "@chakra-ui/react";

/**
 * Shared action button used for primary table actions such as search and submit.
 * This keeps consistent sizing and spacing across all admin pages.
 */
export const ActionButton = ({ children, ...props }: ButtonProps) => (
  <Button
    colorScheme="brand"
    h="42px"
    maxW="80px"
    px={4}
    w="auto"
    flexShrink={0}
    whiteSpace="nowrap"
    {...props}
  >
    {children}
  </Button>
);
