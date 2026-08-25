export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const signature = req.headers["paddle-signature"];

    if (!signature) {
      return res.status(400).json({
        error: "Missing Paddle signature"
      });
    }

    const rawBody = JSON.stringify(req.body);

    console.log("Paddle webhook received");

    console.log("Signature:", signature);

    console.log("Event:", req.body);

    return res.status(200).json({
      success: true,
      message: "Paddle webhook received successfully"
    });

  } catch (error) {
    console.error("Webhook error:", error);

    return res.status(500).json({
      error: "Webhook processing failed"
    });
  }
      }
