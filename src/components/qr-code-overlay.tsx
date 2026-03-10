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
        className="rounded-lg bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
        title={`Show QR code for ${label}`}
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
            className="relative mx-4 flex flex-col items-center gap-4 rounded-2xl border border-gray-700 bg-gray-900 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-semibold text-white">{label}</h3>

            <div className="rounded-xl bg-white p-4">
              <QRCodeSVG value={fullUrl} size={256} />
            </div>

            <p className="max-w-[280px] break-all text-center text-xs text-gray-400">
              {fullUrl}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
