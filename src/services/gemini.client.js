const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
const EMBEDDING_MODEL = "gemini-embedding-001";
const GENERATION_MODEL = "gemini-2.5-flash";
const EXPECTED_EMBEDDING_DIMS = 3072;

const readErrorBody = async (response) => {
  try {
    const data = await response.json();
    const message =
      data?.error?.message ||
      data?.message ||
      JSON.stringify(data);

    return {
      message,
      data,
    };
  } catch {
    try {
      const text = await response.text();
      return {
        message: text || null,
        data: null,
      };
    } catch {
      return {
        message: null,
        data: null,
      };
    }
  }
};

const normalizeApiKey = (apiKey) => String(apiKey || "").trim();

export const embedText = async ({
  apiKey = process.env.GEMINI_API_KEY,
  text,
  baseUrl = process.env.GEMINI_API_BASE_URL || DEFAULT_BASE_URL,
  model = process.env.GEMINI_EMBEDDING_MODEL || EMBEDDING_MODEL,
  timeoutMs = Number(process.env.GEMINI_HTTP_TIMEOUT_MS || 15000), // 15 seconds
} = {}) => {
  const normalizedApiKey = normalizeApiKey(apiKey);
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    const err = new Error("embedText requires non-empty text");
    err.name = "ValidationError";
    err.status = 400;
    throw err;
  }
  if (!normalizedApiKey) {
    const err = new Error("GEMINI_API_KEY must be set to compute embeddings");
    err.name = "ConfigurationError";
    err.status = 500;
    throw err;
  }

  // Note: Google’s Generative Language API has multiple versions.
  // This client targets the common embedContent pattern and parses a couple of known response shapes.
  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(
    model,
  )}:embedContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": normalizedApiKey,
    },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text: trimmed }] },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const { message, data } = await readErrorBody(res);
    const err = new Error(
      message
        ? `Gemini embedContent HTTP ${res.status}: ${message}`
        : `Gemini embedContent HTTP ${res.status}`,
    );
    err.name = "UpstreamError";
    err.status = 502;
    err.details = data;
    throw err;
  }
  const data = await res.json();

  const vector =
    data?.embedding?.values ||
    data?.embedding?.value ||
    data?.embeddings?.[0]?.values ||
    data?.embeddings?.[0]?.value;

  if (!Array.isArray(vector)) {
    const err = new Error("Unexpected Gemini embeddings response shape");
    err.name = "UpstreamError";
    err.status = 502;
    err.details = { receivedKeys: data ? Object.keys(data) : null };
    throw err;
  }

  if (vector.length !== EXPECTED_EMBEDDING_DIMS) {
    const err = new Error(
      `Embedding dimension mismatch: expected ${EXPECTED_EMBEDDING_DIMS}, got ${vector.length}`,
    );
    err.name = "UpstreamError";
    err.status = 502;
    throw err;
  }

  return vector;
};

export const GEMINI_EMBEDDING_DIMS = EXPECTED_EMBEDDING_DIMS;

export const generateText = async ({
  apiKey = process.env.GEMINI_API_KEY,
  prompt,
  baseUrl = process.env.GEMINI_API_BASE_URL || DEFAULT_BASE_URL,
  model = process.env.GEMINI_GENERATION_MODEL || GENERATION_MODEL,
  timeoutMs = Number(process.env.GEMINI_HTTP_TIMEOUT_MS || 20000),
  temperature = Number(process.env.GEMINI_TEMPERATURE || 0.2),
} = {}) => {
  const normalizedApiKey = normalizeApiKey(apiKey);
  const trimmed = String(prompt || "").trim();
  if (!trimmed) {
    const err = new Error("generateText requires non-empty prompt");
    err.name = "ValidationError";
    err.status = 400;
    throw err;
  }
  if (!normalizedApiKey) {
    const err = new Error("GEMINI_API_KEY must be set to generate text");
    err.name = "ConfigurationError";
    err.status = 500;
    throw err;
  }

  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": normalizedApiKey,
    },
    body: JSON.stringify({
      model: `models/${model}`,
      contents: [{ role: "user", parts: [{ text: trimmed }] }],
      generationConfig: { temperature },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const { message, data } = await readErrorBody(res);
    const err = new Error(
      message
        ? `Gemini generateContent HTTP ${res.status}: ${message}`
        : `Gemini generateContent HTTP ${res.status}`,
    );
    err.name = "UpstreamError";
    err.status = 502;
    err.details = data;
    throw err;
  }
  const data = await res.json();

  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .map((p) => p?.text)
        .filter(Boolean)
        .join("")
    : null;

  if (!text) {
    const err = new Error("Unexpected Gemini generateContent response shape");
    err.name = "UpstreamError";
    err.status = 502;
    err.details = { receivedKeys: data ? Object.keys(data) : null };
    throw err;
  }

  return String(text).trim();
};
