import type { APIRoute } from "astro";
import Stripe from "stripe";

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

const YOUR_DOMAIN = "http://localhost:4321"; // Note: Astro uses 4321 by default

export const POST: APIRoute = async ({ request }) => {
  try {
    const { session_id } = await request.json();
    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
    const returnUrl = YOUR_DOMAIN;

    console.log(
      "jkd create-portal-session",
      "\n==session_id",
      session_id,
      "\n==request=",
      request,
      "\n==checkoutSession=",
      checkoutSession,
    );

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: checkoutSession.customer,
      return_url: returnUrl,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
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
