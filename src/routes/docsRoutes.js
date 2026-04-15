const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const router = express.Router();
const DOCS_DIR = path.resolve(__dirname, '../../docs');
const DOC_PAGES = [
  { slug: 'system-overview', title: 'System Overview' },
  { slug: 'subscription-flow', title: 'Subscription Flow' },
  { slug: 'testing-bruno', title: 'Testing with Bruno' },
];

function escapeHtml(input) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderLayout(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { margin-bottom: 0.5rem; }
    ul { padding-left: 1.25rem; }
    pre { white-space: pre-wrap; background: #f7f7f8; padding: 1rem; border-radius: 8px; }
    a { color: #0969da; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

router.get('/', (_req, res) => {
  const links = DOC_PAGES.map(
    (doc) => `<li><a href="/docs/${doc.slug}">${escapeHtml(doc.title)}</a></li>`
  ).join('');

  const html = renderLayout(
    'Express Midtrans Docs',
    `<h1>Express Midtrans Docs</h1>
<p>Documentation pages for system architecture, subscription behavior, and Bruno testing flow.</p>
<ul>${links}</ul>`
  );
  res.type('html').send(html);
});

router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ message: 'Invalid docs path' });
  }

  const doc = DOC_PAGES.find((page) => page.slug === slug);
  if (!doc) {
    return res.status(404).json({ message: 'Docs page not found' });
  }

  try {
    const filePath = path.join(DOCS_DIR, `${slug}.md`);
    const markdown = await fs.readFile(filePath, 'utf8');
    const html = renderLayout(
      doc.title,
      `<p><a href="/docs">Back to docs index</a></p>
<h1>${escapeHtml(doc.title)}</h1>
<pre>${escapeHtml(markdown)}</pre>`
    );
    return res.type('html').send(html);
  } catch {
    return res.status(404).json({ message: 'Docs file not found' });
  }
});

module.exports = router;
