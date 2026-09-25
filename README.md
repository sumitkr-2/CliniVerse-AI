# CliniVerse Care AI — Production Medical Assistant

## Features
- **Gemini 2.5 Flash Integration**: Rapid generation and response streaming.
- **RAG Architecture**: PDF parsing (using PyMuPDF + parallelized Tesseract OCR fallback), text segment chunking, sentence-transformers indexing, and local ChromaDB retrieval.
- **Conversation Memory**: Saved message history stored in PostgreSQL allowing users to ask follow-up questions about previously uploaded reports.
- **Voice Console**: Push-to-talk speech recognition and natural text-to-speech audio streaming back to the client.
- **Production Docker Stack**: Automated single-port reverse proxy routing via Nginx.

## Project Structure
```text
/
├── backend/
│   ├── app/
│   │   ├── api/          # Route controller endpoints
│   │   ├── core/         # DB configurations, middleware
│   │   ├── models/       # Database schemas (SQLAlchemy)
│   │   ├── repository/   # Query abstractions
│   │   ├── services/     # Gemini, embeddings, vector cache
│   │   ├── prompts/      # Clinical instruction templates
│   │   ├── rag/          # Search & stream logic wrapper
│   │   ├── memory/       # Redis / DB memory interfaces
│   │   └── voice/        # STT and TTS voice helpers
│   ├── requirements.txt  # Python packages list
│   └── Dockerfile        # Slim environment + Tesseract OCR
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── cards/    # Lab results, summary cards
│   │   │   ├── chat/     # Message list, inputs
│   │   │   └── voice/    # Mic console interface
│   │   ├── pages/        # Dashboard, Analytics view
│   │   ├── hooks/        # Web speech hook
│   │   ├── context/      # Authentication context
│   │   └── App.tsx       # Routing entrypoint
│   └── Dockerfile        # Vite development CMD
├── docker/
│   └── nginx.conf        # Proxy router configuration
└── docker-compose.yml    # Full local infrastructure stack
```

## Setup Instructions

1. **Configure Environment Keys**:
   Copy `.env.example` into a local `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set your `GEMINI_API_KEY`:
   ```env
   GEMINI_API_KEY="AIzaSyYourRealKeyHere..."
   ```

2. **Run with Docker Compose**:
   Build and boot all containers (Postgres, Redis, ChromaDB, Backend, Frontend, and Nginx proxy) via:
   ```bash
   docker compose up --build
   ```
   Once started, the application will be served directly at:
   **http://localhost** (Single port reverse proxied via Nginx)

3. **Verify Health**:
   Backend status is exposed at:
   **http://localhost/api/v1/health**

## Security & Caching
- User context is isolated inside vector database and chat history tables strictly scoped by user JWT.
- Embeddings and document summaries are cached inside Redis.
- File uploads are validated and capped at 10MB to protect resources.
