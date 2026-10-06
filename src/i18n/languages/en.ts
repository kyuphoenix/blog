import { I18nKey, Translation } from '../i18nKey.js'

export const en: Translation = {
  // Navigation & Global
  [I18nKey.home]: 'Home',
  [I18nKey.about]: 'About',
  [I18nKey.archive]: 'Archive',
  [I18nKey.links]: 'Links',
  [I18nKey.search]: 'Search',

  // Sidebar & Widgets
  [I18nKey.tags]: 'Tags',
  [I18nKey.categories]: 'Categories',
  [I18nKey.recentPosts]: 'Recent Posts',
  [I18nKey.profile]: 'Profile',
  [I18nKey.profileView]: 'View Profile',

  // Posts & Content
  [I18nKey.untitled]: 'Untitled',
  [I18nKey.uncategorized]: 'Uncategorized',
  [I18nKey.noTags]: 'No Tags',
  [I18nKey.wordCount]: 'word',
  [I18nKey.wordsCount]: 'words',
  [I18nKey.minuteCount]: 'min read',
  [I18nKey.minutesCount]: 'mins read',
  [I18nKey.postCount]: 'post',
  [I18nKey.postsCount]: 'posts',
  [I18nKey.postsCountTotal]: '({count} posts)',
  [I18nKey.viewsCount]: 'views',
  [I18nKey.author]: 'Author',
  [I18nKey.publishedAt]: 'Published at',
  [I18nKey.updatedAt]: 'Updated at',
  [I18nKey.readingTime]: 'Reading time',
  [I18nKey.postSummary]: 'Summary',
  [I18nKey.prevPost]: 'Previous',
  [I18nKey.nextPost]: 'Next',
  [I18nKey.prevPage]: 'Previous Page',
  [I18nKey.nextPage]: 'Next Page',
  [I18nKey.filterCategory]: 'Category: {category}',
  [I18nKey.filterTag]: 'Tag: #{tag}',
  [I18nKey.clearFilter]: '✕ Clear Filter',
  [I18nKey.noPosts]: 'No posts found',
  [I18nKey.backToHome]: 'Back to Home',
  [I18nKey.pageNotFound]: '404 - Page Not Found',
  [I18nKey.pageNotFoundDesc]: 'Sorry, the page you are looking for does not exist or has been removed.',
  [I18nKey.postNotFound]: '404 - Post Not Found',
  [I18nKey.postNotFoundDesc]: 'Sorry, the post does not exist or has been taken down.',
  [I18nKey.post]: 'Current Post',
  [I18nKey.page]: 'Current Page',

  // Archive
  [I18nKey.archiveTitle]: 'Archive',
  [I18nKey.archiveSubtitle]: '{count} posts in historical timeline and archives',

  // Links
  [I18nKey.linksTitle]: 'Friends & Links',
  [I18nKey.linksSubtitle]: 'Welcome to connect and exchange friend links with fellow developers and creators!',
  [I18nKey.applyLinks]: 'Apply for Link',
  [I18nKey.applyRules]: 'Link Exchange Guidelines',
  [I18nKey.applyRulesSubtitle]: 'Add us first · High quality content',
  [I18nKey.siteInfo]: '📋 Site Information (Please add us first)',
  [I18nKey.siteName]: 'Name',
  [I18nKey.siteDesc]: 'Description',
  [I18nKey.siteUrl]: 'URL',
  [I18nKey.siteAvatar]: 'Avatar',
  [I18nKey.copySiteInfo]: 'Copy Site Info',
  [I18nKey.applyTemplate]: '📝 Application Template',
  [I18nKey.copyApplyTemplate]: 'Copy Template',
  [I18nKey.emailApply]: '📧 Apply via Email (Recommended)',
  [I18nKey.emailApplyDesc]: 'Click the button below to launch your email client with the pre-filled template:',
  [I18nKey.sendEmail]: 'Send Application Email',
  [I18nKey.copyEmail]: 'Copy Email',
  [I18nKey.noPublicEmail]: 'Email address is not publicly disclosed',
  [I18nKey.commentApply]: '💬 Apply via Comment',
  [I18nKey.commentApplyDesc]: 'You can also leave a comment below using the template above (hosted by Giscus, publicly visible):',
  [I18nKey.expandComments]: 'Expand Comments',
  [I18nKey.collapseComments]: 'Collapse Comments',
  [I18nKey.copied]: '✓ Copied',
  [I18nKey.collapseRules]: 'Collapse Rules',

  // Search & Dialog
  [I18nKey.searchArticles]: 'Search posts...',
  [I18nKey.searchPlaceholder]: 'Type keywords to search post titles or excerpts...',
  [I18nKey.searchStart]: 'Type keywords to start searching',
  [I18nKey.searching]: 'Searching...',
  [I18nKey.searchNoResults]: 'No matching posts found',
  [I18nKey.searchError]: 'Search error, please try again later',

  // Theme & Appearance
  [I18nKey.themeColor]: 'Theme Color',
  [I18nKey.themeSetting]: 'Theme Color Settings',
  [I18nKey.themeHue]: 'Theme Hue',
  [I18nKey.resetHue]: 'Reset Default Hue',
  [I18nKey.toggleTheme]: 'Toggle Dark/Light Mode',
  [I18nKey.lightMode]: 'Light',
  [I18nKey.darkMode]: 'Dark',
  [I18nKey.systemMode]: 'System',
  [I18nKey.more]: 'More',
  [I18nKey.openMenu]: 'Open Menu',
  [I18nKey.backToTop]: 'Back to Top',

  // Comments
  [I18nKey.comments]: 'Comments',
  [I18nKey.commentsNotConfigured]: 'Giscus comments not configured',
  [I18nKey.commentsCommonFormats]: 'Formatting:',
  [I18nKey.commentsSyntaxGuide]: '💡 Markdown Guide',

  // Accessibility & Controls
  [I18nKey.closeMenu]: 'Close Menu',
  [I18nKey.closeSearch]: 'Close Search',
  [I18nKey.toc]: 'Table of Contents',
  [I18nKey.closeToc]: 'Close Table of Contents',

  // Code Block
  [I18nKey.copyCode]: 'Copy code',
  [I18nKey.codeCopied]: 'Copied',

  // Article License (CC-BY-NC-SA 4.0)
  [I18nKey.licenseTitle]: 'License',
  [I18nKey.licenseAuthor]: 'Author',
  [I18nKey.licensePublished]: 'Published at',
  [I18nKey.licenseLink]: 'License Link',
  [I18nKey.licenseNotice]: 'For commercial use, please contact the author for authorization. For non-commercial use, please credit the source.',
  [I18nKey.copyLink]: 'Copy Link',
  [I18nKey.linkCopied]: 'Link Copied',

  // Admonitions (Callouts)
  [I18nKey.admonitionNote]: 'Note',
  [I18nKey.admonitionTip]: 'Tip',
  [I18nKey.admonitionImportant]: 'Important',
  [I18nKey.admonitionWarning]: 'Warning',
  [I18nKey.admonitionCaution]: 'Caution',
}
