import { render, screen } from "@testing-library/react";
import EnterpriseChatPanel from "../EnterpriseChatPanel";

describe("EnterpriseChatPanel", () => {
  it("renders the chat header and Ask a question tab", () => {
    render(<EnterpriseChatPanel />);
    expect(screen.getByRole("heading", { name: /Chat/i })).toBeInTheDocument();
    expect(screen.getByText(/Ask a question/i)).toBeInTheDocument();
  });

  it("renders the user question verbatim", () => {
    render(<EnterpriseChatPanel />);
    expect(
      screen.getByText(
        "Compare the impact of interest rates and GDP in financial markets."
      )
    ).toBeInTheDocument();
  });

  it("renders the thought process metadata", () => {
    render(<EnterpriseChatPanel />);
    expect(screen.getByText(/Thought process/i)).toBeInTheDocument();
    expect(screen.getByText(/"2020 events and happenings"/i)).toBeInTheDocument();
    expect(screen.getByText("gpt-4v")).toBeInTheDocument();
    expect(screen.getByText("false")).toBeInTheDocument();
    expect(screen.getByText(/Search Query/i)).toBeInTheDocument();
    expect(screen.getByText(/Model ID/i)).toBeInTheDocument();
    expect(screen.getByText(/semanticCaptions/i)).toBeInTheDocument();
  });

  it("renders supporting content paragraphs and citations", () => {
    render(<EnterpriseChatPanel />);
    expect(screen.getByText(/Supporting content/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Macroeconomic factors including interest rates and GDP growth significantly influence financial markets\./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /In 2020, the price of oil decreased significantly/i
      )
    ).toBeInTheDocument();
    // Each citation appears both as a badge and inside the JSON source block,
    // so there should be at least one occurrence of each filename.
    expect(
      screen.getAllByText(/Financial Market Analysis Report 2023-7\.png/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Financial Market Analysis Report 2023-5\.png/i).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Financial Market Analysis Report 2023-3\.png/i).length
    ).toBeGreaterThan(0);
  });

  it("renders the exclude category banner", () => {
    render(<EnterpriseChatPanel />);
    expect(screen.getByText(/Exclude category/i)).toBeInTheDocument();
    expect(screen.getByText(/What happened in 2020/i)).toBeInTheDocument();
  });

  it("renders the JSON source block with file references", () => {
    render(<EnterpriseChatPanel />);
    expect(screen.getByText(/"citation_id": 1/i)).toBeInTheDocument();
    expect(screen.getByText(/"embedding_model": "text-embedding-ada-002"/i))
      .toBeInTheDocument();
  });

  it("renders the Commodity Market Fluctuations chart with all years", () => {
    render(<EnterpriseChatPanel />);
    expect(screen.getByText(/Commodity Market Fluctuations/i)).toBeInTheDocument();
    const chart = screen.getByRole("img", {
      name: /Oil, Gold and Wheat prices from 2014 to 2022/i,
    });
    expect(chart).toBeInTheDocument();
    // All 9 years (2014..2022) appear as X-axis labels.
    [2014, 2016, 2018, 2020, 2022].forEach((year) => {
      expect(screen.getByText(String(year))).toBeInTheDocument();
    });
  });
});
