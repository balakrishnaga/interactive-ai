import { render, screen } from "@testing-library/react";
import EnterpriseConfigPanel from "../EnterpriseConfigPanel";

describe("EnterpriseConfigPanel", () => {
  it("renders the configuration panel heading", () => {
    render(<EnterpriseConfigPanel />);
    expect(
      screen.getByRole("heading", { name: /Configure answer generation/i })
    ).toBeInTheDocument();
  });

  it("renders the override prompt template textarea with the Contoso prompt", () => {
    render(<EnterpriseConfigPanel />);
    const textarea = screen.getByLabelText(/Override prompt template/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName.toLowerCase()).toBe("textarea");
    expect((textarea as HTMLTextAreaElement).value).toContain("Contoso Ltd");
    expect((textarea as HTMLTextAreaElement).value).toContain(
      "annual report"
    );
  });

  it("renders the retrieval toggle checkboxes", () => {
    render(<EnterpriseConfigPanel />);
    expect(
      screen.getByLabelText(/Use semantic ranker for retrieval/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        /Use query-contextual summaries instead of whole documents/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Suggest follow-up questions/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Stream chat completion responses/i)
    ).toBeInTheDocument();
  });

  it("renders the GPT-4 Turbo with Vision toggle and input options", () => {
    render(<EnterpriseConfigPanel />);
    expect(
      screen.getByLabelText(/Use GPT-4 Turbo with Vision/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Images and text from index/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^Text from index$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Images from index/i)).toBeInTheDocument();
  });

  it("renders the retrieval mode radios with Hybrid selected by default", () => {
    render(<EnterpriseConfigPanel />);
    const hybrid = screen.getByLabelText(/Vectors \+ Text \(Hybrid\)/i);
    expect(hybrid).toBeInTheDocument();
    expect((hybrid as HTMLInputElement).checked).toBe(true);
    expect(screen.getByLabelText(/^Vectors$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Text$/i)).toBeInTheDocument();
  });

  it("renders the vector field checkboxes", () => {
    render(<EnterpriseConfigPanel />);
    expect(screen.getByLabelText(/^Text Embeddings$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Image Embeddings$/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/^Text and Image embeddings$/i)
    ).toBeInTheDocument();
  });

  it("checks the default toggle states", () => {
    render(<EnterpriseConfigPanel />);
    expect(
      (screen.getByLabelText(/Use semantic ranker for retrieval/i) as HTMLInputElement)
        .checked
    ).toBe(true);
    expect(
      (screen.getByLabelText(/Suggest follow-up questions/i) as HTMLInputElement)
        .checked
    ).toBe(true);
    expect(
      (screen.getByLabelText(/Use GPT-4 Turbo with Vision/i) as HTMLInputElement)
        .checked
    ).toBe(true);
    expect(
      (screen.getByLabelText(/Stream chat completion responses/i) as HTMLInputElement)
        .checked
    ).toBe(true);
    expect(
      (
        screen.getByLabelText(/Images and text from index/i) as HTMLInputElement
      ).checked
    ).toBe(true);
    expect(
      (screen.getByLabelText(/Text and Image embeddings/i) as HTMLInputElement)
        .checked
    ).toBe(true);
  });
});
