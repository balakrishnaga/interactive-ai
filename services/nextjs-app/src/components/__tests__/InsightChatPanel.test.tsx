import { render, screen } from "@testing-library/react";
import InsightChatPanel from "../InsightChatPanel";

jest.mock("../MessageContent", () => {
  return {
    __esModule: true,
    default: ({ content }: { content: string }) => <div data-testid="mock-message-content">{content}</div>,
  };
});

jest.mock("../ThinkingIndicator", () => {
  return {
    __esModule: true,
    default: () => <div data-testid="mock-thinking-indicator">Thinking...</div>,
  };
});

describe("InsightChatPanel", () => {
  const defaultProps = {
    topK: 5,
    enableRerank: true,
  };

  it("renders the Insight Engine header", () => {
    render(<InsightChatPanel {...defaultProps} />);
    expect(screen.getByText(/^Insight Engine$/i)).toBeInTheDocument();
  });

  it("renders the landing upload prompt when no messages are present", () => {
    render(<InsightChatPanel {...defaultProps} />);
    expect(screen.getByText(/Initialize Insight Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload PDFs to search, analyze, and query your documents/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload PDF to start/i)).toBeInTheDocument();
  });

  it("renders the input placeholder", () => {
    render(<InsightChatPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Message Insight Engine \.\.\./i)).toBeInTheDocument();
  });

  it("renders the New chat button", () => {
    render(<InsightChatPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: /New chat/i })).toBeInTheDocument();
  });
});
