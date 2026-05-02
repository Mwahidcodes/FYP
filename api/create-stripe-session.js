module.exports = async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Stripe Secret Key is missing in .env file" });
  }
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { amount, donationId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "pkr",
            product_data: {
              name: "Cash Donation - Share For Good",
              description: `Donation ID: ${donationId}`,
            },
            unit_amount: Math.round(amount * 100), // Stripe expects amounts in cents/paisas
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.SITE_URL}/stripe-success/${donationId}`,
      cancel_url: `${process.env.SITE_URL}/cash-donation`, // Return back to form on cancel
      metadata: {
        donationId: donationId.toString(),
      },
    });

    res.status(200).json({ url: session.url, id: session.id });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
};
