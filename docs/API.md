# Trace API Reference

Base URL (local): `http://localhost:5000`

All endpoints return JSON. Errors follow the shape `{ ok: false, error: "message" }`.

---

## Health

### `GET /api/health`

Server + database status.

**Response:**
```json
{
  "status": "ok",
  "service": "trace",
  "time": "2026-10-16T10:00:00.000Z",
  "uptime": 123.45,
  "db": "connected"
}
---

## Claim Parsing (AI)

### `POST /api/parse-claim`

Parse an unstructured client claim (email, WhatsApp, message) into structured data using AI.

**Principle:** *AI proposes. Code verifies.* — this endpoint only extracts fields. It does not verify whether money moved. That happens through `/api/verify`.

**Body:**
```json
{
  "claimText": "I paid your invoice on September 3rd. $1545 sent under SUMMIT CONSULTING. Ref #ABC123."
}