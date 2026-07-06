export interface EstadoEvaluacionGuardada {
  cargando: boolean;
  evaluacion?: string;
  transcripcion?: string;
  error?: string;
}

/** Botón + resultado de "Transcribir y evaluar con IA" para una grabación ya guardada. */
export function EvaluacionGrabacionGuardada({
  estado,
  onEvaluar,
}: {
  estado: EstadoEvaluacionGuardada | undefined;
  onEvaluar: () => void;
}) {
  return (
    <div className="mt-2 border-t border-zinc-100 pt-2">
      {!estado?.evaluacion && (
        <button
          type="button"
          disabled={estado?.cargando}
          onClick={onEvaluar}
          className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 disabled:text-zinc-400"
        >
          {estado?.cargando
            ? 'Transcribiendo… (puede tardar unos minutos)'
            : 'Transcribir y evaluar con IA'}
        </button>
      )}

      {estado?.error && (
        <p className="mt-1 whitespace-pre-wrap text-[12px] font-medium text-red-600">
          {estado.error}
        </p>
      )}

      {estado?.evaluacion && (
        <div className="mt-2 rounded-lg border border-brand-100 bg-brand-50/40 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
            Evaluación
          </p>
          <p className="text-[13px] leading-relaxed text-zinc-800" style={{ whiteSpace: 'pre-wrap' }}>
            {estado.evaluacion}
          </p>
          {estado.transcripcion && (
            <details className="mt-2">
              <summary className="cursor-pointer select-none text-[12px] font-semibold text-zinc-500 hover:text-zinc-700">
                Ver transcripción
              </summary>
              <p
                className="mt-2 text-[13px] leading-relaxed text-zinc-600"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {estado.transcripcion}
              </p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
