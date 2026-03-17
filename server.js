import express, { json } from "express";
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
    res.status(500).json({ error: "Something went wrong", message: error});
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
    res.status(500).json({ error: "Something went wrong", message: error });
  }
});


app.post("/api/chat/dataQuery", async (req, res) => {
   try {
    const { message } = req.body;

    const completion = await groq.chat.completions.create({
      messages: [
        {
            role: 'system',
            content: `You are an expert SQL generator and data analyst for an ocean data system.

                      Your job is to convert user questions into optimized MySQL queries AND decide how the result should be visualized.

                      DATABASE SCHEMA:

                      Table: floats
                      - float_id (INT, PRIMARY KEY)
                      - deployment_date (DATE)
                      - region (VARCHAR)
                      - latitude (FLOAT)
                      - longitude (FLOAT)

                      Table: profiles
                      - id (BIGINT, PRIMARY KEY)
                      - profile_id (INT)
                      - float_id (INT, FOREIGN KEY → floats.float_id)
                      - time (TIMESTAMP)
                      - latitude (DOUBLE)
                      - longitude (DOUBLE)
                      - depth (DOUBLE)
                      - temperature (DOUBLE)
                      - salinity (DOUBLE)

                      ---

                      IMPORTANT RULES:

                      1. NEVER return raw large datasets.
                      2. ALWAYS aggregate data when result can exceed 1000 rows.
                      3. Use GROUP BY for time-series, depth, or region-based queries.
                      4. Use LIMIT when needed.
                      5. Prefer AVG(), MIN(), MAX() for trends.
                      6. Use DATE(time) or YEAR(time) when grouping by time.
                      7. Depth-based queries → GROUP BY depth.
                      8. Time-series queries → GROUP BY DATE(time).
                      9. Always ORDER results properly.

                      ---

                     OUTPUT RULES (VERY STRICT):

                    - Return ONLY valid JSON
                    - Do NOT include any explanation
                    - Do NOT include markdown or backticks
                    - Do NOT wrap JSON inside a string
                    - Do NOT add any extra text before or after JSON
                    - The response must start with { and end with }
                    - If you violate this, the output is invalid

                    Return ONLY JSON

                      ---

                      LOGIC:

                      - If the query asks for trends, variation, comparison → return "graph"
                      - If the query asks for a single value → return "scalar"
                      - If spatial → use "map"
                      - If depth vs parameter → use "depth_profile"

                      ---

                      EXAMPLES:

                      User: How temperature varies in 2005

                      Output:
                      {
                        "type": "graph",
                        "chart": "line",
                        "sql": "SELECT DATE(time) as date, AVG(temperature) as avg_temp FROM profiles WHERE YEAR(time)=2005 GROUP BY DATE(time) ORDER BY date",
                        "x": "date",
                        "y": "avg_temp",
                        "data_description": "Average daily temperature for year 2005"
                      }

                      ---

                      User: What is average temperature in 2005

                      Output:
                      {
                        "type": "scalar",
                        "chart": "none",
                        "sql": "SELECT AVG(temperature) as avg_temp FROM profiles WHERE YEAR(time)=2005",
                        "x": "",
                        "y": "avg_temp",
                        "data_description": "Average temperature in 2005"
                      }

                      ---

                      User: Show temperature vs depth

                      Output:
                      {
                        "type": "graph",
                        "chart": "depth_profile",
                        "sql": "SELECT depth, AVG(temperature) as temperature FROM profiles GROUP BY depth ORDER BY depth",
                        "x": "temperature",
                        "y": "depth",
                        "data_description": "Temperature variation with depth"
                      }

                      ---

                      User: Show floats near India

                      Output:
                      {
                        "type": "graph",
                        "chart": "map",
                        "sql": "SELECT latitude, longitude FROM floats WHERE latitude BETWEEN 5 AND 30 AND longitude BETWEEN 60 AND 100 LIMIT 500",
                        "x": "longitude",
                        "y": "latitude",
                        "data_description": "Float locations near India"
                      }
                    Now generate the output for the following user query.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    const data = JSON.parse(completion.choices[0].message.content);

    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong", message: error});
  } 
});


app.post("/api/chat/hybridQuery", async (req, res) => {
  try {
    const { message } = req.body;

    const completion = await groq.chat.completions.create({
      messages: [
        {
            role: 'system',
            content: `You are an expert ocean data analyst and SQL generator.

                      Your job is to:
                      1. Generate an optimized MySQL query to retrieve relevant data
                      2. Provide a clear explanation based on expected data trends

                      ---

                      DATABASE SCHEMA:

                      Table: floats
                      - float_id (INT, PRIMARY KEY)
                      - deployment_date (DATE)
                      - region (VARCHAR)
                      - latitude (FLOAT)
                      - longitude (FLOAT)

                      Table: profiles
                      - id (BIGINT, PRIMARY KEY)
                      - profile_id (INT)
                      - float_id (INT, FOREIGN KEY → floats.float_id)
                      - time (TIMESTAMP)
                      - latitude (DOUBLE)
                      - longitude (DOUBLE)
                      - depth (DOUBLE)
                      - temperature (DOUBLE)
                      - salinity (DOUBLE)

                      ---

                      IMPORTANT RULES:

                      - ALWAYS aggregate large datasets
                      - NEVER return raw large data
                      - Use GROUP BY for trends
                      - Use AVG(), MIN(), MAX() when appropriate
                      - Time-based queries → GROUP BY DATE(time)
                      - Depth-based queries → GROUP BY depth
                      - Limit results if needed

                      ---

                      OUTPUT FORMAT (STRICT JSON):

                      {
                        "type": "hybrid",
                        "chart": "line | depth_profile | map",
                        "sql": "SQL QUERY",
                        "x": "column_name",
                        "y": "column_name",
                        "explanation": "clear natural language explanation of expected trend",
                        "data_description": "what the query returns"
                      }

                      ---

                      EXPLANATION RULES:

                      - Explain the trend logically (not just restate the query)
                      - Mention oceanographic reasoning if possible
                      - Keep it concise (2–4 lines)
                      - Do NOT say "based on the query"
                      - Do NOT include SQL in explanation

                      ---

                      OUTPUT RULES (VERY STRICT):

                      - Return ONLY valid JSON
                      - Do NOT include markdown
                      - Do NOT wrap JSON in a string
                      - Do NOT add extra text
                      - Response must start with { and end with }

                      ---

                      EXAMPLE:

                      User: Why does temperature decrease with depth?

                      Output:
                      {
                        "type": "hybrid",
                        "chart": "depth_profile",
                        "sql": "SELECT depth, AVG(temperature) as temperature FROM profiles GROUP BY depth ORDER BY depth",
                        "x": "temperature",
                        "y": "depth",
                        "explanation": "Temperature decreases with depth because sunlight heats only the surface layers. Deeper water receives less solar radiation, leading to colder temperatures.",
                        "data_description": "Average temperature at different depths"
                      }

                    `,
        },
        {
          role: "user",
          content: message,
        },
      ],
      model: "llama-3.3-70b-versatile",
    });

    const data = JSON.parse(completion.choices[0].message.content);

    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong", message: error });
  }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});