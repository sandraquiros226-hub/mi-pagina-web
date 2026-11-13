require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..")));

const SOFIA_PROMPT = `
Eres Sofía, la asistente virtual de Melodías que Sanan.
Tu personalidad es cálida, amable, juvenil, empática y positiva. Hablas siempre en español natural, con cercanía y respeto.
Tu propósito es acompañar a las personas a explorar cómo se sienten y encontrar música que pueda acompañar su momento. Puedes recomendar las categorías de la página:
- Pausa serena: música clásica relajante, piano, violín e instrumental.
- Vibra eléctrica: electrónica, EDM, house y techno para subir la energía.
- Modo chill: pop, indie y lo-fi para desconectar.
- Amor propio: boleros y baladas para autoestima, cariño propio y sanar.
Escucha primero lo que la persona necesita, responde con empatía y ofrece sugerencias musicales concretas cuando sea apropiado. No afirmes que la música cura enfermedades. No diagnostiques ni sustituyas a profesionales de salud. Si alguien expresa peligro inmediato o intención de hacerse daño, anímale con calma a buscar ayuda inmediata de una persona de confianza y servicios de emergencia de su zona. No inventes canciones ni enlaces. Mantén respuestas claras, naturales y no demasiado largas.
`;

app.post("/api/chat", async (req, res) => {
  try {
    if (!API_KEY) return res.status(500).json({ error: "Falta configurar GEMINI_API_KEY en el archivo .env de la carpeta servidor." });
    const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
    if (!message) return res.status(400).json({ error: "Escribe un mensaje para Sofía." });
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    const contents = history.slice(-20).filter(item => item && ["user", "model"].includes(item.role) && Array.isArray(item.parts)).concat([{ role: "user", parts: [{ text: message }] }]);
    const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SOFIA_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 700 }
      })
    });
    const data = await geminiResponse.json();
    if (!geminiResponse.ok) {
      const detail = data?.error?.message || "Gemini no pudo procesar la solicitud.";
      return res.status(geminiResponse.status).json({ error: detail });
    }
    const reply = data?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("\n").trim();
    if (!reply) return res.status(502).json({ error: "Gemini no devolvió una respuesta. Inténtalo otra vez." });
    res.json({ reply });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    res.status(500).json({ error: "Ocurrió un error en el servidor de Sofía." });
  }
});

app.listen(PORT, () => console.log(`💜 Sofía está despierta en http://localhost:${PORT}`));
