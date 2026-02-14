import os
import tempfile
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

class DocumentProcessor:
    def __init__(self, chunk_size=1000, chunk_overlap=200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            is_separator_regex=False,
        )

    def process_pdf(self, file_bytes: bytes, filename: str):
        """
        Processes a PDF from bytes, splits it into chunks, and returns them with metadata.
        """
        # Save bytes to a temporary file since PyPDFLoader expects a file path
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(file_bytes)
            temp_path = temp_file.name

        try:
            # Load PDF
            loader = PyPDFLoader(temp_path)
            documents = loader.load()

            # Split into chunks
            chunks = self.text_splitter.split_documents(documents)

            # Format for response
            processed_chunks = []
            for i, chunk in enumerate(chunks):
                processed_chunks.append({
                    "text": chunk.page_content,
                    "metadata": {
                        "filename": filename,
                        "pageIndex": chunk.metadata.get("page", 0) + 1,
                        "chunkIndex": i
                    }
                })
            
            return processed_chunks

        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

document_processor = DocumentProcessor()
