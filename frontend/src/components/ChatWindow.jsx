import { MessageBubble } from "./MessageBubble";
import { ThinkingBubble } from "./ThinkingBubble";
import { useRef, useEffect } from "react";
import { IoStatsChart, IoCodeSlash, IoList, IoHelpCircle, IoSparkles } from "react-icons/io5";

export const ChatWindow = ({ messages, isLoading, onSelectSuggestion }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const suggestions = [
    {
      text: "Perform statistical summary on my dataset",
      icon: <IoList size={16} />,
      mode: "csv"
    },
    {
      text: "Plot a bar chart of the top performing values",
      icon: <IoStatsChart size={16} />,
      mode: "csv"
    },
    {
      text: "Check correlations between numerical variables",
      icon: <IoSparkles size={16} />,
      mode: "csv"
    },
    {
      text: "Write custom code to filter my dataset",
      icon: <IoCodeSlash size={16} />,
      mode: "code"
    }
  ];

  return (
    <div className="chat-window">
      {messages.length === 0 ? (
        <div className="chat-empty-state">
          <div className="empty-logo-wrapper">
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <defs>
                <linearGradient id="shieldG" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
              <path 
                d="M50 15 C65 15, 78 20, 80 32 C80 58, 68 76, 50 85 C32 76, 20 58, 20 32 C22 20, 35 15, 50 15 Z" 
                fill="url(#shieldG)" 
                stroke="#ffffff" 
                strokeWidth="2" 
              />
              <circle cx="50" cy="48" r="8" fill="#ffffff" />
              <line x1="50" y1="48" x2="36" y2="38" stroke="#ffffff" strokeWidth="2" />
              <line x1="50" y1="48" x2="64" y2="38" stroke="#ffffff" strokeWidth="2" />
              <line x1="50" y1="48" x2="50" y2="68" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>
          <h2 className="empty-title">AegisData AI</h2>
          <p className="empty-subtitle">
            Welcome to your autonomous data analyst assistant. Upload a CSV or Excel dataset, select your analysis mode, and ask questions to compute formulas, parse tables, and design visualizations.
          </p>

          <div className="features-grid">
            <div className="feature-badge">
              <IoList size={18} />
              <div>
                <strong>CSV & Excel Analytics</strong>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>Auto-profiles data structures instantly.</p>
              </div>
            </div>
            <div className="feature-badge">
              <IoStatsChart size={18} />
              <div>
                <strong>Visualizations</strong>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>Interactive bar charts and line charts.</p>
              </div>
            </div>
          </div>

          <p className="suggestions-title">Get Started Quickly</p>
          <div className="suggestion-grid">
            {suggestions.map((sug, index) => (
              <button
                key={index}
                className="suggestion-card"
                onClick={() => onSelectSuggestion && onSelectSuggestion(sug.text, sug.mode)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {sug.icon}
                  <span>{sug.text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((message, idx) => (
          <MessageBubble key={idx} message={message} />
        ))
      )}

      {isLoading && <ThinkingBubble />}
      
      <div ref={bottomRef} />
    </div>
  );
};