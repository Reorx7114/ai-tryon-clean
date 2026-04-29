# AI Try-On Clean Railway Version

Clean single-service version for Railway.

## Railway Variables

```env
OPENAI_API_KEY=sk-proj-xxxxxxxx
OPENAI_IMAGE_MODEL=gpt-image-1
```

## Start command

```bash
npm start
```

## Health check

Open:

```text
/api/health
```

If `hasOpenAIKey` is true, the server can see your API key.
