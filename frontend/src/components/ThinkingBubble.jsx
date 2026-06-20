import { useState, useEffect } from "react";

const THINKING_STEPS = [
  "Structuring CSV headers...",
  "Running data profiling...",
  "Generating Python script...",
  "Synthesizing charts and tables...",
  "Executing pandas aggregation...",
  "Formatting final response..."
];

export const ThinkingBubble = () => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="message-row assistant">
      <div className="thinking-container">
        <div className="thinking-dots">
          <span className="thinking-dot"></span>
          <span className="thinking-dot"></span>
          <span className="thinking-dot"></span>
        </div>
        <span className="thinking-label">
          {THINKING_STEPS[stepIndex]}
        </span>
      </div>
    </div>
  );
};
