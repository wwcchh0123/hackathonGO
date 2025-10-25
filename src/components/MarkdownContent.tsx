import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import "highlight.js/styles/stackoverflow-light.css"

interface MarkdownContentProps {
  content: string
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
}) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        img: ({ node, ...props }) => (
          <img {...props} style={{ maxWidth: "100%", borderRadius: 4 }} />
        ),
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "")
          return !inline ? (
            <pre style={{ padding: 0 }}>
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
