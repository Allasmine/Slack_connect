import express from "express";
import db from "../db.js";
import axios from "axios";

const router = express.Router();

// Immediate send
router.post("/message/send", async (req, res) => {
  const { channel, text, userId } = req.body;

  if (!channel || !text || !userId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.get("SELECT access_token FROM users WHERE slack_user_id = ?", [userId], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: "User not found" });

    try {
      const response = await axios.post(
        "https://slack.com/api/chat.postMessage",
        { channel, text },
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: error.response?.data || error.message });
    }
  });
});

// Schedule message
router.post("/message/schedule", (req, res) => {
  const { channel, text, sendAt, userId } = req.body;

  if (!channel || !text || !sendAt || !userId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  db.run(
    `INSERT INTO scheduled_messages (channel, text, send_at, user_id) VALUES (?, ?, ?, ?)`,
    [channel, text, Math.floor(new Date(sendAt).getTime() / 1000), userId],
    function (err) {
      if (err) {
        console.error("Error scheduling message:", err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

export default router;
