import React from 'react';
import type { ReactNode } from 'react';

interface ConsoleLayoutProps {
  header: ReactNode;
  mainContent: ReactNode;
  sidePanel: ReactNode;
  footer?: ReactNode;
}

export function ConsoleLayout({
  header,
  mainContent,
  sidePanel,
  footer,
}: ConsoleLayoutProps) {
  return (
    <div data-component="ConsolePage">
      <div className="content-top">{header}</div>
      <div className="content-main">
        <div className="content-logs">{mainContent}</div>
        <div className="content-right">{sidePanel}</div>
      </div>
      {footer && <div className="content-footer">{footer}</div>}
    </div>
  );
}
