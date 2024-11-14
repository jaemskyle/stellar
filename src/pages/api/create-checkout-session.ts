import type { APIRoute } from "astro";
import Stripe from "stripe";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

const YOUR_DOMAIN = "http://localhost:4321"; // Note: Astro uses 4321 by default

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const prices = await stripe.prices.list({
      lookup_keys: [body.lookup_key],
      expand: ["data.product"],
    });

    const session = await stripe.checkout.sessions.create({
      billing_address_collection: "auto",
      line_items: [
        {
          price: prices.data[0].id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${YOUR_DOMAIN}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${YOUR_DOMAIN}/subscribe?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 303,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
