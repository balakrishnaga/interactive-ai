# Chatbot LLM

A multi-provider AI chatbot built with Next.js, featuring a clean, responsive UI powered by Bootstrap. This application supports various LLM providers including OpenAI, Groq, and Hugging Face.

<img width="1226" height="611" alt="Screenshot 2026-01-02 at 12 00 18 PM" src="https://github.com/user-attachments/assets/83125552-a009-436f-9ed4-bf299c6320ed" />

<img width="1222" height="611" alt="Screenshot 2026-01-02 at 11 23 45 AM" src="https://github.com/user-attachments/assets/a2222c0e-d629-4363-90f1-1725fd73d9b7" />

## Features

- **Multi-Provider Support**: Easily switch between Groq, OpenAI, and Hugging Face.
- **Responsive Design**: Modern chat interface with aligned message bubbles (User right, Bot left).
- **Customizable**: Extend and override Bootstrap styles via `custom-bootstrap.css`.
- **Fast and Efficient**: Leveraging Next.js Server Actions and API routes.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **UI/Styling**: [Bootstrap 5](https://getbootstrap.com/), Vanilla CSS
- **Languages**: TypeScript, React
- **LLM APIs**: Groq, OpenAI, Hugging Face Inference API

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Configuration

Create a `.env` file in the root directory and add your API keys.

```env
# Select active LLM
NEXT_PUBLIC_LLM_PROVIDER=groq

# Tokens
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key
HF_API_KEY=your_huggingface_key

# Models
OPENAI_MODEL=gpt-3.5-turbo
GROQ_MODEL=llama-3.3-70b-versatile
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/components/ChatBox.tsx`: The main chat interface component.
- `src/app/api/chat/route.ts`: API route handling LLM interaction.
- `src/lib/llm/`: Strategy pattern implementation for different LLM providers.
- `src/app/custom-bootstrap.css`: Custom Bootstrap overrides and theme colors.

## License

This project is licensed under the MIT License.
