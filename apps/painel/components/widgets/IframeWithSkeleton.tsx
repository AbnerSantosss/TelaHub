import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

const LOAD_TIMEOUT_MS = 15000;

interface IframeWithSkeletonProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  errorMessage?: string;
}

// Skeleton consistente enquanto o iframe carrega + estado de erro amigável em timeout —
// evita que widgets pesados (Power BI, PDF, docs) pareçam travados numa tela em branco.
export const IframeWithSkeleton: React.FC<IframeWithSkeletonProps> = ({
  errorMessage = 'Não foi possível carregar este conteúdo.',
  onLoad,
  ...iframeProps
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setStatus('loading');
    timeoutRef.current = setTimeout(() => {
      setStatus((current) => (current === 'loading' ? 'error' : current));
    }, LOAD_TIMEOUT_MS);

    return () => clearTimeout(timeoutRef.current);
  }, [iframeProps.src, iframeProps.srcDoc]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <iframe
        {...iframeProps}
        onLoad={(e) => {
          setStatus('loaded');
          clearTimeout(timeoutRef.current);
          onLoad?.(e);
        }}
        style={{ ...iframeProps.style, visibility: status === 'error' ? 'hidden' : 'visible' }}
      />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 animate-pulse">
          <div className="w-full h-full flex flex-col gap-3 p-6">
            <div className="h-4 w-1/3 rounded bg-slate-800" />
            <div className="flex-1 rounded-xl bg-slate-800/60" />
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950 text-slate-500 text-sm">
          <AlertTriangle size={24} className="text-amber-500" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
