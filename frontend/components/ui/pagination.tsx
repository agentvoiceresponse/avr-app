import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  labels?: {
    range?: string;
    zero?: string;
    prev?: string;
    next?: string;
    perPage?: string;
  };
  onPageSizeChange?: (limit: number) => void;
  pageSizeOptions?: number[];
}

export function TablePagination({
  page,
  limit,
  total,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  labels,
  onPageSizeChange,
  pageSizeOptions,
}: PaginationProps) {
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(total, page * limit);
  const zeroLabel = labels?.zero ?? '0 results';
  const rangeLabel = labels?.range ?? 'Showing {start}-{end} of {total}';
  const prevLabel = labels?.prev ?? 'Previous page';
  const nextLabel = labels?.next ?? 'Next page';
  const perPageLabel = labels?.perPage ?? 'Rows per page';

  const defaultOptions = pageSizeOptions ?? [10, 25, 50];
  const sizeOptions = Array.from(new Set([...defaultOptions, limit])).sort(
    (a, b) => a - b,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {total === 0
          ? zeroLabel
          : rangeLabel
              .replace('{start}', String(startItem))
              .replace('{end}', String(endItem))
              .replace('{total}', String(total))}
        {onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span>{perPageLabel}</span>
            <Select
              value={String(limit)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-9 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label={prevLabel}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[2rem] text-center text-sm font-medium text-muted-foreground">{page}</span>
        <Button
          variant="outline"
          size="icon"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          aria-label={nextLabel}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
