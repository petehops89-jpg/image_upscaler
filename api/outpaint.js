export default async function handler(req, res) {
  try {
    const { imageBase64 } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN;

    // Outpaint
    const outpaint = await fetch("https://api-inference.huggingface.co/models/ruffy369/propainter", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: imageBase64 })
    });

    const outData = await outpaint.json();
    const outImg = outData[0]?.generated_image;

    if (!outImg) throw new Error("Outpaint failed");

    // Upscale
    const upscale = await fetch("https://api-inference.huggingface.co/models/aaronespasa/drct-super-resolution", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: outImg })
    });

    const upData = await upscale.json();
    const finalImage = upData[0]?.generated_image;

    if (!finalImage) throw new Error("Upscale failed");

    res.status(200).json({ finalImage });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}