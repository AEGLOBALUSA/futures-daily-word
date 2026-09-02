/**
 * Server-side Anthropic call for staff intake (not the public /api/claude browser proxy).
 * Returns the text, or null if the key is missing or the model is down.
 */
async function callClaudeMessages({ system, user, maxTokens }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: Math.min(Math.max(Number(maxTokens) || 2500, 400), 4000),
        system: String(system || "").slice(0, 8000),
        messages: [{ role: "user", content: String(user || "").slice(0, 20000) }]
      }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("claude-messages", response.status);
      return null;
    }
    const text = data && data.content && data.content[0] && data.content[0].text;
    return typeof text === "string" && text.trim() ? text : null;
  } catch (err) {
    console.error("claude-messages", err && err.name);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { callClaudeMessages };
