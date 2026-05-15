export class PaginationResultDto<T> {
  items: T | [];
  data: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  }
};