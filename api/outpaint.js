export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key is set in Vercel environment variables
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN not set in Vercel environment variables' });
  }

  const { imageBase64 } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  try {
    // Step 1: Outpaint
    const outpaintRes = await fetch(
      'https://api-inference.huggingface.co/models/ruffy369/propainter',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: imageBase64 })
      }
    );

    let outData;
    try {
      outData = await outpaintRes.json();
    } catch (parseErr) {
      return res.status(502).json({ error: 'Outpaint model returned unparseable response' });
    }

    if (!outpaintRes.ok) {
      const hfError = outData?.error || `HuggingFace outpaint error ${outpaintRes.status}`;
      return res.status(outpaintRes.status).json({ error: hfError });
    }

    const outImg = outData[0]?.generated_image;
    if (!outImg) {
      return res.status(502).json({ error: 'Outpaint model returned no image' });
    }

    // Step 2: Upscale
    const upscaleRes = await fetch(
      'https://api-inference.huggingface.co/models/aaronespasa/drct-super-resolution',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputs: outImg })
      }
    );

    let upData;
    try {
      upData = await upscaleRes.json();
    } catch (parseErr) {
      return res.status(502).json({ error: 'Upscale model returned unparseable response' });
    }

    if (!upscaleRes.ok) {
      const hfError = upData?.error || `HuggingFace upscale error ${upscaleRes.status}`;
      return res.status(upscaleRes.status).json({ error: hfError });
    }

    const finalImage = upData[0]?.generated_image;
    if (!finalImage) {
      return res.status(502).json({ error: 'Upscale model returned no image' });
    }

    return res.status(200).json({ finalImage });

  } catch (err) {
    return res.status(503).json({ error: 'Could not reach HuggingFace API: ' + err.message });
  }
}
