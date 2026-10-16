# Trace

**Every dollar has a story. Trace reads it, and tells the truth with evidence.**

## What it does

Freelancers face two money problems every month:

1. **The subscription leak** — 8–15 tools, $100–$300/month, some double-charging or ghosting after cancellation.
2. **The invoice chase** — clients say "I paid," money doesn't arrive, reconciling statements takes hours.

Trace checks every claim against a real bank transaction and returns a verdict **with evidence**.

## Principle

**AI proposes. Code verifies.**

The language model reads claims and suggests fields. It is never the final word on whether money moved. That belongs to arithmetic against a bank statement.

## Status

🚧 Day 3 of 30 complete — backend core working.

**What's live:**
- CSV parser (RBC + TD banks)
- Invoice CRUD
- Matching engine with 6 verdict types
- Subscription detection
- Full ETL pipeline 
**AI claim parsing (Groq + Gemini fallback)**

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB Atlas
- AI: Google Gemini
- PDF: PDFKit (upcoming)
- Deploy: Azure (upcoming)

## Project structure

```
Trace/
├── backend/         Express API
│   ├── models/      Mongoose schemas
│   ├── routes/      API endpoints
│   └── services/    Business logic
├── frontend/        React + Vite client
├── docs/            PROBLEM.md, PRINCIPLE.md, API.md
├── scripts/         Fixture generators
└── README.md
```

## Local development

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Health check: `GET /api/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API

Full API reference: [docs/API.md](docs/API.md)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Server health |
| `/api/parse-statement` | POST | Upload + parse CSV |
| `/api/statements` | GET | List statements |
| `/api/invoices` | POST/GET | Create/list invoices |
| `/api/invoices/:id` | GET/PATCH/DELETE | Manage one invoice |
| `/api/verify` | POST/GET | Verify invoice vs statement |
| `/api/subscriptions/:statementId` | GET | Detect subscriptions |
| `/api/parse-claim` | POST | Parse client claim (AI) |

## Roadmap

- **Week 1:** Backend (parser, matching, subscriptions)
- **Week 2:** Frontend (React UI)
- **Week 3:** Deploy to Azure
- **Week 4:** Polish + Submit

## Docs

- [Problem](docs/PROBLEM.md)
- [Principle](docs/PRINCIPLE.md)
- [API Reference](docs/API.md)

## Track

PayPal AI Hackathon — deadline Nov 12, 2026.