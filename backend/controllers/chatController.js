const replies = [
  {
    test: /shipping|delivery/i,
    answer:
      "We offer complimentary shipping on orders above ₹999. Orders below that threshold use the configured shipping charge. Check our Shipping page for current details.",
  },
  {
    test: /return|exchange/i,
    answer:
      "Returns depend on the store policy for the item. Please review our Return Policy or contact the VOTION team before sending anything back.",
  },
  {
    test: /watch/i,
    answer:
      "Our watch edit balances clean silhouettes with everyday precision. Browse the Watches collection to compare the current catalog.",
  },
  {
    test: /perfume|fragrance|scent/i,
    answer:
      "Our perfume collection moves from fresh and bright to deep and oud-led. Browse Perfumes to find your signature scent.",
  },
  {
    test: /order|checkout|cod|cash/i,
    answer:
      "Add your favorites to the bag, complete the checkout form, and choose Cash on Delivery. Your order ID appears immediately after a successful order.",
  },
];

function chat(req, res) {
  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 500) {
    return res.status(400).json({ message: "Please enter a short message." });
  }
  const match = replies.find((reply) => reply.test.test(message));
  return res.json({
    answer:
      match?.answer ||
      "I can help with watches, perfumes, orders, shipping, and returns. What would you like to explore?",
    source: "votion-assistant",
  });
}

module.exports = { chat };
