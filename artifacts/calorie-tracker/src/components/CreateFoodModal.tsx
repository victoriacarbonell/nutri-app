import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateFood, getGetFoodsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const FOOD_EMOJIS = [
  "🍎","🍌","🍇","🍓","🍊","🍋","🫐","🍒","🥭","🍑",
  "🥦","🥕","🥑","🍅","🧅","🧄","🥬","🫑","🌽","🥔",
  "🥩","🍗","🥓","🌭","🍔","🥚","🍳","🥛","🧀","🫙",
  "🐟","🍣","🦐","🦞","🥫","🍱","🍜","🍝","🌮","🥙",
  "🌾","🍞","🥐","🥨","🥞","🧇","🍙","🍚","🍛","🫔",
  "🫘","🥜","🌰","🧆","🫒","🫚","🧈","🥗","🥘","🍲",
  "🧃","🥤","🧋","☕","🫖","🍵","🍺","🥂","🍷","🧉",
  "🍰","🎂","🍮","🍭","🍫","🍩","🍪","🧁","🍿","🥨",
];

function normalizeCategory(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("fruta")) return "frutas";
  if (normalized.includes("verdura")) return "verduras";
  if (normalized.includes("carne") || normalized.includes("pollo") || normalized.includes("cerdo")) return "carnes";
  if (normalized.includes("pesc")) return "pescados";
  if (normalized.includes("láct") || normalized.includes("lact")) return "lacteos";
  if (normalized.includes("cereal") || normalized.includes("pasta") || normalized.includes("arroz") || normalized.includes("pan")) return "cereales";
  if (normalized.includes("legumb") || normalized.includes("garban") || normalized.includes("lentej")) return "legumbres";
  if (normalized.includes("bebid") || normalized.includes("agua") || normalized.includes("zumo") || normalized.includes("jugo")) return "bebidas";
  if (normalized.includes("snack") || normalized.includes("dulc") || normalized.includes("boll") || normalized.includes("postre")) return "snacks";
  return normalized;
}

const CATEGORIES = [
  { value: "frutas",    label: "🍎 Frutas" },
  { value: "verduras",  label: "🥦 Verduras" },
  { value: "carnes",    label: "🥩 Carnes" },
  { value: "pescados",  label: "🐟 Pescados" },
  { value: "lacteos",   label: "🥛 Lácteos" },
  { value: "cereales",  label: "🌾 Cereales" },
  { value: "legumbres", label: "🫘 Legumbres" },
  { value: "bebidas",   label: "🧃 Bebidas" },
  { value: "snacks",    label: "🍿 Snacks" },
  { value: "otros",     label: "🍽️ Otros" },
];

const foodSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  brand: z.string().optional(),
  category: z.string().min(1, "Selecciona una categoría"),
  caloriesPer100g: z.coerce.number().min(0),
  proteinPer100g: z.coerce.number().min(0),
  carbsPer100g: z.coerce.number().min(0),
  fatPer100g: z.coerce.number().min(0),
  unit: z.string().default("g"),
  photoUrl: z.string().optional().nullable(),
});

type FoodFormValues = z.infer<typeof foodSchema>;

interface CreateFoodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateFoodModal({ open, onOpenChange }: CreateFoodModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createFood = useCreateFood();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const form = useForm<FoodFormValues>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: "", brand: "", category: "otros",
      caloriesPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0,
      unit: "g", photoUrl: null,
    },
  });

  const handleReset = () => {
    form.reset();
    setSelectedEmoji(null);
    setShowEmojiPicker(false);
  };

  const onSubmit = (data: FoodFormValues) => {
    createFood.mutate(
      { data: { ...data, category: normalizeCategory(data.category), photoUrl: selectedEmoji ?? data.photoUrl ?? null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFoodsQueryKey() });
          toast({ title: "Alimento creado", description: "El alimento ha sido añadido a la base de datos." });
          handleReset();
          onOpenChange(false);
        },
        onError: () => toast({ title: "Error", description: "No se pudo crear el alimento.", variant: "destructive" }),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md rounded-3xl p-6 max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Crear Alimento</DialogTitle>
          <DialogDescription>
            Añade un nuevo alimento. Los valores deben ser por 100g o 100ml.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">

            {/* Emoji icon picker */}
            <div>
              <label className="text-sm font-medium block mb-2">Icono del alimento</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-14 h-14 rounded-2xl bg-secondary/50 border-2 border-dashed border-border hover:border-primary/40 flex items-center justify-center text-2xl transition-colors"
                >
                  {selectedEmoji ?? "➕"}
                </button>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    {selectedEmoji ? "Toca para cambiar el icono" : "Toca para elegir un emoji"}
                  </p>
                  {selectedEmoji && (
                    <button type="button" onClick={() => setSelectedEmoji(null)} className="text-xs text-destructive mt-1">
                      Eliminar icono
                    </button>
                  )}
                </div>
              </div>

              {showEmojiPicker && (
                <div className="mt-3 bg-secondary/30 rounded-2xl p-3 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-8 gap-1">
                    {FOOD_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => { setSelectedEmoji(emoji); setShowEmojiPicker(false); }}
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all",
                          selectedEmoji === emoji ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-secondary"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-secondary/30 border-none rounded-xl h-12" placeholder="Ej. Manzana" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="brand" render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca (Opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-secondary/30 border-none rounded-xl h-12" placeholder="Ej. Hacendado" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/30 border-none rounded-xl h-12">
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="caloriesPer100g" render={({ field }) => (
                <FormItem>
                  <FormLabel>Calorías (kcal)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidad</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/30 border-none rounded-xl h-12">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="g">Gramos (g)</SelectItem>
                      <SelectItem value="ml">Mililitros (ml)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="proteinPer100g" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-chart-1">Prot (g)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="carbsPer100g" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-chart-3">Carb (g)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="fatPer100g" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-chart-2">Grasa (g)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" className="h-12 rounded-xl" onClick={() => { handleReset(); onOpenChange(false); }}>Cancelar</Button>
              <Button type="submit" className="h-12 rounded-xl px-8 shadow-md shadow-primary/20" disabled={createFood.isPending}>
                {createFood.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
