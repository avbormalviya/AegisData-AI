import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { ChartRenderer } from "./ChartRenderer";
import { CodeRenderer } from "./CodeRenderer";
import { IoPerson, IoSparkles, IoCopyOutline, IoCheckmarkOutline } from "react-icons/io5";

export const MessageBubble = ({ message }) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy message: ", err);
    }
  };

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className={`bubble ${isUser ? "user" : "assistant"}`}>
        
        {/* Message Meta Info (Sender details) */}
        <div className="message-meta">
          <div className="meta-avatar">
            {isUser ? <IoPerson size={11} /> : <IoSparkles size={11} />}
          </div>
          <span>{isUser ? "You" : "AegisData AI"}</span>
          
          {!isUser && message.content && (
            <button
              onClick={handleCopyMessage}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.72rem",
                padding: "2px 6px",
                borderRadius: "6px"
              }}
              title="Copy message summary"
            >
              {copied ? <IoCheckmarkOutline size={12} style={{ color: "var(--success)" }} /> : <IoCopyOutline size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          )}
        </div>

        {/* Message Content */}
        {message.content && (
          <div className="bubble-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ children, className }) {
                  const isBlock = className?.includes("language-");

                  if (isBlock) {
                    return <CodeRenderer code={String(children)} />;
                  }

                  return <code>{children}</code>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Charts & Interactive Visualizations */}
        {message.chartSpec && (
          <ChartRenderer chartSpec={message.chartSpec} />
        )}

        {/* Executable Code Blocks & Output */}
        {message.code && (
          <CodeRenderer
            code={message.code}
            result={message.result}
          />
        )}

      </div>
    </div>
  );
};