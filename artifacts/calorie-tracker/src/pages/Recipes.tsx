import { useState } from "react";
import { useGetRecipes, getGetRecipesQueryKey } from "@workspace/api-client-react";
import { Search, Plus, ChefHat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CreateRecipeModal from "@/components/CreateRecipeModal";

export default function Recipes() {
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: recipes, isLoading } = useGetRecipes(
    { q: search },
    { query: { queryKey: getGetRecipesQueryKey({ q: search }) } }
  );

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-serif text-foreground font-medium">Recetas</h1>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-full w-10 h-10 p-0 shadow-sm"
        >
          <Plus size={20} />
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input 
          className="pl-10 rounded-2xl h-12 bg-card border-none shadow-sm text-base"
          placeholder="Buscar recetas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card rounded-3xl p-5 shadow-sm border space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            </div>
          ))
        ) : recipes?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground flex flex-col items-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <ChefHat size={32} className="text-muted-foreground/50" />
            </div>
            <p>No tienes recetas guardadas.</p>
            <Button 
              variant="link" 
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 text-primary"
            >
              Crear mi primera receta
            </Button>
          </div>
        ) : (
          recipes?.map((recipe) => (
            <div 
              key={recipe.id} 
              className="bg-card rounded-3xl p-5 shadow-sm border cursor-pointer hover:border-primary/30 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-lg text-foreground leading-tight">{recipe.name}</h3>
                <span className="bg-secondary text-secondary-foreground text-xs font-semibold px-2 py-1 rounded-lg ml-2 shrink-0">
                  {recipe.caloriesPerServing} kcal
                </span>
              </div>
              {recipe.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{recipe.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground mb-4">
                <span>{recipe.servings} porciones</span>
                <span>•</span>
                <span>{recipe.totalGrams}g total</span>
              </div>

              <div className="flex gap-2 text-[10px] font-medium">
                <span className="bg-chart-1/10 text-chart-1 px-2 py-1 rounded-md">P: {recipe.proteinPerServing}g</span>
                <span className="bg-chart-3/10 text-chart-3 px-2 py-1 rounded-md">C: {recipe.carbsPerServing}g</span>
                <span className="bg-chart-2/10 text-chart-2 px-2 py-1 rounded-md">G: {recipe.fatPerServing}g</span>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateRecipeModal 
        open={isCreateModalOpen} 
        onOpenChange={setIsCreateModalOpen} 
      />
    </div>
  );
}
