'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="font-body antialiased bg-white text-slate-900">
        <div className="h-dvh w-full flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-destructive/10" />
            <div className="absolute inset-0 rounded-full border-t-4 border-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-lg font-black text-slate-900 tracking-tighter uppercase">
              Aurora OS
            </h1>
            <p className="text-[10px] font-black text-destructive uppercase tracking-widest">
              Error del Sistema
            </p>
            <p className="text-[9px] text-slate-500 max-w-sm">
              {error.message || 'Ha ocurrido un error inesperado en la aplicación.'}
            </p>
          </div>
          <button
            onClick={reset}
            className="px-4 py-2 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
