/**
 * Share utility — uses Web Share API with clipboard fallback.
 */
export async function shareContent(data: { title: string; text: string; url?: string }): Promise<boolean> {
  // Try native Web Share API first
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
      // Fall through to clipboard
    }
  }
  // Fallback: copy to clipboard
  const copyText = data.url ? `${data.text}\n\n${data.url}` : data.text;
  try {
    await navigator.clipboard.writeText(copyText);
    return true;
  } catch {
    // Last resort: textarea method
    const ta = document.createElement('textarea');
    ta.value = copyText;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  }
}
