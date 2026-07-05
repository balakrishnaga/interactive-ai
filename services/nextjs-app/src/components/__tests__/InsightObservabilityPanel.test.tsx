import { render, screen } from "@testing-library/react";
import InsightObservabilityPanel from "../InsightObservabilityPanel";

describe("InsightObservabilityPanel", () => {
  const defaultProps = {
    observability: null,
    topK: 5,
    setTopK: jest.fn(),
    enableRerank: true,
    setEnableRerank: jest.fn(),
  };

  it("renders the Observability header", () => {
    render(<InsightObservabilityPanel {...defaultProps} />);
    expect(screen.getByText(/^Observability$/i)).toBeInTheDocument();
  });

  it("renders the Top-K label and slider", () => {
    render(<InsightObservabilityPanel {...defaultProps} />);
    expect(screen.getByText(/Top-K: 5/i)).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("renders the Enable reranking checkbox", () => {
    render(<InsightObservabilityPanel {...defaultProps} />);
    expect(screen.getByLabelText(/Enable reranking/i)).toBeInTheDocument();
  });

  it("renders empty state text when no observability data is provided", () => {
    render(<InsightObservabilityPanel {...defaultProps} />);
    expect(screen.getByText(/No observability trace available/i)).toBeInTheDocument();
  });
});
