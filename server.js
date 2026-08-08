const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

// Memory Database for User History & Admin Monitoring
let userChatsDatabase = {};

// SYSTEM PROMPT: Creator Rules strictly handled here
const SYSTEM_PROMPT = `
Aapka naam Shiva AI hai. Aapko Ishan Shrivastav ne banaya hai.
CREATOR ATTRIBUTION RULES:
1. Agar user puchhe "Tujhe kisne banaya?", "Who created you?", "Who is your developer?", "Aapka owner kaun hai?", tabhi jawaab do: "Mujhe Ishan Shrivastav ne banaya hai."
2. General knowledge ya history questions par (jaise "Taj Mahal kisne banaya?", "C language kisne banayi?", "Buland Darwaza kisne banaya?"), KABHI BHI Ishan Shrivastav ka naam mat lena. Hamesha factually accurate jawab dena.
`;

// 1. Chat & Analysis API Endpoint
app.post('/api/chat', async (req, res) => {
  const { userId, message, imageBase64, fileName } = req.body;

  if (!userId) {
    return res.status(400).json({ reply: "User ID missing hai." });
  }

  if (!userChatsDatabase[userId]) {
    userChatsDatabase[userId] = [];
  }

  let fullPromptText = message || "";
  if (fileName) {
    fullPromptText = `[File Attached: ${fileName}]\n${fullPromptText}`;
  }

  const promptToSend = `${SYSTEM_PROMPT}\n\nUser Question: ${fullPromptText}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ 
        reply: "Shiva AI Backend setup alert: Render me GEMINI_API_KEY set nahi hai. Kripya environment variable add karein." 
      });
    }

    // Build Multimodal Payload for Gemini API
    const partsArray = [{ text: promptToSend }];
    
    if (imageBase64) {
      partsArray.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: imageBase64
        }
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: partsArray }]
      })
    });

    const data = await response.json();
    const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Shiva AI reply generate nahi kar paya. Kripya dobara try karein.";

    // Store in backend database for Admin Monitoring
    userChatsDatabase[userId].push({
      userMessage: fullPromptText,
      aiResponse: aiReply,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    });

    res.json({ reply: aiReply });
  } catch (error) {
    console.error("Chat Error:", error);
    res.status(500).json({ reply: "Server Error: Backend AI processing fail hua." });
  }
});

// 2. Admin Panel Verification & Chat Monitoring API
app.post('/api/admin/get-all-chats', (req, res) => {
  const { number, password } = req.body;
  if (number === "9801306038" && password === "IshanAdmin@234") {
    return res.json({ success: true, chats: userChatsDatabase });
  }
  res.status(401).json({ success: false, message: "Aapke Admin Credentials galat hain!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Shiva AI Server listening on port ${PORT}`));
