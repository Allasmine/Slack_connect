import db from "./db.js";
import axios from "axios";

setInterval(() => {
  console.log("⏳ Checking for scheduled messages...");

  const now = Math.floor(Date.now() / 1000);

  db.all(
    `SELECT sm.id, sm.channel, sm.text, sm.user_id, u.access_token
     FROM scheduled_messages sm
     JOIN users u ON sm.user_id = u.slack_user_id
     WHERE sm.sent = 0 AND sm.send_at <= ?`,
    [now],
    (err, rows) => {
      if (err) return console.error("DB error:", err.message);

      rows.forEach(async (msg) => {
        try {
          const response = await axios.post(
            "https://slack.com/api/chat.postMessage",
            {
              channel: msg.channel,
              text: msg.text,
            },
            {
              headers: {
                Authorization: `Bearer ${msg.access_token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.data.ok) {
            db.run(`UPDATE scheduled_messages SET sent = 1 WHERE id = ?`, [msg.id]);
            console.log(`✅ Sent scheduled message to ${msg.channel}`);
          } else {
            console.error(`❌ Slack API error: ${response.data.error}`);
          }
        } catch (err) {
          console.error("Error sending scheduled message:", err.response?.data || err.message);
        }
      });
    }
  );
}, 10000); // check every 10 seconds
