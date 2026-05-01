"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={3500}
      toastOptions={{
        style: {
          background: "#09090b",
          color: "#ffffff",
          border: "1px solid rgba(255,255,255,0.12)",
        },
      }}
    />
  );
}