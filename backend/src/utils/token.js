// src/utils/token.js
import axios from "axios";
import db from "../db.js";

/**
 * small promisified sqlite helpers
 */
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

/**
 * refreshIfNeeded(slackUserId)
 * - returns a valid access_token for the user (possibly refreshed)
 * - if refresh_token isn't available, returns stored access_token
 * - if refresh fails, throws error
 */
export async function refreshIfNeeded(slackUserId) {
  const row = await dbGet("SELECT access_token, refresh_token, expires_at FROM users WHERE slack_user_id = ?", [slackUserId]);
  if (!row) throw new Error("No user found for slack_user_id " + slackUserId);

  const now = Math.floor(Date.now() / 1000);

  // If no expires_at set (token likely non-expiring), just return it
  if (!row.expires_at || row.expires_at > now + 30) {
    return row.access_token;
  }

  // If there's no refresh_token, can't refresh automatically
  if (!row.refresh_token) {
    // You could choose to throw to force reauth; we'll return access token but it may fail
    return row.access_token;
  }

  // Attempt refresh using generic OAuth2 refresh flow
  try {
    const resp = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          grant_type: "refresh_token",
          refresh_token: row.refresh_token,
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          redirect_uri: `${process.env.BASE_URL}/auth/slack/callback`,
        },
      }
    );

    const data = resp.data;
    if (!data || !data.ok) {
      throw new Error("Refresh failed: " + JSON.stringify(data));
    }

    const newAccessToken = data.access_token || row.access_token;
    const newRefreshToken = data.refresh_token || row.refresh_token;
    const expiresIn = data.expires_in || 3600;
    const newExpiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    await dbRun(
      "UPDATE users SET access_token = ?, refresh_token = ?, expires_at = ? WHERE slack_user_id = ?",
      [newAccessToken, newRefreshToken, newExpiresAt, slackUserId]
    );

    return newAccessToken;
  } catch (err) {
    // Propagate a sensible error
    throw new Error("Token refresh error: " + (err.response?.data?.error || err.message));
  }
}
