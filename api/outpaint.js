export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { imageBase64 } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN;

    // Step 1: Outpainting
    const outpaintModel = "ruffy369/propainter";
    const outpaintResp = await fetch(`https://api-inference.huggingface.co/models/${outpaintModel}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: imageBase64, options: { wait_for_model: true } }),
    });
    const outpaintData = await outpaintResp.json();
    const outpaintBase64 = outpaintData[0]?.generated_image;
    if (!outpaintBase64) throw new Error("Outpaint failed");

    // Step 2: Upscaling
    const upscaleModel = "aaronespasa/drct-super-resolution";
    const upscaleResp = await fetch(`https://api-inference.huggingface.co/models/${upscaleModel}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: outpaintBase64, options: { wait_for_model: true } }),
    });
    const upscaleData = await upscaleResp.json();
    const finalBase64 = upscaleData[0]?.generated_image;
    if (!finalBase64) throw new Error("Upscale failed");

    res.status(200).json({ finalImage: finalBase64 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Processing failed" });
  }
}