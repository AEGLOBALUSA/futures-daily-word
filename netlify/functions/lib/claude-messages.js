const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_TIMEOUT_MS = 45000;

/**
 * Server-side Anthropic call for staff intake (not the public /api/claude browser proxy).
 * Returns the text, or null if the key is missing or the model is down.
 * `model` and `timeoutMs` are optional (B09-18's corner draft passes its own
 * model from DW_DRAFT_MODEL and an 8 s limit); every other caller keeps the
 * defaults above.
 */
async function callClaudeMessages({ system, user, maxTokens, model, timeoutMs }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const useModel = typeof model === "string" && /^claude-[a-z0-9.-]{3,80}$/.test(model) ? model : DEFAULT_MODEL;
  const limitMs = Number(timeoutMs) > 0 ? Math.min(Number(timeoutMs), DEFAULT_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), limitMs);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: useModel,
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

module.exports = { callClaudeMessages, DEFAULT_MODEL };
