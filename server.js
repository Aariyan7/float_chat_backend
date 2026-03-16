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


app.post("/api/queryClassification", async (req, res) => {
  try {
    const { message } = req.body;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role:"system",
          content: `You are a query classification assistant for an ocean data AI system.

                    Your job is to classify the user's query into exactly ONE of the following categories:

                    DATA_QUERY
                    The user is asking for ocean data that must be retrieved from a database.
                    Examples:
                    - Show salinity profiles near the equator
                    - Compare BGC parameters in the Arabian Sea
                    - Find ARGO floats near India
                    - Plot temperature variation from 2015 to 2025

                    KNOWLEDGE_QUERY
                    The user is asking for conceptual explanations or documentation about ocean science, ARGO floats, or oceanographic concepts.
                    Examples:
                    - What is an ARGO float?
                    - What does salinity mean?
                    - How do ARGO floats work?
                    - What is the thermocline?

                    HYBRID_QUERY
                    The user asks for both data and explanation. These queries require retrieving data AND explaining the results.
                    Examples:
                    - Why does temperature decrease with depth in the ocean?
                    - Explain the temperature trend between 2015 and 2025
                    - Why are salinity levels different near the equator?

                    IMPORTANT RULES:
                    - Return ONLY the category name.
                    - Do NOT explain your reasoning.
                    - Do NOT return extra text.
                    - Output must be exactly one of:
                    DATA_QUERY
                    KNOWLEDGE_QUERY
                    HYBRID_QUERY`
        },
        {
          role: "user",
          content: message,
        }
      ],
      model: "llama-3.1-8b-instant"
    });

    res.json({
      reply: completion.choices[0].message.content,
    })

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong "});
  }
})

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