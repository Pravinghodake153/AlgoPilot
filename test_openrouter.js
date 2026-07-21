const apiKey = process.env.OPENROUTER_API_KEY;
fetch("https://openrouter.ai/api/v1/models", {
  headers: { "Authorization": `Bearer ${apiKey}` }
})
.then(r => r.json())
.then(data => {
  if (data.data) {
    const models = data.data.filter(m => m.id.toLowerCase().includes("deepgram") || m.id.toLowerCase().includes("kokoro") || m.id.toLowerCase().includes("nova") || m.id.toLowerCase().includes("hexgrad"));
    console.log(JSON.stringify(models.map(m => m.id), null, 2));
  } else {
    console.log("No data:", data);
  }
});
