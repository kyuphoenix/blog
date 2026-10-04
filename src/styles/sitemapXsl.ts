/**
 * XML Sitemap 可视化 XSL 样式表
 * 当在浏览器中直接打开 /sitemap.xml 时，浏览器会自动解析并渲染该美化样式
 */
export const sitemapXsl = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:html="http://www.w3.org/TR/REC-html40"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>XML Sitemap - 站点地图</title>
        <style>
          :root {
            --primary: #7c3aed;
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border: #e2e8f0;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --primary: #a78bfa;
              --bg: #0f172a;
              --card-bg: #1e293b;
              --text-main: #f8fafc;
              --text-muted: #94a3b8;
              --border: #334155;
            }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            padding: 2rem 1rem;
            line-height: 1.6;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            background: var(--card-bg);
            padding: 2rem;
            border-radius: 1rem;
            border: 1px solid var(--border);
            margin-bottom: 1.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .header h1 {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 0.5rem;
          }
          .header p {
            color: var(--text-muted);
            font-size: 0.95rem;
          }
          .stats {
            display: inline-block;
            margin-top: 0.75rem;
            padding: 0.25rem 0.75rem;
            background: rgba(124, 58, 237, 0.1);
            color: var(--primary);
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 600;
          }
          .table-wrapper {
            background: var(--card-bg);
            border-radius: 1rem;
            border: 1px solid var(--border);
            overflow-x: auto;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.9rem;
          }
          th {
            background: rgba(0, 0, 0, 0.02);
            padding: 0.875rem 1rem;
            font-weight: 600;
            color: var(--text-muted);
            border-bottom: 1px solid var(--border);
          }
          td {
            padding: 0.875rem 1rem;
            border-bottom: 1px solid var(--border);
          }
          tr:last-child td {
            border-bottom: none;
          }
          tr:hover td {
            background: rgba(124, 58, 237, 0.03);
          }
          a {
            color: var(--primary);
            text-decoration: none;
            word-break: break-all;
          }
          a:hover {
            text-decoration: underline;
          }
          .badge {
            display: inline-block;
            padding: 0.15rem 0.5rem;
            border-radius: 0.375rem;
            font-size: 0.75rem;
            font-weight: 600;
            background: rgba(0,0,0,0.05);
            color: var(--text-muted);
          }
          .footer-nav {
            margin-top: 1.5rem;
            text-align: center;
          }
          .footer-nav a {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1.25rem;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            font-weight: 600;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>XML 站点地图 (Sitemap)</h1>
            <p>本 XML 站点地图由博客系统实时生成，遵循 sitemaps.org 标准协议，供搜索引擎爬虫自动抓取索引。</p>
            <div class="stats">
              共收录 <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> 个有效链接
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style="width: 55%;">页面 URL</th>
                  <th style="width: 15%;">优先级</th>
                  <th style="width: 15%;">更新频次</th>
                  <th style="width: 15%;">最后修改</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td>
                      <a href="{sitemap:loc}">
                        <xsl:value-of select="sitemap:loc"/>
                      </a>
                    </td>
                    <td>
                      <span class="badge">
                        <xsl:value-of select="sitemap:priority"/>
                      </span>
                    </td>
                    <td>
                      <span class="badge">
                        <xsl:value-of select="sitemap:changefreq"/>
                      </span>
                    </td>
                    <td style="color: var(--text-muted); font-size: 0.85rem;">
                      <xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
          <div class="footer-nav">
            <a href="/">← 返回博客首页</a>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
`
