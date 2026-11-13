import { useState, useRef } from "react";
import {
  Camera, Image as ImageIcon, Loader2, Info,
  ScanBarcode, Sparkles, X, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAnalyzeImage, useCreateFood, useCreateLogEntry, getFoods,
  getGetDayLogQueryKey, getGetTodaySummaryQueryKey, getGetFoodsQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import type { FoodAnalysisResult } from "@workspace/api-client-react";
import { inferCategory, scaleMacros, sumMacros } from "@workspace/shared";
import { apiErrorMessage } from "@/lib/api-errors";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import BarcodeScanner from "@/components/BarcodeScanner";
import type { OffProductInfo } from "@/components/BarcodeScanner";

type Mode = "ai" | "barcode";

const MEAL_TYPES = [
  { value: "desayuno", label: "Desayuno" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "comida", label: "Comida" },
  { value: "merienda", label: "Merienda" },
  { value: "cena", label: "Cena" },
  { value: "snacks", label: "Snacks" },
] as const;

type MealType = (typeof MEAL_TYPES)[number]["value"];

// Cada alimento detectado por la IA, con los gramos editables por el usuario.
interface AnalyzedItemState {
  name: string;
  grams: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

interface AddBarcodeItemState {
  product: OffProductInfo;
  amount: string;
  mealType: MealType;
}

// Mismo cálculo que hace el API al guardar.
function itemTotals(items: AnalyzedItemState[]) {
  return sumMacros(items.map((item) => scaleMacros(item, parseFloat(item.grams) || 0)));
}

function MealTypeSelect({ value, onChange, className }: { value: MealType; onChange: (v: MealType) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as MealType)}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MEAL_TYPES.map((m) => (
          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function Scan() {
  const [mode, setMode] = useState<Mode>("ai");
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const [analysisItems, setAnalysisItems] = useState<AnalyzedItemState[]>([]);
  const [analysisMealType, setAnalysisMealType] = useState<MealType>("almuerzo");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [barcodeItem, setBarcodeItem] = useState<AddBarcodeItemState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const analyzeImage = useAnalyzeImage();
  const createFood = useCreateFood();
  const createLogEntry = useCreateLogEntry();

  const invalidateDay = (date: string) => {
    queryClient.invalidateQueries({ queryKey: getGetDayLogQueryKey(date) });
    queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFoodsQueryKey() });
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      setAnalysisResult(null);
      setAnalysisItems([]);
      analyzeImage.mutate(
        { data: { imageBase64: base64String.split(",")[1] } },
        {
          onSuccess: (result) => {
            setAnalysisResult(result);
            setAnalysisItems(
              result.items.map((item) => ({
                name: item.name,
                grams: String(Math.round(item.estimatedGrams)),
                caloriesPer100g: item.caloriesPer100g,
                proteinPer100g: item.proteinPer100g,
                carbsPer100g: item.carbsPer100g,
                fatPer100g: item.fatPer100g,
              })),
            );
          },
          onError: (err) =>
            toast({ title: "Error al analizar", description: apiErrorMessage(err, "No pudimos analizar la imagen. Intenta de nuevo."), variant: "destructive" }),
        }
      );
    };
    reader.readAsDataURL(file);
    // Permite volver a seleccionar la misma foto.
    e.target.value = "";
  };

  const resetAI = () => {
    setImagePreview(null);
    setAnalysisResult(null);
    setAnalysisItems([]);
    setAnalysisMealType("almuerzo");
    setIsSaving(false);
  };

  const updateItemGrams = (index: number, grams: string) => {
    setAnalysisItems((items) => items.map((item, i) => (i === index ? { ...item, grams } : item)));
  };

  const removeItem = (index: number) => {
    setAnalysisItems((items) => items.filter((_, i) => i !== index));
  };

  // Guarda cada alimento detectado como un alimento propio y lo añade al
  // diario con sus gramos. La foto no se guarda: en base64 pesa cientos de KB
  // por alimento y acabaría en la base de datos.
  const handleAddAnalysisFoods = async () => {
    if (isSaving) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const items = analysisItems.filter((item) => (parseFloat(item.grams) || 0) > 0);
    if (items.length === 0) {
      toast({ title: "Nada que añadir", description: "Indica los gramos de al menos un alimento.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    let saved = 0;
    try {
      for (const item of items) {
        const food = await createFood.mutateAsync({
          data: {
            name: item.name,
            category: inferCategory({ name: item.name }),
            caloriesPer100g: item.caloriesPer100g,
            proteinPer100g: item.proteinPer100g,
            carbsPer100g: item.carbsPer100g,
            fatPer100g: item.fatPer100g,
            unit: "g",
            photoUrl: null,
          },
        });
        await createLogEntry.mutateAsync({
          date: today,
          data: { mealType: analysisMealType, foodId: food.id, amountGrams: parseFloat(item.grams) },
        });
        saved++;
      }
      invalidateDay(today);
      toast({
        title: "¡Añadido!",
        description: `${saved} ${saved === 1 ? "alimento añadido" : "alimentos añadidos"} a ${analysisMealType}.`,
      });
      resetAI();
    } catch {
      invalidateDay(today);
      setIsSaving(false);
      toast({
        title: "Error",
        description: saved > 0
          ? `Se añadieron ${saved} de ${items.length} alimentos. Revisa el diario.`
          : "No se pudo guardar el alimento.",
        variant: "destructive",
      });
    }
  };

  const handleBarcodeResult = (product: OffProductInfo) => {
    setBarcodeItem({ product, amount: "100", mealType: "almuerzo" });
  };

  // Si el producto ya existe (mismo código de barras) se reutiliza en vez de
  // crear un duplicado en cada escaneo.
  const handleAddBarcodeFood = async () => {
    if (!barcodeItem || isSaving) return;
    const today = format(new Date(), "yyyy-MM-dd");
    const { product, amount, mealType } = barcodeItem;
    setIsSaving(true);

    try {
      const existing = await getFoods({ barcode: product.barcode, limit: 1 });
      let foodId = existing.foods[0]?.id;
      if (!foodId) {
        const food = await createFood.mutateAsync({
          data: {
            name: product.name,
            brand: product.brand || undefined,
            barcode: product.barcode,
            category: inferCategory({ name: product.name, brand: product.brand, category: product.category }),
            caloriesPer100g: product.caloriesPer100g,
            proteinPer100g: product.proteinPer100g,
            carbsPer100g: product.carbsPer100g,
            fatPer100g: product.fatPer100g,
            fiberPer100g: product.fiberPer100g ?? undefined,
            photoUrl: product.imageUrl,
          },
        });
        foodId = food.id;
      }
      await createLogEntry.mutateAsync({
        date: today,
        data: { mealType, foodId, amountGrams: parseFloat(amount) || 100 },
      });
      invalidateDay(today);
      toast({ title: "¡Añadido!", description: `${product.name} añadido a ${mealType}.` });
      setBarcodeItem(null);
    } catch {
      toast({ title: "Error", description: "No se pudo registrar en el diario.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const totals = itemTotals(analysisItems);

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-24 flex flex-col">
      <h1 className="text-3xl font-serif text-foreground font-medium mb-5">Escanear</h1>

      <div className="flex bg-secondary/40 rounded-2xl p-1 mb-6 gap-1">
        <button
          onClick={() => setMode("ai")}
          className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium transition-all ${
            mode === "ai" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <Sparkles size={16} />
          IA de alimentos
        </button>
        <button
          onClick={() => setMode("barcode")}
          className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium transition-all ${
            mode === "barcode" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
          }`}
        >
          <ScanBarcode size={16} />
          Código de barras
        </button>
      </div>

      {mode === "ai" && (
        <>
          {!imagePreview ? (
            <div className="flex-1 flex flex-col items-center justify-center mt-4 space-y-6">
              <div className="w-56 h-56 rounded-full bg-secondary/30 border-2 border-dashed border-primary/30 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-full" />
                <Sparkles size={52} className="text-primary/40" />
              </div>
              <p className="text-center text-muted-foreground max-w-[260px]">
                Toma una foto de tu comida y la IA estimará las calorías y macros automáticamente.
              </p>
              <div className="grid grid-cols-2 gap-4 w-full">
                <Button
                  className="h-16 rounded-2xl flex flex-col items-center justify-center gap-1 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera size={24} />
                  <span className="text-xs font-medium">Cámara</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 rounded-2xl flex flex-col items-center justify-center gap-1 border-primary/20 bg-card"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon size={24} className="text-primary" />
                  <span className="text-xs font-medium text-primary">Galería</span>
                </Button>
              </div>
              <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageCapture} />
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageCapture} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-sm mb-6 border">
                <img src={imagePreview} alt="Comida capturada" className="w-full h-full object-cover" />
                {analyzeImage.isPending && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Loader2 className="animate-spin text-primary mb-4" size={40} />
                    <p className="font-serif text-lg font-medium">Analizando con IA…</p>
                  </div>
                )}
                <button
                  onClick={resetAI}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>

              {analysisResult && (
                <div className="bg-card rounded-3xl p-6 shadow-sm border flex-1 mb-6">
                  <h2 className="font-serif text-xl mb-1">{analysisResult.description || "Comida detectada"}</h2>
                  <div className="flex justify-between items-center py-4 border-b border-border/50 mb-4">
                    <div className="text-center">
                      <span className="block text-3xl font-bold">{Math.round(totals.calories)}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Kcal Totales</span>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div>
                        <span className="block font-semibold text-chart-1">{Math.round(totals.protein)}g</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Prot</span>
                      </div>
                      <div>
                        <span className="block font-semibold text-chart-3">{Math.round(totals.carbs)}g</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Carb</span>
                      </div>
                      <div>
                        <span className="block font-semibold text-chart-2">{Math.round(totals.fat)}g</span>
                        <span className="text-[10px] text-muted-foreground uppercase">Grasa</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-5">
                    <h3 className="text-sm font-medium text-muted-foreground">Alimentos detectados (ajusta los gramos):</h3>
                    {analysisItems.length === 0 && (
                      <p className="text-sm text-muted-foreground">No queda ningún alimento. Descarta y prueba con otra foto.</p>
                    )}
                    {analysisItems.map((item, i) => {
                      const grams = parseFloat(item.grams) || 0;
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 min-w-0 truncate">{item.name}</span>
                          <Input
                            value={item.grams}
                            onChange={(e) => updateItemGrams(i, e.target.value)}
                            className="bg-secondary/30 border-none rounded-xl h-10 w-20 text-center"
                            type="number"
                            inputMode="decimal"
                            aria-label={`Gramos de ${item.name}`}
                          />
                          <span className="w-16 text-right font-medium">{Math.round(scaleMacros(item, grams).calories)} kcal</span>
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Quitar ${item.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium mb-1.5 block">Comida</label>
                    <MealTypeSelect
                      value={analysisMealType}
                      onChange={setAnalysisMealType}
                      className="bg-secondary/30 border-none rounded-xl h-12 text-base"
                    />
                  </div>

                  {analysisResult.notes && (
                    <Alert className="bg-secondary/30 border-none mb-6">
                      <Info className="h-4 w-4 text-primary" />
                      <AlertDescription className="text-xs text-muted-foreground">{analysisResult.notes}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <Button variant="outline" className="rounded-xl h-12" onClick={resetAI} disabled={isSaving}>
                      Descartar
                    </Button>
                    <Button
                      className="rounded-xl h-12"
                      onClick={handleAddAnalysisFoods}
                      disabled={isSaving || analyzeImage.isPending || analysisItems.length === 0}
                    >
                      {isSaving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      {isSaving ? "Guardando..." : `Añadir ${analysisItems.length > 1 ? `${analysisItems.length} alimentos` : "a comida"}`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {mode === "barcode" && (
        <div className="flex-1 flex flex-col items-center justify-center mt-4 space-y-6">
          <div className="w-56 h-56 rounded-3xl bg-secondary/30 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            <ScanBarcode size={52} className="text-primary/40 relative z-10" />
          </div>

          <p className="text-center text-muted-foreground max-w-[260px]">
            Escanea el código de barras de cualquier producto envasado para obtener sus datos nutricionales automáticamente.
          </p>

          <div className="w-full space-y-3">
            <Button
              className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              onClick={() => setShowBarcodeScanner(true)}
            >
              <ScanBarcode size={22} />
              <span className="font-medium">Abrir escáner</span>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Powered by Open Food Facts · más de 3 millones de productos
            </p>
          </div>
        </div>
      )}

      {showBarcodeScanner && (
        <BarcodeScanner
          onResult={handleBarcodeResult}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      <Dialog open={!!barcodeItem} onOpenChange={(o) => !o && setBarcodeItem(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          {barcodeItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-serif leading-tight">{barcodeItem.product.name}</DialogTitle>
                {barcodeItem.product.brand && (
                  <p className="text-sm text-muted-foreground">{barcodeItem.product.brand}</p>
                )}
              </DialogHeader>

              <div className="bg-secondary/30 p-4 rounded-2xl my-4 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold">
                    {Math.round(barcodeItem.product.caloriesPer100g * (parseFloat(barcodeItem.amount) || 100) / 100)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">kcal</p>
                </div>
                {(["proteinPer100g", "carbsPer100g", "fatPer100g"] as const).map((key, i) => (
                  <div key={key}>
                    <p className={`font-semibold ${["text-chart-1", "text-chart-3", "text-chart-2"][i]}`}>
                      {((barcodeItem.product[key] * (parseFloat(barcodeItem.amount) || 100)) / 100).toFixed(1)}g
                    </p>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      {["Prot", "Carb", "Grasa"][i]}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Cantidad (g)</label>
                  <Input
                    type="number"
                    value={barcodeItem.amount}
                    onChange={(e) => setBarcodeItem({ ...barcodeItem, amount: e.target.value })}
                    className="bg-secondary/30 border-none rounded-xl h-14 text-lg text-center"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Comida</label>
                  <MealTypeSelect
                    value={barcodeItem.mealType}
                    onChange={(v) => setBarcodeItem({ ...barcodeItem, mealType: v })}
                    className="bg-secondary/30 border-none rounded-xl h-14 text-base"
                  />
                </div>
              </div>

              <Button
                className="w-full h-14 rounded-2xl text-base shadow-md shadow-primary/20"
                onClick={handleAddBarcodeFood}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Guardar y añadir a hoy
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
