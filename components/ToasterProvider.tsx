"use client";

import { Toaster } from "sonner";

export function ToasterProvider() {
  return (
    <Toaster
      position="bottom-right"
      theme="system"
      richColors
      closeButton
      expand
      visibleToasts={3}
      toastOptions={{
        duration: 4000,
      }}
    />
  );
}
