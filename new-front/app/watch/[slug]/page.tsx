"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import { 
  Play, 
  ArrowLeft, 
  Pause,
  Volume2,
  VolumeX,
  Settings,
  RotateCcw,
  Wifi,
  WifiOff,
  Activity,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle
} from "lucide-react";

interface StreamStats {
  segmentsReceived: number;
  bytesReceived: number;
  duration: number;
  bufferedSeconds: number;
  connectionTime: number;
  processingTime: number;
}

export default function WatchMovie() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const slug = params.slug as string;

  // Video refs and streaming states
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const connectionStartTime = useRef<number>(0);
  const preparationStartTime = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // UI states
  const [log, setLog] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [preparationStatus, setPreparationStatus] = useState<'idle' | 'preparing' | 'success' | 'error' | 'processing'>('idle');
  const [processingProgress, setProcessingProgress] = useState<string>("");
  
  // Extended timeout states
  const [isWaitingForProcessing, setIsWaitingForProcessing] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<number>(0);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number>(0);
  
  // Debug states
  const [streamStats, setStreamStats] = useState<StreamStats>({
    segmentsReceived: 0,
    bytesReceived: 0,
    duration: 0,
    bufferedSeconds: 0,
    connectionTime: 0,
    processingTime: 0
  });

  const addLog = (msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toISOString().slice(11, 23);
    const prefix = {
      info: '🔵',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type];
    
    const logEntry = `[${timestamp}] ${prefix} ${msg}`;
    setLog(prev => [...prev.slice(-99), logEntry]);
    console.log(`Chapinflix Stream: ${logEntry}`);
  };

  const updateStats = (field: keyof StreamStats, value: number) => {
    setStreamStats(prev => ({ ...prev, [field]: value }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Extended preparation with progress tracking
  const prepareMovie = async (retryCount = 0): Promise<boolean> => {
    const maxRetries = 3;
    const baseTimeout = 30000; // 30 seconds base
    const extendedTimeout = Math.min(baseTimeout * (retryCount + 1), 180000); // Max 3 minutes
    
    const url = `http://34.135.146.173.nip.io/verpeli/movie/${encodeURIComponent(slug)}/prepare`;
    addLog(`Preparación #${retryCount + 1}: POST ${url} (timeout: ${extendedTimeout/1000}s)`);
    setPreparationStatus('preparing');
    setIsWaitingForProcessing(true);
    
    preparationStartTime.current = Date.now();
    setProcessingStartTime(Date.now());

    // Progress estimator
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - preparationStartTime.current;
      const progress = Math.min((elapsed / extendedTimeout) * 100, 95);
      setProcessingProgress(`Procesando video... ${Math.round(progress)}%`);
    }, 1000);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        addLog(`Timeout después de ${extendedTimeout/1000}s`, 'warning');
      }, extendedTimeout);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);

      const processingTime = Date.now() - preparationStartTime.current;
      updateStats('processingTime', processingTime);

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        if (res.status === 408 || res.status === 504) {
          addLog(`Timeout del servidor (${res.status}), reintentando...`, 'warning');
          if (retryCount < maxRetries) {
            return await prepareMovie(retryCount + 1);
          }
        }
        
        addLog(`Error HTTP ${res.status}: ${JSON.stringify(data)}`, 'error');
        setPreparationStatus('error');
        setConnectionError(`Error del servidor: ${res.status} - Video podría estar procesándose`);
        setIsWaitingForProcessing(false);
        return false;
      }

      addLog(`✅ Preparación completada en ${formatTime(processingTime/1000)}: ${JSON.stringify(data)}`, 'success');
      setPreparationStatus('success');
      setIsWaitingForProcessing(false);
      setProcessingProgress("");
      return true;
      
    } catch (err: unknown) {
      clearInterval(progressInterval);
      
      const error = err as Error;
      
      if (error.name === 'AbortError') {
        addLog(`Preparación cancelada por timeout`, 'warning');
        if (retryCount < maxRetries) {
          addLog(`Reintentando preparación (${retryCount + 1}/${maxRetries})...`, 'info');
          return await prepareMovie(retryCount + 1);
        } else {
          addLog(`Máximo de reintentos alcanzado. El video podría requerir más tiempo de procesamiento.`, 'error');
          setPreparationStatus('error');
          setConnectionError(`El video está tardando mucho en procesarse. Intenta nuevamente en unos minutos.`);
          setIsWaitingForProcessing(false);
          return false;
        }
      }
      
      addLog(`Error de red: ${error.message}`, 'error');
      setPreparationStatus('error');
      setConnectionError(`Error de conexión: ${error.message}`);
      setIsWaitingForProcessing(false);
      return false;
    }
  };

  // WebSocket connection with extended timeouts
  const connectWebSocket = () => {
    addLog(`Conectando WebSocket...`);
    setIsConnecting(true);
    connectionStartTime.current = Date.now();
    
    const wsUrl = `ws://34.135.146.173.nip.io/verpeli/movie/ws/watch/${encodeURIComponent(slug)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Extended WebSocket timeout
    wsTimeoutRef.current = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        addLog("WebSocket timeout - cerrando conexión", 'warning');
        ws.close();
        setConnectionError("Timeout en conexión WebSocket - el servidor podría estar ocupado");
        setIsConnecting(false);
      }
    }, 15000); // 15 seconds for WebSocket

    ws.onopen = () => {
      if (wsTimeoutRef.current) {
        clearTimeout(wsTimeoutRef.current);
      }
      
      const connectionTime = Date.now() - connectionStartTime.current;
      updateStats('connectionTime', connectionTime);
      addLog(`WebSocket conectado en ${connectionTime}ms`, 'success');
      setIsReady(true);
      setIsConnecting(false);
      setConnectionError(null);
    };

    ws.onclose = (event) => {
      if (wsTimeoutRef.current) {
        clearTimeout(wsTimeoutRef.current);
      }
      
      addLog(`WebSocket cerrado - Código: ${event.code}, Razón: ${event.reason}`, 'warning');
      setIsReady(false);
      setIsConnecting(false);
      
      if (event.code !== 1000 && event.code !== 1001) {
        setConnectionError(`Conexión perdida (${event.code}): ${event.reason || 'Razón desconocida'}`);
      }
    };

    ws.onerror = (event) => {
      if (wsTimeoutRef.current) {
        clearTimeout(wsTimeoutRef.current);
      }
      
      addLog(`Error WebSocket: ${JSON.stringify(event)}`, 'error');
      setIsReady(false);
      setIsConnecting(false);
      setConnectionError("Error de conexión WebSocket");
    };

    ws.onmessage = (evt) => {
      let msg: {
        type: string;
        base64?: string;
        codecs?: string;
        segDuration?: number;
        chunkFirst?: number;
        chunkLast?: number;
        message?: string;
      };
      
      try {
        msg = JSON.parse(evt.data);
      } catch (error) {
        addLog(`Error parsing mensaje: ${error}`, 'error');
        return;
      }

      addLog(`Mensaje: ${msg.type}${msg.base64 ? ` (${Math.round(msg.base64.length/1024)}KB)` : ''}`);

      // Handle messages
      if (msg.type === "meta") {
        const codecs = `video/mp4; codecs="${msg.codecs || 'avc1.42E01E,mp4a.40.2'}"`;
        
        if (!sourceBufferRef.current && mediaSourceRef.current) {
          try {
            sourceBufferRef.current = mediaSourceRef.current.addSourceBuffer(codecs);
            sourceBufferRef.current.mode = "segments";
            sourceBufferRef.current.addEventListener("updateend", appendNext);
            addLog(`SourceBuffer creado: ${codecs}`, 'success');
          } catch (error) {
            addLog(`Error SourceBuffer: ${error}`, 'error');
            setConnectionError("Error configurando reproductor");
            return;
          }
        }

        addLog(`Metadatos: ${msg.segDuration || 2}s/seg, chunks=[${msg.chunkFirst}-${msg.chunkLast}]`, 'success');
      }

      if (msg.type === "init" && msg.base64) {
        const initData = base64ToArrayBuffer(msg.base64);
        if (initData.byteLength > 0) {
          queueRef.current.push(initData);
          appendNext();
          addLog(`Init: ${initData.byteLength} bytes`, 'success');
        }
      }

      if (msg.type === "segment" && msg.base64) {
        const segmentData = base64ToArrayBuffer(msg.base64);
        if (segmentData.byteLength > 0) {
          queueRef.current.push(segmentData);
          appendNext();
          addLog(`Segment: ${Math.round(segmentData.byteLength/1024)}KB`);
        }
      }

      if (msg.type === "eos") {
        try {
          mediaSourceRef.current?.endOfStream();
          addLog(`Stream completado: ${streamStats.segmentsReceived} segmentos, ${Math.round(streamStats.bytesReceived/1024)}KB`, 'success');
        } catch (error) {
          addLog(`Error EOS: ${error}`, 'error');
        }
      }

      if (msg.type === "error") {
        addLog(`Error servidor: ${JSON.stringify(msg)}`, 'error');
        setConnectionError(`Error del servidor: ${msg.message || 'Error desconocido'}`);
      }
    };
  };

  const base64ToArrayBuffer = (b64: string): ArrayBuffer => {
    try {
      const binaryString = atob(b64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      addLog(`Error decodificando base64: ${error}`, 'error');
      return new ArrayBuffer(0);
    }
  };

  const appendNext = () => {
    if (!sourceBufferRef.current || sourceBufferRef.current.updating) return;
    
    const chunk = queueRef.current.shift();
    if (!chunk) return;
    
    try {
      sourceBufferRef.current.appendBuffer(chunk);
      updateStats('segmentsReceived', streamStats.segmentsReceived + 1);
      updateStats('bytesReceived', streamStats.bytesReceived + chunk.byteLength);
    } catch (error) {
      queueRef.current.unshift(chunk);
      setTimeout(appendNext, 200);
    }
  };

  const resetPlayer = () => {
    addLog("Reseteando sistema...");
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    
    if (wsTimeoutRef.current) {
      clearTimeout(wsTimeoutRef.current);
    }
    
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    } catch (error) {
      addLog(`Error cerrando WebSocket: ${error}`, 'warning');
    }
    
    wsRef.current = null;
    queueRef.current = [];
    sourceBufferRef.current = null;
    
    setStreamStats({
      segmentsReceived: 0,
      bytesReceived: 0,
      duration: 0,
      bufferedSeconds: 0,
      connectionTime: 0,
      processingTime: 0
    });
    
    try {
      mediaSourceRef.current = new MediaSource();
      mediaSourceRef.current.addEventListener("sourceopen", onSourceOpen);
      
      if (videoRef.current) {
        videoRef.current.src = URL.createObjectURL(mediaSourceRef.current);
      }
    } catch (error) {
      addLog(`Error MediaSource: ${error}`, 'error');
      setConnectionError("Error inicializando reproductor");
    }
  };

  const onSourceOpen = () => {
    addLog("MediaSource lista - iniciando WebSocket", 'success');
    connectWebSocket();
  };

  const retry = () => {
    addLog("🔄 Reintentando conexión completa...", 'info');
    setConnectionError(null);
    setIsReady(false);
    setPreparationStatus('idle');
    setIsWaitingForProcessing(false);
    setProcessingProgress("");
    setLog(prev => prev.slice(-5)); // Keep last few logs
    
    const init = async () => {
      const prepared = await prepareMovie();
      if (prepared) {
        setTimeout(() => resetPlayer(), 1000);
      }
    };
    
    init();
  };

  useEffect(() => {
    addLog(`🎬 Iniciando reproducción: ${slug}`, 'info');
    
    if (!token) {
      addLog("Sin token - redirigiendo", 'warning');
      router.push("/login");
      return;
    }

    let mounted = true;

    const init = async () => {
      if (!mounted) return;
      const prepared = await prepareMovie();
      if (prepared && mounted) {
        setTimeout(() => {
          if (mounted) resetPlayer();
        }, 1000);
      }
    };

    init();

    return () => {
      mounted = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (wsTimeoutRef.current) clearTimeout(wsTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [slug, token]);

  const sendCommand = (cmd: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(cmd));
      addLog(`Comando: ${JSON.stringify(cmd)}`, 'success');
    }
  };

  const handlePlay = () => {
    addLog("🎯 Usuario presionó play - enviando comando", 'info');
    sendCommand({ type: "PLAY" });
    
    // También intentar solicitar más segmentos si solo tenemos init
    if (streamStats.segmentsReceived <= 1) {
      addLog("🔄 Solicitando más segmentos...", 'info');
      sendCommand({ type: "REQUEST_SEGMENTS" });
    }
    
    if (videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        addLog("▶️ Reproducción iniciada", 'success');
      }).catch((error: Error) => {
        addLog(`Error play: ${error.message}`, 'error');
      });
    }
  };

  const movieTitle = slug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Película';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => router.push("/catalog")}
            className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors bg-black/50 px-3 py-2 rounded-lg backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver al catálogo</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
              <Play className="w-4 h-4 fill-white" />
            </div>
            <span className="text-xl font-bold">Chapinflix</span>
          </div>
        </div>
      </header>

      <div className="relative">
        {/* Video Player Container */}
        <div className="relative aspect-video bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={(e) => addLog(`Video error: ${(e.target as HTMLVideoElement).error?.message}`, 'error')}
            onCanPlay={() => addLog("Video listo para reproducir", 'success')}
          />

          {/* Extended Processing Overlay */}
          {isWaitingForProcessing && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="relative mb-6">
                  <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <Clock className="absolute inset-0 w-8 h-8 text-blue-400 m-auto" />
                </div>
                
                <h3 className="text-xl font-medium mb-2">Procesando video</h3>
                <p className="text-gray-400 mb-4">{processingProgress || "Preparando video para streaming..."}</p>
                
                {processingStartTime > 0 && (
                  <div className="text-sm text-gray-500 mb-4">
                    Tiempo transcurrido: {formatTime(Math.floor((Date.now() - processingStartTime) / 1000))}
                  </div>
                )}
                
                <button
                  onClick={retry}
                  className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Cancelar y reintentar
                </button>
              </div>
            </div>
          )}

          {/* Connection Loading */}
          {isConnecting && !isWaitingForProcessing && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
                <h3 className="text-xl font-medium mb-2">Conectando al streaming</h3>
                <p className="text-gray-400">Estableciendo conexión WebSocket...</p>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {connectionError && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
              <div className="text-center max-w-md">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <h3 className="text-xl font-medium mb-2">Error de conexión</h3>
                <p className="text-gray-400 mb-6">{connectionError}</p>
                
                {streamStats.processingTime > 0 && (
                  <div className="mb-4 p-3 bg-gray-800 rounded-lg text-sm">
                    <p>Tiempo de procesamiento: {formatTime(streamStats.processingTime / 1000)}</p>
                  </div>
                )}
                
                <div className="space-y-3">
                  <button
                    onClick={retry}
                    className="btn btn-primary flex items-center space-x-2 mx-auto"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reintentar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Play Button */}
          {isReady && !isPlaying && !connectionError && !isWaitingForProcessing && streamStats.segmentsReceived > 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center">
                <button
                  onClick={handlePlay}
                  className="bg-blue-600 hover:bg-blue-700 rounded-full p-6 transition-all duration-200 hover:scale-110 mb-4"
                >
                  <Play className="w-12 h-12 fill-white" />
                </button>
                <div className="text-sm text-gray-300">
                  Segmentos: {streamStats.segmentsReceived} | Datos: {Math.round(streamStats.bytesReceived/1024)}KB
                </div>
              </div>
            </div>
          )}
          
          {/* Debug Play Button - Mostrar siempre si está listo */}
          {isReady && !isPlaying && !connectionError && !isWaitingForProcessing && streamStats.segmentsReceived === 0 && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                <h3 className="text-lg font-medium mb-2">Sin segmentos de video</h3>
                <p className="text-gray-400 mb-4">WebSocket conectado pero no se reciben datos del video.</p>
                <button
                  onClick={() => {
                    addLog("🔄 Solicitando reinicio del stream...", 'info');
                    sendCommand({ type: "RESTART" });
                    sendCommand({ type: "PLAY" });
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 rounded-lg px-4 py-2 text-sm"
                >
                  Forzar inicio del stream
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats and Controls */}
        <div className="p-6 bg-gradient-to-b from-transparent to-black">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">{movieTitle}</h1>
            
            {/* Enhanced Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  {isReady ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                </div>
                <div className="text-xs text-gray-400">Estado</div>
                <div className={`text-sm font-medium ${isReady ? 'text-green-400' : 'text-red-400'}`}>
                  {isReady ? 'Conectado' : 'Desconectado'}
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <Activity className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                <div className="text-xs text-gray-400">Segmentos</div>
                <div className="text-sm font-medium text-white">{streamStats.segmentsReceived}</div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400">Datos</div>
                <div className="text-sm font-medium text-white">
                  {Math.round(streamStats.bytesReceived / 1024)}KB
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400">WebSocket</div>
                <div className="text-sm font-medium text-white">{streamStats.connectionTime}ms</div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <Clock className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
                <div className="text-xs text-gray-400">Preparación</div>
                <div className="text-sm font-medium text-white">
                  {streamStats.processingTime > 0 ? formatTime(streamStats.processingTime / 1000) : '-'}
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-400">Estado</div>
                <div className="text-sm font-medium">
                  {preparationStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />}
                  {preparationStatus === 'preparing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin mx-auto" />}
                  {preparationStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500 mx-auto" />}
                </div>
              </div>
            </div>

            {/* Debug Logs */}
            {showLogs && (
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium flex items-center space-x-2">
                    <Activity className="w-4 h-4" />
                    <span>Logs del sistema</span>
                  </h3>
                  <button
                    onClick={() => setLog([])}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
                <div className="bg-black rounded-lg p-3 max-h-64 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap text-green-400">
                    {log.length > 0 ? log.join("\n") : "Iniciando logs del sistema..."}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}