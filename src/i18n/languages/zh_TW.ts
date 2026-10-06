import { I18nKey, Translation } from '../i18nKey.js'

export const zh_TW: Translation = {
  // Navigation & Global
  [I18nKey.home]: '首頁',
  [I18nKey.about]: '關於',
  [I18nKey.archive]: '歸檔',
  [I18nKey.links]: '友鏈',
  [I18nKey.search]: '搜尋',

  // Sidebar & Widgets
  [I18nKey.tags]: '標籤',
  [I18nKey.categories]: '分類',
  [I18nKey.recentPosts]: '最新文章',
  [I18nKey.profile]: '個人簡介',
  [I18nKey.profileView]: '查看關於我',

  // Posts & Content
  [I18nKey.untitled]: '無標題',
  [I18nKey.uncategorized]: '未分類',
  [I18nKey.noTags]: '無標籤',
  [I18nKey.wordCount]: '字',
  [I18nKey.wordsCount]: '字',
  [I18nKey.minuteCount]: '分鐘',
  [I18nKey.minutesCount]: '分鐘',
  [I18nKey.postCount]: '篇文章',
  [I18nKey.postsCount]: '篇文章',
  [I18nKey.postsCountTotal]: '（共 {count} 篇）',
  [I18nKey.viewsCount]: '次閱讀',
  [I18nKey.author]: '作者',
  [I18nKey.publishedAt]: '發布於',
  [I18nKey.updatedAt]: '更新於',
  [I18nKey.readingTime]: '閱讀時間',
  [I18nKey.postSummary]: '文章摘要',
  [I18nKey.prevPost]: '上一篇',
  [I18nKey.nextPost]: '下一篇',
  [I18nKey.prevPage]: '上一頁',
  [I18nKey.nextPage]: '下一頁',
  [I18nKey.filterCategory]: '分類：{category}',
  [I18nKey.filterTag]: '標籤：#{tag}',
  [I18nKey.clearFilter]: '✕ 清除篩選',
  [I18nKey.noPosts]: '暫無相關文章',
  [I18nKey.backToHome]: '返回首頁',
  [I18nKey.pageNotFound]: '404 - 頁面未找到',
  [I18nKey.pageNotFoundDesc]: '抱歉，您訪問的頁面不存在或已被移除',
  [I18nKey.postNotFound]: '404 - 文章不存在',
  [I18nKey.postNotFoundDesc]: '抱歉，您訪問的文章不存在或已下線。',
  [I18nKey.post]: '當前文章',
  [I18nKey.page]: '當前頁面',

  // Archive
  [I18nKey.archiveTitle]: '歸檔',
  [I18nKey.archiveSubtitle]: '共 {count} 篇文章的歷史時間線與分類歸檔',

  // Links
  [I18nKey.linksTitle]: '友情鏈接',
  [I18nKey.linksSubtitle]: '海內存知己，天涯若比鄰。歡迎各位志同道合的朋友交換友鏈！',
  [I18nKey.applyLinks]: '申請友鏈',
  [I18nKey.applyRules]: '交換友鏈須知',
  [I18nKey.applyRulesSubtitle]: '先加本站 · 優質原創',
  [I18nKey.siteInfo]: '📋 本站資訊（請先添加本站）',
  [I18nKey.siteName]: '名稱',
  [I18nKey.siteDesc]: '簡介',
  [I18nKey.siteUrl]: '網址',
  [I18nKey.siteAvatar]: '頭像',
  [I18nKey.copySiteInfo]: '複製本站資訊',
  [I18nKey.applyTemplate]: '📝 申請格式模板',
  [I18nKey.copyApplyTemplate]: '複製申請格式',
  [I18nKey.emailApply]: '📧 郵件申請（推薦）',
  [I18nKey.emailApplyDesc]: '點擊下方按鈕可直接調起您的郵件客戶端，正文已預填好申請模板，發送後博主會盡快查收並添加：',
  [I18nKey.sendEmail]: '一鍵發送申請郵件',
  [I18nKey.copyEmail]: '複製郵箱',
  [I18nKey.noPublicEmail]: '博主暫未公開郵箱地址',
  [I18nKey.commentApply]: '💬 評論申請',
  [I18nKey.commentApplyDesc]: '您也可以直接通過下方評論區提交友鏈申請，請按照上方格式模板留言（留言內容由 Giscus 託管，對所有訪客公開可見）：',
  [I18nKey.expandComments]: '展開評論留言區',
  [I18nKey.collapseComments]: '收起評論留言區',
  [I18nKey.copied]: '✓ 已複製',
  [I18nKey.collapseRules]: '收起規則',

  // Search & Dialog
  [I18nKey.searchArticles]: '搜尋文章...',
  [I18nKey.searchPlaceholder]: '輸入關鍵詞搜尋文章標題或摘要...',
  [I18nKey.searchStart]: '輸入關鍵詞開始搜尋',
  [I18nKey.searching]: '搜尋中...',
  [I18nKey.searchNoResults]: '未找到匹配的文章',
  [I18nKey.searchError]: '搜尋出錯，請稍後重試',

  // Theme & Appearance
  [I18nKey.themeColor]: '主題色',
  [I18nKey.themeSetting]: '主題色設置',
  [I18nKey.themeHue]: '主題色相',
  [I18nKey.resetHue]: '重置預設色相',
  [I18nKey.toggleTheme]: '切換明暗主題',
  [I18nKey.lightMode]: '淺色',
  [I18nKey.darkMode]: '深色',
  [I18nKey.systemMode]: '跟隨系統',
  [I18nKey.more]: '更多',
  [I18nKey.openMenu]: '開啟選單',
  [I18nKey.backToTop]: '回到頂部',

  // Comments
  [I18nKey.comments]: '評論',
  [I18nKey.commentsNotConfigured]: 'Giscus 評論系統尚未配置',
  [I18nKey.commentsCommonFormats]: '常用格式:',
  [I18nKey.commentsSyntaxGuide]: '💡 語法速查',

  // Accessibility & Controls
  [I18nKey.closeMenu]: '關閉選單',
  [I18nKey.closeSearch]: '關閉搜尋',
  [I18nKey.toc]: '文章目錄',
  [I18nKey.closeToc]: '關閉目錄',

  // Code Block
  [I18nKey.copyCode]: '複製代碼',
  [I18nKey.codeCopied]: '已複製',

  // Article License (CC-BY-NC-SA 4.0)
  [I18nKey.licenseTitle]: '許可協議',
  [I18nKey.licenseAuthor]: '本文作者',
  [I18nKey.licensePublished]: '發布於',
  [I18nKey.licenseLink]: '許可連結',
  [I18nKey.licenseNotice]: '商業轉載請聯絡作者獲得授權，非商業轉載請註明出處。',
  [I18nKey.copyLink]: '複製連結',
  [I18nKey.linkCopied]: '連結已複製',

  // Admonitions (Callouts)
  [I18nKey.admonitionNote]: '注意',
  [I18nKey.admonitionTip]: '提示',
  [I18nKey.admonitionImportant]: '重要',
  [I18nKey.admonitionWarning]: '警告',
  [I18nKey.admonitionCaution]: '小心',
}
