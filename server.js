import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Initialize Express ----
const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---- Serve frontend ----
app.use(express.static(__dirname));
// Serve templates folder statically under /templates
app.use('/templates', express.static(path.join(__dirname, 'templates')));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Admin Dashboard Route
app.get("/admin_dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "admin_dashboard.html"));
});

// Admin Login Route
app.get("/admin_login", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "admin_login.html"));
});

// Admin Settings Route
app.get("/admin_settings", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "admin_settings.html"));
});

// Appointment Management Route
app.get("/appointment_management", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "appointment_management.html"));
});

// Doctor Management Route
app.get("/doctor_management", (req, res) => {
  res.sendFile(path.join(__dirname, "templates", "doctor_management.html"));
});

// ---- OpenAI client ----
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---- Health check ----
app.get("/api/ping", (req, res) => {
  res.json({ status: "online" });
});

// ---- Suggestions ----
app.post("/api/suggest", async (req, res) => {
  try {
    const text = req.body.text || "";

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a medical assistant. Ask only follow-up questions."
        },
        { role: "user", content: text }
      ]
    });

    const out = completion.choices[0].message.content;
    const suggestions = out.split(/\n|•|-/).map(s => s.trim()).filter(Boolean);

    res.json({ suggestions });
  } catch (error) {
    console.error("SUGGEST ERROR:", error);
    res.json({ suggestions: [] });
  }
});

// ---- Triage ----
app.post("/api/chat", async (req, res) => {
  const { text, age, extra } = req.body;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a medical assistant.
Ask follow-up questions only.
Do NOT diagnose.`
        },
        {
          role: "user",
          content: `Symptoms: ${text} | Age: ${age} | Duration: ${extra?.duration} | Severity: ${extra?.severity}`
        }
      ]
    });

    const raw = completion.choices[0].message.content;
    res.json({
      answer: raw,
      triage: "SEE_GP",
      reason: "Follow-up questions provided.",
      actions: ["Provide answers to follow-up questions"],
      timestamp: new Date().toLocaleString()
    });

  } catch (error) {
    console.error("TRIAGE ERROR:", error);
    res.status(500).json({ error: "AI unavailable" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
