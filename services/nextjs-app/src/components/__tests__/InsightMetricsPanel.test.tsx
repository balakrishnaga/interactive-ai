import { render, screen } from "@testing-library/react";
import InsightMetricsPanel from "../InsightMetricsPanel";
import { ObservabilityTrace } from "@/lib/observability";

describe("InsightMetricsPanel", () => {
  it("renders the Evaluation Metrics header", () => {
    render(<InsightMetricsPanel observability={null} />);
    expect(screen.getByText(/Evaluation Metrics/i)).toBeInTheDocument();
  });

  it("renders empty state text when no observability data is provided", () => {
    render(<InsightMetricsPanel observability={null} />);
    expect(screen.getByText(/No metrics available/i)).toBeInTheDocument();
  });

  it("renders all five specific metrics when data is provided", () => {
    const mockObservability = {
      metrics: {
        context_precision: 0.8,
        context_recall: 0.6,
        context_relevancy: 0.7,
        answer_relevancy: 0.9,
      }
    } as unknown as ObservabilityTrace;

    render(<InsightMetricsPanel observability={mockObservability} />);

    expect(screen.getByText("Context Precision")).toBeInTheDocument();
    expect(screen.getByText("Context Recall")).toBeInTheDocument();
    expect(screen.getByText("Context Relevancy")).toBeInTheDocument();
    expect(screen.getByText("Answer Relevancy")).toBeInTheDocument();
    expect(screen.getByText("F1 Score")).toBeInTheDocument();
  });

  it("calculates the F1 score correctly", () => {
    // precision = 0.8, recall = 0.5
    // f1 = 2 * (0.8 * 0.5) / (0.8 + 0.5) = 0.8 / 1.3 = 0.61538...
    // (0.61538 * 100).toFixed(0) = "62%"
    const mockObservability = {
      metrics: {
        context_precision: 0.8,
        context_recall: 0.5,
        context_relevancy: 0.7,
        answer_relevancy: 0.9,
      }
    } as unknown as ObservabilityTrace;

    render(<InsightMetricsPanel observability={mockObservability} />);
    
    // We expect 62% for 0.8 precision and 0.5 recall
    expect(screen.getByText("62%")).toBeInTheDocument();
  });

  it("handles F1 score when precision or recall is 0", () => {
    const mockObservability = {
      metrics: {
        context_precision: 0,
        context_recall: 0,
        context_relevancy: 0.7,
        answer_relevancy: 0.9,
      }
    } as unknown as ObservabilityTrace;

    render(<InsightMetricsPanel observability={mockObservability} />);
    
    // Find the F1 Score card and check its value
    const f1Card = screen.getByText("F1 Score").closest(".metricCard");
    expect(f1Card).toHaveTextContent("0%");
  });

  it("handles F1 score when precision or recall is missing", () => {
    const mockObservability = {
      metrics: {
        context_relevancy: 0.7,
        answer_relevancy: 0.9,
      }
    } as unknown as ObservabilityTrace;

    render(<InsightMetricsPanel observability={mockObservability} />);
    
    // Find the F1 Score card and check its value
    const f1Card = screen.getByText("F1 Score").closest(".metricCard");
    expect(f1Card).toHaveTextContent("0%");
  });
});
