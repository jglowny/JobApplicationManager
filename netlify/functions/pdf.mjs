import fetch from "node-fetch";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5174";

export async function handler(event) {
  const { url } = event.queryStringParameters || {};

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "URL is required" }),
    };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/pdf?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error("PDF generation failed");

    const buffer = await response.buffer();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/pdf" },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
