/**
 * Flatten Markdown to clean prose. Used when AI text is written somewhere that
 * stores plain text (a journal entry), so the saved note doesn't keep literal
 * ** and # forever — unlike display, this one is persisted.
 */
export function stripMarkdown(text: string): string {
  return (text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/^\s*(#{1,6})\s+/gm, '')          // headings
    .replace(/^\s*(?:---+|\*\*\*+|___+)\s*$/gm, '') // rules
    .replace(/^\s*>\s?/gm, '')                  // blockquote markers
    .replace(/^\s*[-*+]\s+/gm, '• ')            // bullets → a real bullet
    .replace(/`([^`\n]+)`/g, '$1')              // inline code
    .replace(/\*\*([^\n]+?)\*\*/g, '$1')        // bold
    .replace(/__([^\n]+?)__/g, '$1')
    .replace(/\*([^*\n]+?)\*/g, '$1')           // italic
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
