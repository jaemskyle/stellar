import type { FunctionComponent } from "react";

interface MessageProps {
  message: string;
}

export const Message: FunctionComponent<MessageProps> = ({ message }) => (
  <section>
    <p>{message}</p>
  </section>
);
