import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();
const router = express.Router();

// Step 1: Redirect user to Slack's OAuth page
router.get("/auth/slack", (req, res) => {
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=chat:write,channels:read,groups:read,im:read,mpim:read&user_scope=&redirect_uri=${process.env.BASE_URL}/auth/slack/callback`;
console.log("OAuth URL being sent:", slackAuthUrl);


  res.redirect(slackAuthUrl);
});

// Step 2: Handle Slack OAuth callback
router.get("/auth/slack/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Missing code from Slack");
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          code: code,
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          redirect_uri: `${process.env.BASE_URL}/auth/slack/callback`,
        },
      }
    );

    const data = tokenResponse.data;

    if (!data.ok) {
      return res.status(400).json({ error: data.error });
    }

    // Extract token info
    const slackUserId = data.authed_user?.id;
    const botAccessToken = data.access_token; // BOT token (xoxb-...)
    const refreshToken = data.refresh_token || null; // may not be provided by Slack
    const expiresIn = data.expires_in || null; // in seconds
    const expiresAt = expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null;
    const teamId = data.team?.id || null;
    const botUserId = data.bot_user_id || null;

    // Save into DB
    db.run(
      `INSERT OR REPLACE INTO users 
        (slack_user_id, access_token, refresh_token, expires_at, team_id, bot_user_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [slackUserId, botAccessToken, refreshToken, expiresAt, teamId, botUserId],
      (err) => {
        if (err) {
          console.error("Error saving user:", err.message);
          return res.status(500).send("Database error");
        }
        res.send("✅ Slack authorization successful! You can now send messages.");
      }
    );
  } catch (err) {
    console.error("OAuth error:", err.message);
    res.status(500).send("Slack OAuth failed");
  }
});

export default router;
