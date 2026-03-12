"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, X } from "lucide-react";

interface QrCodeOverlayProps {
  /** Path portion of the URL, e.g. "/join/ABC123". Origin is resolved client-side. */
  path: string;
  label: string;
}

export function QrCodeButton({ path, label }: QrCodeOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fullUrl, setFullUrl] = useState("");

  const open = useCallback(() => {
    setFullUrl(`${window.location.origin}${path}`);
    setIsOpen(true);
  }, [path]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="border border-[#1F1F1F] p-2 text-[#555555] hover:border-white hover:text-white transition-colors"
        title={`Show QR code for ${label}`}
        aria-label={`Show QR code for ${label}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <QrCode className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative mx-4 flex flex-col items-center gap-4 border border-[#1F1F1F] bg-[#0A0A0A] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 p-1.5 text-[#555555] hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-xs font-bold text-white uppercase tracking-widest text-center mt-2">
              <span aria-hidden="true">── </span>{label}
            </h3>

            <div className="bg-white p-4">
              <QRCodeSVG value={fullUrl} size={256} />
            </div>

            <p className="max-w-[280px] break-all text-center text-xs text-[#555555]">
              {fullUrl}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
