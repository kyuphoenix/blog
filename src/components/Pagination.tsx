import { FC } from 'hono/jsx'
import { ChevronRightIcon } from './Icons.js'
import { i18n, I18nKey } from '../i18n/index.js'

interface PaginationProps {
  currentPage: number
  totalPages: number
  baseUrl?: string
  lang?: string
}

export const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  baseUrl = '/',
  lang,
}) => {
  if (totalPages <= 1) return null

  const buildUrl = (page: number) => {
    if (page === 1) return baseUrl
    const separator = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${separator}page=${page}`
  }

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div class="flex flex-row gap-3 justify-center items-center mt-2 fuwari-onload-animation" style="animation-delay: 200ms">
      {currentPage > 1 && (
        <a
          href={buildUrl(currentPage - 1)}
          class="fuwari-card-base fuwari-btn-regular w-11 h-11 rounded-xl flex items-center justify-center active:scale-90"
          aria-label={i18n(I18nKey.prevPage, lang)}
        >
          <span class="rotate-180 flex">
            <ChevronRightIcon size={20} />
          </span>
        </a>
      )}
      <div class="fuwari-card-base flex flex-row items-center p-1 gap-1">
        {pages.map((p) =>
          p === '...' ? (
            <span class="px-2 fuwari-text-50">…</span>
          ) : (
            <a
              href={buildUrl(p)}
              class={`w-9 h-9 rounded-lg font-bold text-sm flex items-center justify-center transition no-underline ${
                p === currentPage
                  ? 'fuwari-btn-primary'
                  : 'fuwari-text-75 hover:bg-(--fuwari-btn-plain-bg-hover) hover:text-(--fuwari-primary)'
              }`}
            >
              {p}
            </a>
          )
        )}
      </div>
      {currentPage < totalPages && (
        <a
          href={buildUrl(currentPage + 1)}
          class="fuwari-card-base fuwari-btn-regular w-11 h-11 rounded-xl flex items-center justify-center active:scale-90"
          aria-label={i18n(I18nKey.nextPage, lang)}
        >
          <ChevronRightIcon size={20} />
        </a>
      )}
    </div>
  )
}
