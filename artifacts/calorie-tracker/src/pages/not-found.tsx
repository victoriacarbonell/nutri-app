import { Link } from "wouter";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70dvh] flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <SearchX size={30} className="text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-serif font-medium text-foreground">Página no encontrada</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs">Esta dirección no existe en NutriApp.</p>
      <Button asChild className="mt-6 rounded-xl">
        <Link href="/">Volver a Hoy</Link>
      </Button>
    </div>
  );
}
