import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { SuccessDisplay } from "./SuccessDisplay";
import { Message } from "./Message";

export const ProductDisplay = () => {
  const [displayComponent, setDisplayComponent] =
    useState<React.ReactNode | null>(null);

  useEffect(() => {
    // Check URL parameters
    const query = new URLSearchParams(window.location.search);
    const success = query.get("success");
    const sessionId = query.get("session_id");
    const canceled = query.get("canceled");

    if (success && sessionId) {
      setDisplayComponent(<SuccessDisplay sessionId={sessionId} />);
    } else if (canceled) {
      setDisplayComponent(
        <Message message="Order canceled -- continue to shop around and checkout when you're ready." />,
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lookup_key: "Clinic_Chat-dce7959",
      }),
    });
    const { url } = await response.json();
    window.location.href = url;
  };

  // If we have a special display component, show that instead of the default view
  if (displayComponent) {
    return <>{displayComponent}</>;
  }

  // Default product display
  return (
    <section>
      <div className="product">
        <Logo />
        <div className="description">
          <h3>Starter plan</h3>
          <h5>$20.00 / month</h5>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <button id="checkout-and-portal-button" type="submit">
          Checkout
        </button>
      </form>
    </section>
  );
};
