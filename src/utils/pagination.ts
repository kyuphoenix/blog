export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100

export interface PaginationResult {
  page: number
  pageSize: number
  offset: number
  isPaginated: boolean
}

export const parsePagination = (
  query: {
    page?: string
    pageSize?: string
  },
  configPageSize: number = DEFAULT_PAGE_SIZE
): PaginationResult => {
  let page = parseInt(query.page || String(DEFAULT_PAGE), 10)
  if (isNaN(page) || page < 1) page = DEFAULT_PAGE

  // 若配置 pageSize 为 0 或负数，则代表不分页（展示全部）
  if (typeof configPageSize === 'number' && configPageSize <= 0) {
    return { page: 1, pageSize: 0, offset: 0, isPaginated: false }
  }

  let pageSize = parseInt(query.pageSize || String(configPageSize), 10)
  if (isNaN(pageSize) || pageSize < 0) pageSize = configPageSize
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE

  // 若通过 query 参数显式指定 pageSize=0，也视为不分页
  if (pageSize <= 0) {
    return { page: 1, pageSize: 0, offset: 0, isPaginated: false }
  }

  const offset = (page - 1) * pageSize

  return { page, pageSize, offset, isPaginated: true }
}
