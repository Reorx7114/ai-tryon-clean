console.log("HAS MIJIANG_TEST:", process.env.MIJIANG_TEST);

import dotenv from 'dotenv';
dotenv.config();

console.log("MIJIANG TEST VERSION 123");
console.log("OPENAI_API_KEY loaded:", !!process.env.OPENAI_API_KEY);

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function makePrompt(productName, note) {
  return [
    'Create a realistic commercial virtual try-on image for Korean fashion.',
    'Use image 1 as the customer/person reference. Preserve face identity, hairstyle, body proportion, pose, camera angle, background, and lighting as much as possible.',
    'Use image 2 as the clothing/product reference. Transfer the outfit onto the person naturally, preserving color, fabric texture, collar, sleeve style, silhouette, and overall design.',
    `Product name: ${productName || 'Korean fashion item'}.`,
    note ? `Extra requirement: ${note}` : '',
    'Do not add text, logos, watermark, borders, before-after layout, or extra people. Make it look like a real photo, not an AI demo.'
  ].filter(Boolean).join('\n');
}

function demoSvg(productName) {
  const safe = String(productName || 'Korean fashion try-on').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1365" viewBox="0 0 1024 1365">
  <rect width="1024" height="1365" fill="#fff7ed"/>
  <circle cx="512" cy="240" r="88" fill="#f1c29a"/>
  <path d="M370 420 C420 340 604 340 654 420 L720 1010 C728 1088 296 1088 304 1010 Z" fill="#f9a8d4"/>
  <path d="M380 424 C435 472 590 472 644 424" stroke="#fff" stroke-width="18" fill="none" stroke-linecap="round"/>
  <rect x="130" y="1090" width="764" height="150" rx="32" fill="#fff" opacity="0.92"/>
  <text x="512" y="1148" text-anchor="middle" font-family="Arial" font-size="34" font-weight="700" fill="#111827">Demo Mode Preview</text>
  <text x="512" y="1195" text-anchor="middle" font-family="Arial" font-size="24" fill="#475569">${safe}</text>
  <text x="512" y="1265" text-anchor="middle" font-family="Arial" font-size="20" fill="#64748b">Add OPENAI_API_KEY in Railway Variables to generate real try-on images.</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
  });
});

app.post('/api/tryon', async (req, res) => {
  try {
    const { personImage, clothingImage, productName, styleNote } = req.body || {};
    if (!personImage || !clothingImage) {
      return res.status(400).json({ ok: false, error: '請上傳人物照片與商品圖片。' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.json({
        ok: true,
        demoMode: true,
        provider: 'demo',
        imageUrl: demoSvg(productName),
        message: '目前是 Demo 模式：Railway 尚未設定 OPENAI_API_KEY。'
      });
    }

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
        images: [
          { image_url: personImage },
          { image_url: clothingImage }
        ],
        prompt: makePrompt(productName, styleNote),
        size: '1024x1536',
        n: 1,
        output_format: 'png'
      })
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!response.ok) {
      const msg = data?.error?.message || text || `${response.status} ${response.statusText}`;
      return res.status(500).json({ ok: false, error: msg });
    }

    const item = data?.data?.[0];
    const imageUrl = item?.b64_json ? `data:image/png;base64,${item.b64_json}` : item?.url;
    if (!imageUrl) {
      return res.status(500).json({ ok: false, error: 'OpenAI 沒有回傳圖片。' });
    }

    res.json({ ok: true, demoMode: false, provider: 'openai', imageUrl, message: '已產生 AI 試穿圖。' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI Try-On server running on port ${PORT}`);
  console.log(`OPENAI_API_KEY loaded: ${Boolean(process.env.OPENAI_API_KEY)}`);
});
