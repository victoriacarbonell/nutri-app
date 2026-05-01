import { useState, useRef } from "react";
import { Camera, Image as ImageIcon, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyzeImage } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import type { FoodAnalysisResult } from "@workspace/api-client-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Scan() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FoodAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const analyzeImage = useAnalyzeImage();

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      
      // Perform analysis
      analyzeImage.mutate({
        data: { imageBase64: base64String.split(',')[1] } // Strip the data URL prefix for the API
      }, {
        onSuccess: (result) => {
          setAnalysisResult(result as any);
        },
        onError: () => {
          toast({
            title: "Error al analizar",
            description: "No pudimos analizar la imagen. Intenta de nuevo.",
            variant: "destructive"
          });
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setImagePreview(null);
    setAnalysisResult(null);
  };

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-24 flex flex-col">
      <h1 className="text-3xl font-serif text-foreground font-medium mb-6">Escanear</h1>

      {!imagePreview ? (
        <div className="flex-1 flex flex-col items-center justify-center mt-10 space-y-6">
          <div className="w-64 h-64 rounded-full bg-secondary/30 border-2 border-dashed border-primary/30 flex items-center justify-center mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-full"></div>
            <Camera size={64} className="text-primary/40" />
          </div>

          <p className="text-center text-muted-foreground max-w-[260px] mb-8">
            Toma una foto de tu comida y la IA estimará las calorías y macronutrientes automáticamente.
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

          {/* Hidden inputs */}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={cameraInputRef}
            onChange={handleImageCapture}
          />
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleImageCapture}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-sm mb-6 border">
            <img src={imagePreview} alt="Captured food" className="w-full h-full object-cover" />
            
            {analyzeImage.isPending && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-primary mb-4" size={40} />
                <p className="font-serif text-lg font-medium">Analizando...</p>
              </div>
            )}
          </div>

          {analysisResult && (
            <div className="bg-card rounded-3xl p-6 shadow-sm border flex-1 mb-6">
              <h2 className="font-serif text-xl mb-1">{analysisResult.description || "Comida detectada"}</h2>
              
              <div className="flex justify-between items-center py-4 border-b border-border/50 mb-4">
                <div className="text-center">
                  <span className="block text-3xl font-bold">{analysisResult.totalCalories}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Kcal Totales</span>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <span className="block font-semibold text-chart-1">{analysisResult.totalProtein}g</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Prot</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-chart-3">{analysisResult.totalCarbs}g</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Carb</span>
                  </div>
                  <div>
                    <span className="block font-semibold text-chart-2">{analysisResult.totalFat}g</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Grasa</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-medium text-muted-foreground">Elementos detectados:</h3>
                {analysisResult.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span>{item.name} <span className="text-muted-foreground">({item.estimatedGrams}g)</span></span>
                    <span className="font-medium">{item.totalCalories} kcal</span>
                  </div>
                ))}
              </div>

              {analysisResult.notes && (
                <Alert className="bg-secondary/30 border-none mb-6">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-xs text-muted-foreground">
                    {analysisResult.notes}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <Button variant="outline" className="rounded-xl h-12" onClick={reset}>
                  Descartar
                </Button>
                <Button className="rounded-xl h-12">
                  Añadir a comida
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
