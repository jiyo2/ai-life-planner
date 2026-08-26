export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;

  return res.status(200).json({
    method: req.method,
    openai_key_configured: Boolean(apiKey),
    key_length: apiKey ? apiKey.length : 0
  });
}
