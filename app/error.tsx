"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-dark-950 text-white px-6">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold">Nešto nije u redu</h1>
            <p className="text-sm text-white/70">
              Došlo je do greške. Pokušajte ponovo ili osvježite stranicu.
            </p>
            {error?.digest && (
              <p className="text-xs text-white/40">Kod greške: {error.digest}</p>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => reset()}
                className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold hover:bg-white/20"
              >
                Pokušaj ponovo
              </button>
              <button
                onClick={() => location.reload()}
                className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold hover:bg-white/10"
              >
                Osvježi
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
