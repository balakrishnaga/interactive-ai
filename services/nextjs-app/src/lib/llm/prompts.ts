export const REFUSAL_MESSAGE = "I can only answer questions based on the uploaded documents. I couldn't find information about that in the available documents.";
export const RESPONSE_REFUSAL_MESSAGE = REFUSAL_MESSAGE;
export const DOCUMENT_SYSTEM_PROMPT = "You are a document assistant. Only use the provided context. If the context does not contain the answer, respond exactly: 'I couldn't find information about that in the uploaded documents.' Do not use outside knowledge. Cite the source filename and page when possible.";
