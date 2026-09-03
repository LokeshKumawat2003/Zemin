import { Button, ButtonProps } from "@chakra-ui/react";

/**
 * Shared action button used for primary table actions such as search and submit.
 * This keeps consistent sizing and spacing across all admin pages.
 */
export const ActionButton = ({ children, ...props }: ButtonProps) => (
  <Button
    colorScheme="brand"
    h="42px"
    px={4}
    w={{ base: "full", sm: "auto" }}
    maxW={{ base: "full", sm: "none" }}
    flexShrink={0}
    whiteSpace="nowrap"
    {...props}
  >
    {children}
  </Button>
);
