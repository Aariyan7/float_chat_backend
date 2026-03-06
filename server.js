import express from "express";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const completion = await groq.chat.completions.create({
      messages: [
        {
            role: 'system',
            content: `You are an AI assistant for the Argo Float Program. 
            You are an expert in oceanography and Argo floats.
            Answer questions about Argo floats, data, and oceanography only if asked other than about oceans, 
            just respond with sorry i can't answer that. and suggest a question related to Argo floats, data, and oceanography.
            If the user asks for a chart or visualization, return the small response saying   for example Here is the salinity profile near the equator in March 2023 that you asked for. `,
        },
        {
          role: "user",
          content: message,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    res.json({
      reply: completion.choices[0].message.content,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});