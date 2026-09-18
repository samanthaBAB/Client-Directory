"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

interface ModalState {
  message: string;
  mode: "alert" | "confirm";
  resolve?: (value: boolean) => void;
}

interface ModalContextValue {
  alert: (message: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState | null>(null);

  const alertFn = useCallback((message: string) => {
    setState({ message, mode: "alert" });
  }, []);

  const confirmFn = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ message, mode: "confirm", resolve });
    });
  }, []);

  const close = (result: boolean) => {
    state?.resolve?.(result);
    setState(null);
  };

  return (
    <ModalContext.Provider value={{ alert: alertFn, confirm: confirmFn }}>
      {children}
      {state && (
        <div className="lightbox" onClick={() => close(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <p style={{ margin: "0 0 16px", color: "var(--text)", fontSize: 15, lineHeight: 1.5 }}>
              {state.message}
            </p>
            <div className="form-actions">
              {state.mode === "confirm" ? (
                <>
                  <button className="btn" onClick={() => close(true)}>Yes, remove it</button>
                  <button className="btn secondary" onClick={() => close(false)}>Cancel</button>
                </>
              ) : (
                <button className="btn" onClick={() => close(true)}>OK</button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null;
  return (
    <div className="lightbox" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Job photo" />
    </div>
  );
}
