
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20kb" }));

// Serve frontend files
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "style.css"));
});

app.get("/script.js", (req, res) => {
    res.sendFile(path.join(__dirname, "script.js"));
});

// Groq AI chatbot
app.post("/api/chat", async (req, res) => {
    try {
        const { messages } = req.body;

        // Check API key
        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({
                error: "Groq API key is missing. Check your .env file."
            });
        }

        // Validate messages
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: "Please enter a message."
            });
        }

        // Convert frontend message roles into Groq roles
        const chatMessages = messages.slice(-12).map(message => {

            if (
                !["user", "model"].includes(message.role) ||
                typeof message.text !== "string" ||
                !message.text.trim()
            ) {
                throw new Error("Invalid chat message.");
            }

            return {
                role: message.role === "model" ? "assistant" : "user",
                content: message.text.slice(0, 3000)
            };
        });

        // Add chatbot instructions
        const groqMessages = [
            {
                role: "system",
                content: `You are a friendly AI assistant inside a weather
                forecast application. Help users understand weather,
                forecasts, climate and general questions.

                Give clear, simple and helpful answers.
                Never invent live weather conditions or claim to know
                a location's current weather unless that information
                is provided in the conversation.`
            },
            ...chatMessages
        ];

        // Send request to Groq
        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                },

                body: JSON.stringify({
                    model: "openai/gpt-oss-120b",
                    messages: groqMessages,
                    temperature: 0.7,
                    max_tokens: 700
                })
            }
        );

        const data = await response.json();

        // Handle Groq API errors
        if (!response.ok) {
            console.error("Groq API error:", data);

            return res.status(502).json({
                error: data.error?.message ||
                    "Groq could not generate a response."
            });
        }

        // Extract AI response
        const reply = data.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(502).json({
                error: "Groq returned an empty response."
            });
        }

        res.json({ reply });

    } catch (error) {

        console.error("Chatbot error:", error);

        res.status(500).json({
            error: error.message || "Something went wrong."
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(
        `Weather application running at http://localhost:${PORT}`
    );
});
