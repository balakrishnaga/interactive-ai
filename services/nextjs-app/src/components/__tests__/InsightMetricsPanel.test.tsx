import { render, screen } from "@testing-library/react";
import InsightMetricsPanel from "../InsightMetricsPanel";

describe("InsightMetricsPanel", () => {
  it("renders the Evaluation Metrics header", () => {
    render(<InsightMetricsPanel observability={null} />);
    expect(screen.getByText(/Evaluation Metrics/i)).toBeInTheDocument();
  });

  it("renders empty state text when no observability data is provided", () => {
    render(<InsightMetricsPanel observability={null} />);
    expect(screen.getByText(/No metrics available/i)).toBeInTheDocument();
  });
});
