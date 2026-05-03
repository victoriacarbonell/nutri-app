import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat, NotFoundException } from "@zxing/library";
import { Loader2, ScanLine, X, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface OffProductInfo {
  barcode: string;
  name: string;
  brand: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
  category: string;
  imageUrl: string | null;
}

interface BarcodeScannerProps {
  onResult: (product: OffProductInfo) => void;
  onClose: () => void;
}

type ScanState = "idle" | "scanning" | "found" | "looking_up" | "not_found" | "error";

async function lookupBarcode(barcode: string): Promise<OffProductInfo> {
  const resp = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    { headers: { "User-Agent": "CalorApp/1.0" } }
  );
  if (!resp.ok) throw new Error("Network error");
  const data = await resp.json();
  if (data.status !== 1) throw new Error("Product not found");

  const p = data.product;
  const n100 = p.nutriments ?? {};

  const cal =
    n100["energy-kcal_100g"] ??
    n100["energy-kcal"] ??
    Math.round((n100["energy_100g"] ?? 0) / 4.184);

  return {
    barcode,
    name: p.product_name_es || p.product_name || "Producto desconocido",
    brand: p.brands || "",
    caloriesPer100g: Math.round(Number(cal) || 0),
    proteinPer100g: Math.round((Number(n100["proteins_100g"]) || 0) * 10) / 10,
    carbsPer100g: Math.round((Number(n100["carbohydrates_100g"]) || 0) * 10) / 10,
    fatPer100g: Math.round((Number(n100["fat_100g"]) || 0) * 10) / 10,
    fiberPer100g:
      n100["fiber_100g"] != null
        ? Math.round((Number(n100["fiber_100g"]) || 0) * 10) / 10
        : null,
    category:
      (p.categories_tags?.[0] ?? "").replace(/^en:|^es:/, "") || "General",
    imageUrl: p.image_front_small_url || p.image_url || null,
  };
}

export default function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [product, setProduct] = useState<OffProductInfo | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const hasScannedRef = useRef(false);

  const stopCamera = useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {}
    controlsRef.current = null;
    readerRef.current = null;
  }, []);

  const startScanning = useCallback(async () => {
    if (!videoRef.current) return;
    hasScannedRef.current = false;
    setErrorMsg("");
    setState("scanning");
    setProduct(null);
    setScannedBarcode("");

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    try {
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, err) => {
          if (hasScannedRef.current) return;
          if (result) {
            hasScannedRef.current = true;
            const barcode = result.getText();
            setScannedBarcode(barcode);
            setState("looking_up");
            stopCamera();
            try {
              const info = await lookupBarcode(barcode);
              setProduct(info);
              setState("found");
            } catch {
              setState("not_found");
            }
          } else if (err && !(err instanceof NotFoundException)) {
          }
        }
      );
      controlsRef.current = controls;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
        setErrorMsg("Permiso de cámara denegado. Actívalo en los ajustes de Safari/Chrome e inténtalo otra vez.");
      } else if (msg.toLowerCase().includes("notallowed")) {
        setErrorMsg("iPhone bloqueó la cámara. Toca 'Abrir escáner' otra vez y permite el acceso.");
      } else {
        setErrorMsg("No se pudo acceder a la cámara.");
      }
      setState("error");
    }
  }, [stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 pt-safe-top pt-10 pb-4 bg-black/80 backdrop-blur-sm">
        <h2 className="text-white font-semibold text-lg">Escáner de código de barras</h2>
        <button onClick={handleClose} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <X size={20} className="text-white" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

        {state === "idle" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 px-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Smartphone size={30} className="text-green-400" />
            </div>
            <p className="text-white font-semibold text-center">Pulsa para activar la cámara</p>
            <p className="text-white/60 text-sm text-center max-w-xs">
              En iPhone debes tocar un botón antes de permitir la cámara.
            </p>
            <Button className="mt-2 bg-green-500 hover:bg-green-600 text-white rounded-2xl h-12 px-8" onClick={startScanning}>
              Abrir escáner
            </Button>
            <p className="text-white/45 text-xs text-center max-w-xs">
              Si Safari te pregunta permiso, pulsa “Permitir” y vuelve a intentarlo.
            </p>
          </div>
        )}

        {state === "scanning" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative w-72 h-52 z-10">
              <div className="absolute inset-0 border-2 border-white/70 rounded-2xl" />
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-2xl" />
              <div className="absolute left-2 right-2 h-0.5 bg-green-400 shadow-[0_0_8px_2px_rgba(74,222,128,0.7)] animate-scan" />
            </div>
            <p className="relative z-10 mt-6 text-white/80 text-sm text-center px-8">Centra el código de barras dentro del recuadro</p>
          </div>
        )}

        {state === "looking_up" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
            <Loader2 size={48} className="text-green-400 animate-spin" />
            <p className="text-white font-medium">Buscando producto…</p>
            <p className="text-white/50 text-sm font-mono">{scannedBarcode}</p>
          </div>
        )}

        {state === "not_found" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 px-8">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <X size={32} className="text-red-400" />
            </div>
            <p className="text-white font-semibold text-center">Producto no encontrado</p>
            <p className="text-white/60 text-sm text-center">Código: <span className="font-mono">{scannedBarcode}</span></p>
            <p className="text-white/50 text-xs text-center">Este producto no está en la base de datos de Open Food Facts</p>
            <Button className="mt-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl h-12 px-8" onClick={startScanning}>
              <RefreshCw size={16} className="mr-2" />
              Volver a escanear
            </Button>
          </div>
        )}

        {state === "error" && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4 px-8">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <X size={32} className="text-red-400" />
            </div>
            <p className="text-white font-semibold text-center">Error de cámara</p>
            <p className="text-white/60 text-sm text-center">{errorMsg}</p>
            <Button className="mt-2 bg-green-500 hover:bg-green-600 text-white rounded-2xl h-12 px-8" onClick={startScanning}>
              Intentar otra vez
            </Button>
          </div>
        )}
      </div>

      {state === "found" && product && (
        <div className="bg-white rounded-t-3xl px-6 pt-6 pb-safe-bottom pb-8 shadow-2xl animate-slide-up">
          <div className="flex gap-4 items-start mb-5">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-20 h-20 rounded-2xl object-contain bg-gray-50 border border-gray-100 shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                <ScanLine size={28} className="text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-2">{product.name}</h3>
              {product.brand && <p className="text-sm text-gray-500 mt-0.5">{product.brand}</p>}
              <p className="text-xs text-gray-400 mt-1 font-mono">{product.barcode}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 mb-5">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Por 100g</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-gray-900">{product.caloriesPer100g}</p>
                <p className="text-[10px] text-gray-400 uppercase mt-0.5">kcal</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-blue-500">{product.proteinPer100g}g</p>
                <p className="text-[10px] text-gray-400 uppercase mt-0.5">Prot</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-amber-500">{product.carbsPer100g}g</p>
                <p className="text-[10px] text-gray-400 uppercase mt-0.5">Carb</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-rose-400">{product.fatPer100g}g</p>
                <p className="text-[10px] text-gray-400 uppercase mt-0.5">Grasa</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-13 rounded-2xl text-gray-600 border-gray-200" onClick={startScanning}>
              <RefreshCw size={16} className="mr-2" />
              Nuevo escaneo
            </Button>
            <Button className="h-13 rounded-2xl bg-green-500 hover:bg-green-600 text-white" onClick={() => { onResult(product); handleClose(); }}>
              Añadir a comida
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
