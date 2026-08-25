export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    console.log("Paddle webhook received");

    console.log("Headers:", req.headers);
    console.log("Body:", req.body);

    return res.status(200).json({
      success: true,
      message: "Paddle webhook received"
    });

  } catch (error) {
    console.error("Webhook error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}
