require('dotenv').config({ path: '.env.local' });
async function main() {
  console.log("Testing STT...");
  try {
    const fs = require('fs');
    // We need a dummy audio file. Let's create an empty webm or raw file.
    // Actually, sending invalid audio will return 400 but at least verify the endpoint exists.
    
    const formData = new FormData();
    const blob = new Blob(["dummy audio data"], { type: "audio/webm" });
    formData.append("file", blob, "dummy.webm");
    formData.append("model", "deepgram/nova-3");

    const res = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: formData
    });
    if (!res.ok) {
      console.log("STT Error:", res.status, await res.text());
    } else {
      console.log("STT Success!", await res.json());
    }
  } catch(e) {
    console.error("STT Failed:", e.message);
  }
}
main();
