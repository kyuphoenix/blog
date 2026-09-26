export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 10
export const MAX_PAGE_SIZE = 100

export const parsePagination = (query: {
  page?: string
  pageSize?: string
}) => {
  let page = parseInt(query.page || String(DEFAULT_PAGE), 10)
  let pageSize = parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10)

  if (isNaN(page) || page < 1) page = DEFAULT_PAGE
  if (isNaN(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE

  const offset = (page - 1) * pageSize

  return { page, pageSize, offset }
}
