import { FC } from 'hono/jsx'
import type { BlogConfig } from '../blog.config.js'
import { i18n, I18nKey, formatDate } from '../i18n/index.js'
import { CopyIcon } from './Icons.js'

interface LicenseCardProps {
  title: string
  url: string
  date: string
  siteConfig: BlogConfig
}

export const LicenseCard: FC<LicenseCardProps> = ({ title, url, date, siteConfig }) => {
  const lang = siteConfig.lang
  const author = siteConfig.author || 'Blog Author'
  const licenseName = 'CC BY-NC-SA 4.0'
  const licenseUrl = 'https://creativecommons.org/licenses/by-nc-sa/4.0/'

  return (
    <div class="fuwari-card-base my-8 p-5 md:p-6 rounded-2xl border border-black/5 dark:border-white/10 bg-(--fuwari-primary)/5 dark:bg-white/3 relative overflow-hidden transition-all hover:bg-(--fuwari-primary)/8 fuwari-onload-animation">
      {/* Background Creative Commons Watermark Logo */}
      <div class="absolute -right-6 -bottom-6 opacity-5 dark:opacity-4 pointer-events-none text-(--fuwari-primary)">
        <svg class="w-36 h-36" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1.8-6.95c-.32.61-.83 1-1.52 1-.95 0-1.68-.78-1.68-1.95 0-1.2.7-1.98 1.68-1.98.66 0 1.17.38 1.5.95l1.05-.62c-.52-.9-1.42-1.5-2.55-1.5-1.74 0-3 1.34-3 3.15 0 1.78 1.29 3.12 3 3.12 1.15 0 2.05-.62 2.58-1.52l-1.06-.65zm4.8 0c-.32.61-.83 1-1.52 1-.95 0-1.68-.78-1.68-1.95 0-1.2.7-1.98 1.68-1.98.66 0 1.17.38 1.5.95l1.05-.62c-.52-.9-1.42-1.5-2.55-1.5-1.74 0-3 1.34-3 3.15 0 1.78 1.29 3.12 3 3.12 1.15 0 2.05-.62 2.58-1.52l-1.06-.65z" />
        </svg>
      </div>

      <div class="relative z-10 flex flex-col gap-3">
        {/* Article Title & Link */}
        <div class="flex flex-col gap-1">
          <div class="text-xs uppercase font-bold tracking-wider text-(--fuwari-primary) opacity-80">
            {i18n(I18nKey.licenseTitle, lang)}
          </div>
          <div class="font-bold text-base md:text-lg fuwari-text-90">{title}</div>
          <div class="flex items-center gap-2 mt-0.5">
            <a
              href={url}
              class="text-xs md:text-sm text-(--fuwari-primary) hover:underline break-all truncate max-w-xl"
              title={url}
            >
              {url}
            </a>
            <button
              type="button"
              id="license-copy-btn"
              data-url={url}
              class="shrink-0 p-1 rounded-md text-xs bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 fuwari-text-75 transition active:scale-95 cursor-pointer border-none"
              aria-label={i18n(I18nKey.copyLink, lang)}
              title={i18n(I18nKey.copyLink, lang)}
            >
              <CopyIcon size={14} />
            </button>
          </div>
        </div>

        {/* Metadata Grid */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-black/5 dark:border-white/10 text-xs md:text-sm">
          <div>
            <span class="fuwari-text-50 block text-xs">{i18n(I18nKey.licenseAuthor, lang)}</span>
            <span class="font-semibold fuwari-text-75">{author}</span>
          </div>
          <div>
            <span class="fuwari-text-50 block text-xs">{i18n(I18nKey.licensePublished, lang)}</span>
            <span class="font-semibold fuwari-text-75">{formatDate(date, lang)}</span>
          </div>
          <div>
            <span class="fuwari-text-50 block text-xs">{i18n(I18nKey.licenseLink, lang)}</span>
            <a
              href={licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="font-semibold text-(--fuwari-primary) hover:underline inline-flex items-center gap-1"
            >
              <span>{licenseName}</span>
            </a>
          </div>
        </div>

        {/* License Notice */}
        <div class="text-xs fuwari-text-50 leading-relaxed pt-1">
          {i18n(I18nKey.licenseNotice, lang)}
        </div>
      </div>
    </div>
  )
}
