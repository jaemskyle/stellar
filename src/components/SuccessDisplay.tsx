import type { FunctionComponent } from "react";
import { Logo } from "./Logo";

interface SuccessDisplayProps {
  sessionId: string;
}

export const SuccessDisplay: FunctionComponent<SuccessDisplayProps> = ({
  sessionId,
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch("/api/create-portal-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
    const { url } = await response.json();
    window.location.href = url;
  };

  return (
    <section>
      <div className="product Box-root">
        <Logo />
        <div className="description Box-root">
          <h3>Subscription to starter plan successful!</h3>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <button id="checkout-and-portal-button" type="submit">
          Manage your billing information
        </button>
      </form>
    </section>
  );
};
