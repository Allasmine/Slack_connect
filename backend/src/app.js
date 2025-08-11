import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import ngrok from "ngrok";  // ✅ new
import authRoutes from "./routes/auth.js";
import messageRoutes from "./routes/message.js";
import db from "./db.js";
import "./scheduler.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/", authRoutes);
app.use("/", messageRoutes);

// Debug routes
app.get("/debug/clear-users", (req, res) => {
  db.run("DELETE FROM users", [], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "All users deleted" });
  });
});

app.get("/debug/users", (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Start server + ngrok
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Connected to SQLite database`);

  // Start ngrok
  const url = await ngrok.connect({
    addr: PORT,
    authtoken: process.env.NGROK_AUTHTOKEN, // add this to your .env
  });

  console.log(`🌍 Public URL: ${url}`);
  process.env.BASE_URL = url; // so the rest of the app uses it
});
