import { I18nKey, Translation } from '../i18nKey.js'

export const ja: Translation = {
  // Navigation & Global
  [I18nKey.home]: 'ホーム',
  [I18nKey.about]: 'アバウト',
  [I18nKey.archive]: 'アーカイブ',
  [I18nKey.links]: 'リンク',
  [I18nKey.search]: '検索',

  // Sidebar & Widgets
  [I18nKey.tags]: 'タグ',
  [I18nKey.categories]: 'カテゴリ',
  [I18nKey.recentPosts]: '最近の記事',
  [I18nKey.profile]: 'プロフィール',
  [I18nKey.profileView]: 'プロフィールを見る',

  // Posts & Content
  [I18nKey.untitled]: 'タイトルなし',
  [I18nKey.uncategorized]: '未分類',
  [I18nKey.noTags]: 'タグなし',
  [I18nKey.wordCount]: '文字',
  [I18nKey.wordsCount]: '文字',
  [I18nKey.minuteCount]: '分',
  [I18nKey.minutesCount]: '分',
  [I18nKey.postCount]: '件の記事',
  [I18nKey.postsCount]: '件の記事',
  [I18nKey.postsCountTotal]: '（全 {count} 件）',
  [I18nKey.viewsCount]: '回閲覧',
  [I18nKey.author]: '著者',
  [I18nKey.publishedAt]: '公開日',
  [I18nKey.updatedAt]: '更新日',
  [I18nKey.readingTime]: '読了目安',
  [I18nKey.postSummary]: '記事の要約',
  [I18nKey.prevPost]: '前の記事',
  [I18nKey.nextPost]: '次の記事',
  [I18nKey.prevPage]: '前のページ',
  [I18nKey.nextPage]: '次のページ',
  [I18nKey.filterCategory]: 'カテゴリ：{category}',
  [I18nKey.filterTag]: 'タグ：#{tag}',
  [I18nKey.clearFilter]: '✕ フィルター解除',
  [I18nKey.noPosts]: '記事がありません',
  [I18nKey.backToHome]: 'ホームに戻る',
  [I18nKey.pageNotFound]: '404 - ページが見つかりません',
  [I18nKey.pageNotFoundDesc]: '申し訳ありませんが、お探しのページは存在しないか削除されました。',
  [I18nKey.postNotFound]: '404 - 記事が見つかりません',
  [I18nKey.postNotFoundDesc]: '申し訳ありませんが、指定された記事は存在しないか非公開です。',
  [I18nKey.post]: '現在の記事',
  [I18nKey.page]: '現在のページ',

  // Archive
  [I18nKey.archiveTitle]: 'アーカイブ',
  [I18nKey.archiveSubtitle]: '全 {count} 件の記事アーカイブと年別タイムライン',

  // Links
  [I18nKey.linksTitle]: 'リンク集',
  [I18nKey.linksSubtitle]: '相互リンク歓迎！お気軽にリンク交換をご申請ください。',
  [I18nKey.applyLinks]: 'リンク申請',
  [I18nKey.applyRules]: '相互リンクについて',
  [I18nKey.applyRulesSubtitle]: '相互リンク歓迎 · オリジナル内容',
  [I18nKey.siteInfo]: '📋 当サイト情報（先に追加をお願いします）',
  [I18nKey.siteName]: 'サイト名',
  [I18nKey.siteDesc]: '説明',
  [I18nKey.siteUrl]: 'URL',
  [I18nKey.siteAvatar]: 'アイコン',
  [I18nKey.copySiteInfo]: 'サイト情報をコピー',
  [I18nKey.applyTemplate]: '📝 申請フォーマット',
  [I18nKey.copyApplyTemplate]: 'フォーマットをコピー',
  [I18nKey.emailApply]: '📧 メールで申請（推奨）',
  [I18nKey.emailApplyDesc]: '下のボタンをクリックしてメールソフトを起動し、テンプレートを入力して送信してください：',
  [I18nKey.sendEmail]: 'メールを送信',
  [I18nKey.copyEmail]: 'メールアドレスをコピー',
  [I18nKey.noPublicEmail]: 'メールアドレスは非公開です',
  [I18nKey.commentApply]: '💬 コメントで申請',
  [I18nKey.commentApplyDesc]: '下のコメント欄（Giscus）からも申請いただけます：',
  [I18nKey.expandComments]: 'コメント欄を展開',
  [I18nKey.collapseComments]: 'コメント欄を閉じる',
  [I18nKey.copied]: '✓ コピーしました',
  [I18nKey.collapseRules]: 'ルールを閉じる',

  // Search & Dialog
  [I18nKey.searchArticles]: '記事を検索...',
  [I18nKey.searchPlaceholder]: 'キーワードを入力して検索...',
  [I18nKey.searchStart]: 'キーワードを入力して検索を開始',
  [I18nKey.searching]: '検索中...',
  [I18nKey.searchNoResults]: '一致する記事が見つかりませんでした',
  [I18nKey.searchError]: '検索エラーが発生しました',

  // Theme & Appearance
  [I18nKey.themeColor]: 'テーマカラー',
  [I18nKey.themeSetting]: 'テーマカラー設定',
  [I18nKey.themeHue]: '色相',
  [I18nKey.resetHue]: 'デフォルトに戻す',
  [I18nKey.toggleTheme]: 'テーマ切り替え',
  [I18nKey.lightMode]: 'ライト',
  [I18nKey.darkMode]: 'ダーク',
  [I18nKey.systemMode]: 'システム',
  [I18nKey.more]: 'もっと見る',
  [I18nKey.openMenu]: 'メニューを開く',
  [I18nKey.backToTop]: 'トップへ戻る',

  // Comments
  [I18nKey.comments]: 'コメント',
  [I18nKey.commentsNotConfigured]: 'Giscusコメントは未設定です',
  [I18nKey.commentsCommonFormats]: '書式:',
  [I18nKey.commentsSyntaxGuide]: '💡 構文ヘルプ',

  // Accessibility & Controls
  [I18nKey.closeMenu]: 'メニューを閉じる',
  [I18nKey.closeSearch]: '検索を閉じる',
  [I18nKey.toc]: '目次',
  [I18nKey.closeToc]: '目次を閉じる',

  // Code Block
  [I18nKey.copyCode]: 'コードをコピー',
  [I18nKey.codeCopied]: 'コピー完了',

  // Article License (CC-BY-NC-SA 4.0)
  [I18nKey.licenseTitle]: 'ライセンス',
  [I18nKey.licenseAuthor]: '著者',
  [I18nKey.licensePublished]: '公開日',
  [I18nKey.licenseLink]: '記事URL',
  [I18nKey.licenseNotice]: '商用利用は著者の許可が必要です。非商用利用の場合は出展を明記してください。',
  [I18nKey.copyLink]: 'URLをコピー',
  [I18nKey.linkCopied]: 'URLをコピーしました',

  // Admonitions (Callouts)
  [I18nKey.admonitionNote]: '注意',
  [I18nKey.admonitionTip]: 'ヒント',
  [I18nKey.admonitionImportant]: '重要',
  [I18nKey.admonitionWarning]: '警告',
  [I18nKey.admonitionCaution]: '危険',
}
