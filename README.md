# image_upscaler
Bulk Image upscaler
Outpaint Batch App

A mobile-friendly web app that automatically converts images to 16:9, outpaints missing areas using AI, upscales them, and lets you download all results as a ZIP.

---

🚀 Features

- Batch upload multiple images
- Automatic 16:9 padding
- AI outpainting (fills missing areas)
- AI upscaling (improves resolution)
- Per-image progress + error handling
- Download all processed images as a ZIP
- Works on mobile and desktop
- Fully deployed via Vercel (no local setup)

---

🧠 How It Works

1. Upload images
2. Images are padded to 16:9 in the browser
3. Sent to serverless API
4. AI outpaints missing areas
5. Result is upscaled
6. Images displayed and downloadable

---

🛠 Tech Stack

- Next.js (frontend + API routes)
- Hugging Face Inference API (AI models)
- Vercel (hosting + serverless)
- JSZip (download ZIP)

---

📁 Project Structure

outpaint-batch-app/
 ├─ package.json
 ├─ /pages
 │    └─ index.js
 └─ /api
      └─ outpaint.js

---

⚙️ Setup (No Terminal Required)

1. Create a GitHub repo
2. Add the project files
3. Connect repo to Vercel
4. Add environment variable:

HF_TOKEN = your_huggingface_token

5. Deploy

---

📱 Usage

1. Open your deployed app
2. Upload or drag images
3. Click Process Batch
4. Wait for processing
5. Click Download All as ZIP

---

⚠️ Notes

- Free tier limits apply (Hugging Face + Vercel)
- Large images may process slower on mobile
- Best performance with small batches (2–5 images)

---

🔐 Security

- Your Hugging Face token is stored securely in Vercel environment variables
- Never expose your token in frontend code

---

📌 Future Improvements

- Progress bars per image
- Parallel processing
- Better prompt control for outpainting
- Image preview before processing

---

📄 License

Free to use and modify.
