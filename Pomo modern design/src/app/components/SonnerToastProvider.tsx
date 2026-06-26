import { Toaster } from "sonner@2.0.3";
import "./styles/reminder-toast.css";

export const SonnerToastProvider = () => {
  return (
    <Toaster
      className="toaster group"
      theme="dark"
      position="top-center"
      toastOptions={{
        style: {
          background: "rgba(20, 20, 25, 0.85)",
          color: "var(--popover-foreground)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-body)",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.2)",
          backdropFilter: "blur(10px)",
          width: "400px",
          maxWidth: "400px",
          padding: "16px",
        },
        duration: 4000,
        className: {
          success: "success-toast",
          error: "error-toast",
          info: "info-toast",
          default: "default-toast",
        },
        // Don't close the toast when clicking
        closeButton: true
      }}
      closeButton
      richColors
      expand={false}
      visibleToasts={5}
      style={{
        width: "400px",
        maxWidth: "400px",
      }}
    />
  );
};