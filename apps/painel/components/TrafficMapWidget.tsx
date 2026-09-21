/// <reference types="google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Car, Navigation, MapPin } from 'lucide-react';

interface TrafficMapProps {
  apiKey?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  showTrafficLayer?: boolean;
  mapType?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
  showTrafficStatus?: boolean;
  locationName?: string;
  className?: string;
}

export const TrafficMapWidget: React.FC<TrafficMapProps> = ({
  apiKey,
  lat = -23.55052, // Sao Paulo default
  lng = -46.633309,
  zoom = 12,
  showTrafficLayer = true,
  mapType = 'roadmap',
  showTrafficStatus = true,
  locationName = 'São Paulo',
  className
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [trafficLayerInstance, setTrafficLayerInstance] = useState<google.maps.TrafficLayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trafficLevel, setTrafficLevel] = useState<'Low' | 'Moderate' | 'Heavy'>('Moderate');

  const [debouncedApiKey, setDebouncedApiKey] = useState(apiKey);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    const handleAuthFailure = () => {
      setError("Falha na autenticação do Google Maps. Verifique se sua API Key é válida, possui a API 'Maps JavaScript' ativada e se o faturamento está configurado no Google Cloud Console.");
    };
    
    // Google Maps API triggers this specific function name on window if auth fails
    (window as any).gm_authFailure = handleAuthFailure;

    return () => {
      // Clean up strictly if we were the ones who set it, or just leave it be as it's a global handler
      if ((window as any).gm_authFailure === handleAuthFailure) {
          (window as any).gm_authFailure = undefined;
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedApiKey(apiKey?.trim());
    }, 1000);
    return () => clearTimeout(timer);
  }, [apiKey]);

  useEffect(() => {
    if (!debouncedApiKey) return;

    const initMap = async () => {
      try {
        // Check if Google Maps is already available
        if (window.google && window.google.maps) {
           if (!google.maps.importLibrary) {
               setError("A versão da API do Google Maps carregada não suporta importLibrary. Recarregue a página.");
               return;
           }
           
           try {
             const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
             if (!mapRef.current) return;
             
             const map = new Map(mapRef.current, {
              center: { lat, lng },
              zoom,
              mapTypeId: mapType,
              disableDefaultUI: true,
              zoomControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              styles: [
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }]
                }
              ]
            });

            if (showTrafficLayer) {
              const trafficLayer = new google.maps.TrafficLayer();
              trafficLayer.setMap(map);
              setTrafficLayerInstance(trafficLayer);
            }

            setMapInstance(map);
            setIsScriptLoaded(true);
            setError(null);
           } catch (err: any) {
             console.error("Error importing maps library:", err);
             setError(`Erro ao inicializar mapa: ${err.message}`);
           }
           return;
        }

        // Check if script tag already exists
        const scriptId = 'google-maps-script';
        const existingScript = document.getElementById(scriptId) as HTMLScriptElement;

        if (existingScript) {
          // If script exists but google.maps isn't ready, it might be loading or failed.
          // If the key in the script is different from the current one, we need a reload.
          if (existingScript.src && !existingScript.src.includes(`key=${debouncedApiKey}`)) {
             setError("A chave da API foi alterada. Por favor, recarregue a página para aplicar a nova chave.");
             return;
          }
          
          // If script exists but google is not ready, wait for it
          if (!window.google || !window.google.maps) {
              const handleLoad = () => {
                  initMap();
                  existingScript.removeEventListener('load', handleLoad);
              };
              existingScript.addEventListener('load', handleLoad);
              return;
          }
          
          // If google is ready but we are here, it means the first check failed?
          // The first check is `if (window.google && window.google.maps)`.
          // So if we are here, `window.google` is likely missing.
          // But we just checked `if (!window.google)`.
          // So this block is reachable if `window.google` exists but `window.google.maps` is missing?
          // Or if the first check passed but we didn't return?
          // Ah, the first check has a `return`.
          
          // So if we are here, `window.google` is missing (handled above) OR...
          // Wait, if `window.google` exists, we entered the first block and returned.
          // So we only reach here if `window.google` is falsy.
          // So the `if (!window.google ...)` check above is redundant but safe.
          // Actually, if `window.google` is missing, we fall through to here.
          // So we attach the listener.
          return;
        }

        // Inject script
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${debouncedApiKey}&libraries=places,maps&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = async () => {
           try {
             const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
             if (!mapRef.current) return;
             
             const map = new Map(mapRef.current, {
              center: { lat, lng },
              zoom,
              mapTypeId: mapType,
              disableDefaultUI: true,
              zoomControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              styles: [
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }]
                }
              ]
            });

            if (showTrafficLayer) {
              const trafficLayer = new google.maps.TrafficLayer();
              trafficLayer.setMap(map);
              setTrafficLayerInstance(trafficLayer);
            }

            setMapInstance(map);
            setIsScriptLoaded(true);
            setError(null);
           } catch (err: any) {
             console.error("Error initializing map after load:", err);
             setError(`Erro ao inicializar mapa: ${err.message}`);
           }
        };
        script.onerror = (e) => {
          setError("Falha ao carregar o script do Google Maps. Verifique sua conexão ou a chave da API.");
          console.error(e);
        };
        document.head.appendChild(script);

      } catch (e: any) {
        console.error("Google Maps Load Error:", e);
        setError(e.message);
      }
    };

    initMap();

  }, [debouncedApiKey]); // Only re-init if debounced API key changes

  // Update map properties dynamically
  useEffect(() => {
    if (mapInstance) {
      mapInstance.setCenter({ lat, lng });
      mapInstance.setZoom(zoom);
      mapInstance.setMapTypeId(mapType);
    }
  }, [lat, lng, zoom, mapType, mapInstance]);

  // Toggle Traffic Layer
  useEffect(() => {
    if (trafficLayerInstance) {
      trafficLayerInstance.setMap(showTrafficLayer ? mapInstance : null);
    } else if (showTrafficLayer && mapInstance) {
      const trafficLayer = new google.maps.TrafficLayer();
      trafficLayer.setMap(mapInstance);
      setTrafficLayerInstance(trafficLayer);
    }
  }, [showTrafficLayer, mapInstance]);

  // Mock traffic analysis update (Simulated for visual feedback as requested)
  useEffect(() => {
    const interval = setInterval(() => {
       // In a real app, this would query a backend or Distance Matrix API
       const levels: ('Low' | 'Moderate' | 'Heavy')[] = ['Low', 'Moderate', 'Heavy'];
       // Weighted random to favor Moderate/Heavy in cities
       const rand = Math.random();
       const level = rand > 0.6 ? 'Heavy' : rand > 0.3 ? 'Moderate' : 'Low';
       setTrafficLevel(level);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-400 p-6 text-center border border-slate-800 rounded-xl">
        <AlertTriangle className="mb-3 text-yellow-500" size={32} />
        <h3 className="text-lg font-bold text-slate-200 mb-2">Configuração Necessária</h3>
        <p className="text-sm">Adicione sua Google Maps API Key nas configurações do widget para visualizar o mapa.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-red-950/30 text-red-400 p-6 text-center border border-red-900/50 rounded-xl">
        <AlertTriangle className="mb-3" size={32} />
        <h3 className="text-lg font-bold mb-2">Erro ao carregar mapa</h3>
        <p className="text-xs font-mono bg-black/30 p-2 rounded">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden rounded-xl bg-slate-900 ${className}`}>
      <div ref={mapRef} className="w-full h-full" />
      
      {showTrafficStatus && (
        <div className="absolute top-4 right-4 bg-slate-950/90 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl shadow-2xl w-64 z-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-slate-100 font-bold text-sm flex items-center gap-2">
              <Car size={16} className="text-cyan-400" />
              Tráfego em Tempo Real
            </h3>
            <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">Ao Vivo</span>
            </div>
          </div>
          
          <div className="mb-5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Região Monitorada</div>
            <div className="text-white font-medium truncate flex items-center gap-1.5 text-sm">
               <MapPin size={14} className="text-red-400" /> {locationName}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Nível de Congestionamento</span>
              <span className={`text-sm font-bold ${
                trafficLevel === 'Low' ? 'text-emerald-400' :
                trafficLevel === 'Moderate' ? 'text-amber-400' : 'text-rose-500'
              }`}>
                {trafficLevel === 'Low' ? 'Fluindo Bem' : trafficLevel === 'Moderate' ? 'Moderado' : 'Intenso'}
              </span>
            </div>
            
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden flex relative">
              {/* Background gradient for context */}
              <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
              
              {/* Active indicator */}
              <div 
                className={`h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
                  trafficLevel === 'Low' ? 'w-[30%] bg-emerald-500' : 
                  trafficLevel === 'Moderate' ? 'w-[60%] bg-amber-500' : 'w-[95%] bg-rose-600'
                }`} 
              />
            </div>

            <div className="flex justify-between text-[9px] text-slate-600 font-mono pt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
