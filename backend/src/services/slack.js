// src/services/slack.js
import axios from "axios";
import { refreshIfNeeded } from "../utils/token.js";

/**
 * sendMessageUsingBot(slackUserId, channel, text)
 * - ensures token is valid (refreshes if needed)
 * - posts chat.postMessage to Slack
 */
export async function sendMessageUsingBot(slackUserId, channel, text) {
  const token = await refreshIfNeeded(slackUserId);

  try {
    const resp = await axios.post(
      "https://slack.com/api/chat.postMessage",
      { channel, text },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!resp.data || !resp.data.ok) {
      // pass Slack error code/message up
      throw new Error(resp.data.error || "unknown_slack_error");
    }

    return resp.data;
  } catch (err) {
    // Err could be axios error; try to extract Slack error
    const message = err.response?.data?.error || err.message;
    throw new Error(message);
  }
}
