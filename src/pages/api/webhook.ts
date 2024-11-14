import type { APIRoute } from "astro";
import Stripe from "stripe";

const stripe = new Stripe(
  "sk_test_51QIE4aFsbspQAQYw3FyGscWgt0aRdQRwCJKLefQdIWce43t16B2Xq3huGChu77KsudBvg0VCDuorJ8lgfpJ9EeZZ00F3sy7m8X",
);

export const POST: APIRoute = async ({ request }) => {
  const endpointSecret = "whsec_12345";
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event;

  try {
    if (endpointSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } else {
      event = JSON.parse(body);

      let subscription;
      let status;

      switch (event.type) {
        case "customer.subscription.trial_will_end":
          subscription = event.data.object;
          status = subscription.status;
          console.log(`Subscription status is ${status}.`);
          // handleSubscriptionTrialEnding(subscription);
          break;
        case "customer.subscription.deleted":
          subscription = event.data.object;
          status = subscription.status;
          console.log(`Subscription status is ${status}.`);
          // handleSubscriptionDeleted(subscriptionDeleted);
          break;
        case "customer.subscription.created":
          subscription = event.data.object;
          status = subscription.status;
          console.log(`Subscription status is ${status}.`);
          // handleSubscriptionCreated(subscription);
          break;
        case "customer.subscription.updated":
          subscription = event.data.object;
          status = subscription.status;
          console.log(`Subscription status is ${status}.`);
          // handleSubscriptionUpdated(subscription);
          break;
        case "entitlements.active_entitlement_summary.updated":
          subscription = event.data.object;
          console.log(
            `Active entitlement summary updated for ${subscription}.`,
          );
          // handleEntitlementUpdated(subscription);
          break;
        default:
          console.log(`Unhandled event type ${event.type}.`);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};
