import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { ChartRenderer } from "./ChartRenderer";
import { CodeRenderer } from "./CodeRenderer";
import { IoSparkles, IoCopyOutline, IoCheckmarkOutline, IoTerminalOutline, IoChevronDown } from "react-icons/io5";

export const MessageBubble = ({ message, theme }) => {
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

  const renderMarkdown = (text) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ children, className }) {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return <CodeRenderer code={String(children)} theme={theme} />;
          }
          return <code>{children}</code>;
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );

  const content = message.content || "";


  const hasChartMarker = content.includes("[CHART_HERE]");
  const parts = hasChartMarker ? content.split("[CHART_HERE]") : [content];

  // Find chart tool result
  const chartStep = message.trace?.find(
    (step) => step.name === "chart_tool"
  );

  // Parse chart JSON if needed
  let chartSpec = null;

  if (chartStep) {
    try {
      chartSpec =
        typeof chartStep.content === "string"
          ? JSON.parse(chartStep.content)
          : chartStep.content;
    } catch (err) {
      console.error("Invalid chart JSON:", err);
    }
  }

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className={`bubble ${isUser ? "user" : "assistant"}`}>

        {!isUser && (
          <div className="message-meta">
            <div className="meta-avatar">
              <IoSparkles size={11} />
            </div>
            <span>AegisData AI</span>

            {/* Run button removed as not needed */}
            {/* Button placeholder kept for future use */}
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
        )}

        {/* Message Content — split around chart marker if present */}
        {content && (
          <div className="bubble-content">
            {renderMarkdown(parts[0])}

            {hasChartMarker && chartSpec && (
              <ChartRenderer chartSpec={chartSpec} />
            )}

            {parts[1] && renderMarkdown(parts[1])}
          </div>
        )}

        {/* Dynamic Tool Execution Trace accordions */}
        {message.trace && message.trace.length > 0 && (
          <div className="agent-trace-container" style={{ marginTop: "16px", width: "100%" }}>
            <div className="agent-trace-header" style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.72rem",
              fontWeight: "600",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              letterSpacing: "0.05em",
              marginBottom: "10px"
            }}>
              <IoTerminalOutline size={13} style={{ color: "var(--accent)" }} />
              <span>Execution Traces ({message.trace.length})</span>
            </div>
            
            <div className="agent-trace-list" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {message.trace.map((step, idx) => {
                const isChart = step.name === "chart_tool";
                const isCsv = step.name === "csv_query_tool";
                const isCode = step.name === "code_tool";
                const isSql = step.name === "sql_query_tool";

                let displayName = step.name;
                if (isChart) displayName = "Data Visualizer (chart_tool)";
                else if (isCsv) displayName = "CSV Analyzer (csv_query_tool)";
                else if (isCode) displayName = "Code Execution (code_tool)";
                else if (isSql) displayName = "SQL Query Executor (sql_query_tool)";

                return (
                  <details key={idx} className="trace-details" style={{
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    background: "var(--surface-solid)",
                    overflow: "hidden"
                  }}>
                    <summary style={{
                      padding: "8px 12px",
                      fontSize: "0.78rem",
                      fontWeight: "550",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "var(--text-secondary)",
                      userSelect: "none"
                    }}>
                      <span style={{ fontSize: "0.9rem" }}>
                        {isChart ? "📊" : isCsv ? "📂" : isCode ? "🐍" : isSql ? "🛢️" : "🔧"}
                      </span>
                      <span style={{ flex: 1 }}>{displayName}</span>
                      <IoChevronDown size={12} className="chevron-icon" style={{ opacity: 0.7 }} />
                    </summary>
                    <div style={{
                      padding: "10px 12px",
                      borderTop: "1px solid var(--border)",
                      background: "rgba(0,0,0,0.02)",
                      maxHeight: "220px",
                      overflowY: "auto"
                    }}>
                      {step.name === "chart_tool" ? (
                        <div style={{ color: "var(--text-secondary)" }}>
                          Chart rendered above.
                        </div>
                      ) : (
                        <pre
                          style={{
                            margin: 0,
                            fontSize: "0.76rem",
                            fontFamily: "'JetBrains Mono', monospace",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            color: "var(--text-secondary)",
                            lineHeight: "1.4"
                          }}
                        >
                          {typeof step.content === "object"
                            ? JSON.stringify(step.content, null, 2)
                            : String(step.content)}
                        </pre>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};