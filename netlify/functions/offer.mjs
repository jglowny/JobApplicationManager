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
    const response = await fetch(`${BACKEND_URL}/api/offer?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error("Offer data fetch failed");

    const data = await response.json();
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
