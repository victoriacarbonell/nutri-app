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

const foodSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  brand: z.string().optional(),
  category: z.string().min(1, "Selecciona una categoría"),
  caloriesPer100g: z.coerce.number().min(0),
  proteinPer100g: z.coerce.number().min(0),
  carbsPer100g: z.coerce.number().min(0),
  fatPer100g: z.coerce.number().min(0),
  unit: z.string().default("g"),
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

  const form = useForm<FoodFormValues>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: "",
      brand: "",
      category: "otros",
      caloriesPer100g: 0,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
      unit: "g",
    },
  });

  const onSubmit = (data: FoodFormValues) => {
    createFood.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFoodsQueryKey() });
          toast({
            title: "Alimento creado",
            description: "El alimento ha sido añadido a la base de datos.",
          });
          form.reset();
          onOpenChange(false);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "No se pudo crear el alimento.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Crear Alimento</DialogTitle>
          <DialogDescription>
            Añade un nuevo alimento. Los valores deben ser por 100g o 100ml.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-secondary/30 border-none rounded-xl h-12" placeholder="Ej. Manzana" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca (Opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-secondary/30 border-none rounded-xl h-12" placeholder="Ej. Hacendado" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-secondary/30 border-none rounded-xl h-12">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="frutas">Frutas</SelectItem>
                        <SelectItem value="verduras">Verduras</SelectItem>
                        <SelectItem value="carnes">Carnes</SelectItem>
                        <SelectItem value="pescados">Pescados</SelectItem>
                        <SelectItem value="lacteos">Lácteos</SelectItem>
                        <SelectItem value="cereales">Cereales</SelectItem>
                        <SelectItem value="otros">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="caloriesPer100g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calorías (kcal)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-secondary/30 border-none rounded-xl h-12">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="g">Gramos (g)</SelectItem>
                        <SelectItem value="ml">Mililitros (ml)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="proteinPer100g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prot (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="carbsPer100g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carb (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fatPer100g"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grasa (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" className="h-12 rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
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
