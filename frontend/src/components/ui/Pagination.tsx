import { Button, HStack, IconButton } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Shared pagination component for table/list views across the admin app.
 * It keeps page navigation consistent across every data-heavy module.
 */
type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

const pageItems = (page: number, totalPages: number): number[] => {
  const visiblePages = Math.min(5, totalPages);
  const start = Math.min(Math.max(1, page - 2), totalPages - visiblePages + 1);
  return Array.from({ length: visiblePages }, (_, index) => start + index);
};

export const Pagination = ({ page, totalPages, onPageChange, isLoading = false }: PaginationProps) => (
  <HStack justify="center" align="center" width="full" spacing={{ base: 3, sm: 5 }} py={2}>
    <HStack spacing={1}>
      <Button
        size="sm"
        variant="outline"
        leftIcon={<ChevronLeft size={15} />}
        onClick={() => onPageChange(page - 1)}
        isDisabled={page <= 1 || isLoading}
        display={{ base: "none", sm: "flex" }}
      >
        Previous
      </Button>
      <IconButton
        aria-label="Previous page"
        title="Previous page"
        icon={<ChevronLeft size={16} />}
        size="sm"
        variant="outline"
        onClick={() => onPageChange(page - 1)}
        isDisabled={page <= 1 || isLoading}
        display={{ base: "flex", sm: "none" }}
      />
      <HStack spacing={1} display={{ base: "none", md: "flex" }}>
        {pageItems(page, totalPages).map((item) => (
          <Button
            key={item}
            size="sm"
            minW="34px"
            colorScheme={item === page ? "brand" : undefined}
            variant={item === page ? "solid" : "ghost"}
            onClick={() => onPageChange(item)}
            isDisabled={isLoading}
          >
            {item}
          </Button>
        ))}
      </HStack>
      <Button
        size="sm"
        variant="outline"
        rightIcon={<ChevronRight size={15} />}
        onClick={() => onPageChange(page + 1)}
        isDisabled={page >= totalPages || isLoading}
        display={{ base: "none", sm: "flex" }}
      >
        Next
      </Button>
      <IconButton
        aria-label="Next page"
        title="Next page"
        icon={<ChevronRight size={16} />}
        size="sm"
        variant="outline"
        onClick={() => onPageChange(page + 1)}
        isDisabled={page >= totalPages || isLoading}
        display={{ base: "flex", sm: "none" }}
      />
    </HStack>
  </HStack>
);
