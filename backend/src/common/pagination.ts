export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationQuery {
  page?: number | string;
  limit?: number | string;
}

export function getPagination(query: PaginationQuery): {
  page: number;
  limit: number;
  skip: number;
  take: number;
} {
  const pageInput =
    typeof query.page === 'string' ? Number(query.page) : query.page;
  const limitInput =
    typeof query.limit === 'string' ? Number(query.limit) : query.limit;
  const page = Math.max(Number(pageInput) || 1, 1);
  const limit = Math.min(Math.max(Number(limitInput) || 10, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    total,
    page,
    limit,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
