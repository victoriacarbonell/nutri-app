import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateRecipe, getGetRecipesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const recipeSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  servings: z.coerce.number().min(1, "Debe tener al menos 1 porción"),
});

type RecipeFormValues = z.infer<typeof recipeSchema>;

interface CreateRecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateRecipeModal({ open, onOpenChange }: CreateRecipeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createRecipe = useCreateRecipe();

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: "",
      description: "",
      servings: 1,
    },
  });

  const onSubmit = (data: RecipeFormValues) => {
    // We send an empty ingredients array since we don't have the ingredient picker fully implemented yet
    createRecipe.mutate(
      { data: { ...data, ingredients: [] } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRecipesQueryKey() });
          toast({
            title: "Receta creada",
            description: "La receta ha sido creada exitosamente.",
          });
          form.reset();
          onOpenChange(false);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "No se pudo crear la receta.",
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
          <DialogTitle className="text-2xl font-serif">Crear Receta</DialogTitle>
          <DialogDescription>
            Crea una nueva receta.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la receta</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-secondary/30 border-none rounded-xl h-12" placeholder="Ej. Ensalada César" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-secondary/30 border-none rounded-xl h-12" placeholder="Ej. Deliciosa ensalada..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="servings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Porciones</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" className="h-12 rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" className="h-12 rounded-xl px-8 shadow-md shadow-primary/20" disabled={createRecipe.isPending}>
                {createRecipe.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
