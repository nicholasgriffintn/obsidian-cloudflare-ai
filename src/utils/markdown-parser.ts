export function parseMarkdown(text: string): string {
    // Escape HTML to prevent XSS
    const escapeHTML = (str: string) => {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    // Pre-process code blocks to protect their content
    const codeBlocks: string[] = [];
    text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
        codeBlocks.push(code);
        return `{{CODEBLOCK${codeBlocks.length - 1}}}`;
    });

    // Pre-process inline code to protect their content
    const inlineCode: string[] = [];
    text = text.replace(/`([^`]+)`/g, (match, code) => {
        inlineCode.push(code);
        return `{{INLINECODE${inlineCode.length - 1}}}`;
    });

    let html = escapeHTML(text)
        // Headers (with proper spacing)
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>\n')
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>\n')
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>\n')

        // Bold (handle both * and _)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')

        // Italic (handle both * and _)
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')

        // Links
        .replace(/\[([^\]]+)\]$$([^)]+)$$/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

        // Unordered lists (handle multiple levels)
        .replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

        // Ordered lists
        .replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>')

        // Blockquotes
        .replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>')

        // Horizontal rules
        .replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr>')

        // Paragraphs (handle multiple lines)
        .replace(/^(?!<[hou]|<bl|<hr)[^\n]+(?:\n(?!<[hou]|<bl|<hr)[^\n]+)*/gm, match =>
            `<p>${match.replace(/\n/g, ' ')}</p>`
        );

    // Restore code blocks with proper formatting
    html = html.replace(/{{CODEBLOCK(\d+)}}/g, (_, index) => {
        return `<pre><code>${escapeHTML(codeBlocks[parseInt(index)])}</code></pre>`
    });

    // Restore inline code with proper formatting
    html = html.replace(/{{INLINECODE(\d+)}}/g, (_, index) => {
        return `<code>${escapeHTML(inlineCode[parseInt(index)])}</code>`
    });

    return html;
}