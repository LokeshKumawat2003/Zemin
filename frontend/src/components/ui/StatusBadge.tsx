import { Badge, BadgeProps } from "@chakra-ui/react";

type StatusBadgeProps = BadgeProps & {
  status?: string;
};

const statusColorMap: Record<string, BadgeProps["colorScheme"]> = {
  live: "green",
  waiting: "orange",
  ended: "gray",
};

/**
 * Reusable status display for live states or generic moderation states.
 */
export const StatusBadge = ({ status, children, ...props }: StatusBadgeProps) => {
  const colorScheme = status ? statusColorMap[status] ?? "gray" : props.colorScheme ?? "gray";

  return (
    <Badge colorScheme={colorScheme} textTransform="capitalize" {...props}>
      {children ?? status ?? "Unknown"}
    </Badge>
  );
};
