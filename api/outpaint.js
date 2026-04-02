export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN not set in Vercel environment variables' });
  }

  const { imageBase64 } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  const SPACE = 'https://akhaliq-real-esrgan.hf.space';
  const headers = {
    'Authorization': `Bearer ${HF_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // Step 1: Upload the image as a base64 data URL to the Gradio /upload endpoint
    const uploadRes = await fetch(`${SPACE}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([`data:image/png;base64,${imageBase64}`])
    });

    let uploadData;
    try {
      uploadData = await uploadRes.json();
    } catch (e) {
      return res.status(502).json({ error: 'Upload response unparseable' });
    }

    if (!uploadRes.ok) {
      return res.status(uploadRes.status).json({ error: uploadData?.error || `Upload failed ${uploadRes.status}` });
    }

    // uploadData is an array of file paths on the Space server
    const filePath = Array.isArray(uploadData) ? uploadData[0] : uploadData;
    if (!filePath) {
      return res.status(502).json({ error: 'Upload returned no file path' });
    }

    // Step 2: POST to /gradio_api/call/predict with the uploaded file reference
    const predictRes = await fetch(`${SPACE}/gradio_api/call/predict`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: [
          { path: filePath }
        ]
      })
    });

    let predictData;
    try {
      predictData = await predictRes.json();
    } catch (e) {
      return res.status(502).json({ error: 'Predict response unparseable' });
    }

    if (!predictRes.ok) {
      return res.status(predictRes.status).json({ error: predictData?.error || `Predict failed ${predictRes.status}` });
    }

    const eventId = predictData?.event_id;
    if (!eventId) {
      return res.status(502).json({ error: 'No event_id returned. Response: ' + JSON.stringify(predictData).slice(0, 200) });
    }

    // Step 3: Poll GET to retrieve result (SSE stream, read until event: complete)
    const resultRes = await fetch(`${SPACE}/gradio_api/call/predict/${eventId}`, {
      headers: { 'Authorization': `Bearer ${HF_TOKEN}` }
    });

    if (!resultRes.ok) {
      return res.status(resultRes.status).json({ error: `Result fetch failed ${resultRes.status}` });
    }

    // Read SSE stream and find "event: complete"
    const text = await resultRes.text();
    const lines = text.split('\n');
    let resultData = null;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === 'event: complete' && lines[i + 1]?.startsWith('data:')) {
        try {
          resultData = JSON.parse(lines[i + 1].replace('data:', '').trim());
        } catch (e) {
          return res.status(502).json({ error: 'Could not parse result data', raw: lines[i + 1]?.slice(0, 200) });
        }
        break;
      }
    }

    if (!resultData) {
      return res.status(502).json({ error: 'No complete event in response', raw: text.slice(0, 500) });
    }

    // resultData[0] is the output file reference - fetch its actual bytes and return as base64
    const outputFile = resultData[0];
    const outputUrl = outputFile?.url || (typeof outputFile === 'string' ? outputFile : null);

    if (!outputUrl) {
      return res.status(502).json({ error: 'No output URL in result', raw: JSON.stringify(resultData).slice(0, 200) });
    }

    // Fetch the output image and convert to base64
    const imgRes = await fetch(outputUrl.startsWith('http') ? outputUrl : `${SPACE}${outputUrl}`, {
      headers: { 'Authorization': `Bearer ${HF_TOKEN}` }
    });

    if (!imgRes.ok) {
      return res.status(imgRes.status).json({ error: `Could not fetch output image: ${imgRes.status}` });
    }

    const imgBuffer = await imgRes.arrayBuffer();
    const imgBase64 = Buffer.from(imgBuffer).toString('base64');

    return res.status(200).json({ finalImage: imgBase64 });

  } catch (err) {
    return res.status(503).json({ error: 'Request failed: ' + err.message });
  }
}
