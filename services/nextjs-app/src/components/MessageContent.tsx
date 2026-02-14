"use client";

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';

interface MessageContentProps {
    content: string;
    isUser?: boolean;
}

// Light theme matching the warm cream design
const claudeTheme = {
    ...oneLight,
    'pre[class*="language-"]': {
        ...oneLight['pre[class*="language-"]'],
        background: '#FAF9F6',
        borderRadius: '0 0 12px 12px',
        padding: '1rem',
        margin: 0,
        border: 'none',
    },
    'code[class*="language-"]': {
        ...oneLight['code[class*="language-"]'],
        background: 'transparent',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '0.85rem',
    },
};

export default function MessageContent({ content, isUser = false }: MessageContentProps) {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    let codeBlockIndex = 0;

    const copyToClipboard = async (code: string, index: number) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className={`markdown-content ${isUser ? 'user-markdown' : 'bot-markdown'}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeString = String(children).replace(/\n$/, '');
                        const currentIndex = codeBlockIndex++;

                        const isInline = !match && !className && !codeString.includes('\n');

                        if (isInline) {
                            return (
                                <code className="inline-code" {...props}>
                                    {children}
                                </code>
                            );
                        }

                        const language = match ? match[1] : 'text';

                        return (
                            <div className="code-block-wrapper">
                                <div className="code-block-header">
                                    <span className="code-language">{language}</span>
                                    <button
                                        className="copy-button"
                                        onClick={() => copyToClipboard(codeString, currentIndex)}
                                        aria-label="Copy code"
                                    >
                                        {copiedIndex === currentIndex ? (
                                            <>✓ Copied</>
                                        ) : (
                                            <>⧉ Copy</>
                                        )}
                                    </button>
                                </div>
                                <SyntaxHighlighter
                                    style={claudeTheme}
                                    language={language}
                                    PreTag="div"
                                    customStyle={{
                                        margin: 0,
                                        borderTopLeftRadius: 0,
                                        borderTopRightRadius: 0,
                                    }}
                                >
                                    {codeString}
                                </SyntaxHighlighter>
                            </div>
                        );
                    },
                    a({ href, children }) {
                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="markdown-link"
                            >
                                {children}
                            </a>
                        );
                    },
                    table({ children }) {
                        return (
                            <div className="table-wrapper">
                                <table className="markdown-table">{children}</table>
                            </div>
                        );
                    },
                    blockquote({ children }) {
                        return (
                            <blockquote className="markdown-blockquote">
                                {children}
                            </blockquote>
                        );
                    },
                    ul({ children }) {
                        return <ul className="markdown-list">{children}</ul>;
                    },
                    ol({ children }) {
                        return <ol className="markdown-list markdown-list-ordered">{children}</ol>;
                    },
                    h1({ children }) {
                        return <h1 className="markdown-heading markdown-h1">{children}</h1>;
                    },
                    h2({ children }) {
                        return <h2 className="markdown-heading markdown-h2">{children}</h2>;
                    },
                    h3({ children }) {
                        return <h3 className="markdown-heading markdown-h3">{children}</h3>;
                    },
                    p({ children }) {
                        return <p className="markdown-paragraph">{children}</p>;
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
