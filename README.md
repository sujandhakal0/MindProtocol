# MindProtocol
A science-backed daily mental health companion.


## What It Does
MindProtocol helps users train their prefrontal cortex to override stress through:
- **2-minute morning brain scan** (4 sliders + optional open text)
- **5-minute AI-guided evening journal** (3 personalized questions)
- **Instant AI reframe response** (CBT-inspired, powered by Llama 3.3 via Groq)
- **Weekly trend dashboard** (mood, sleep, stress charts + AI theme summary)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo) |
| Backend | FastAPI (Python) |
| LLM | Groq API — llama-3.3-70b-versatile |
| Database | Supabase + pgvector |
| RAG | LangChain + HuggingFace Embeddings |

## Team
| Name | Role | GitHub |
|------|------|--------|
| Sujan Dhakal | Lead, AI & RAG | @sujandhakal0 |
| Nishant | Backend & ML Logic | @nishant-sth |
| Saphal | Prompt Engineering & QA | @saphalkafle77-ai |
| Danish | Adaptive Engine & Frontend Support | @danishahmad2025 |
| Bidhur | Frontend (React Native) | @kaitex |

## Project Structure
```
MindProtocol/
├── frontend/    # React Native (Expo) app — Bidhur
├── backend/     # FastAPI server — Nishant
├── ai/          # Prompts, RAG pipeline — Sujan
└── README.md
```

## Setup Instructions
```bash
# Clone the repo
git clone https://github.com/sujandhakal0/MindProtocol.git
cd MindProtocol

# Backend setup
cd backend
cp .env.example .env      # fill in your real API keys
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend setup
cd frontend
npm install
npx expo start
```


