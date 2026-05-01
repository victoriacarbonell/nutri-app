import { Link, useLocation } from "wouter";
import { Home, Apple, BookOpen, Calendar, User, MoreHorizontal, Camera, BarChart2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Hoy" },
    { href: "/alimentos", icon: Apple, label: "Alimentos" },
    { href: "/escanear", icon: Camera, label: "Escanear", prominent: true },
    { href: "/calendario", icon: Calendar, label: "Calendario" },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <main className="flex-1 pb-[84px] max-w-md mx-auto w-full relative">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-50 pb-safe">
        <div className="max-w-md mx-auto flex items-center justify-around h-[68px] px-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            
            if (item.prominent) {
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center relative -top-5">
                  <div className="bg-primary text-primary-foreground rounded-full p-4 shadow-lg shadow-primary/30 flex items-center justify-center">
                    <item.icon size={28} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-medium mt-1 text-muted-foreground">{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-[64px] h-[64px] rounded-2xl transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                <item.icon size={24} className={cn("mb-1", isActive && "fill-primary/20")} />
                <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>{item.label}</span>
              </Link>
            );
          })}

          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center w-[64px] h-[64px] rounded-2xl text-muted-foreground hover:bg-muted/50 transition-colors">
                <MoreHorizontal size={24} className="mb-1" />
                <span className="text-[10px] font-medium">Más</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl max-w-md mx-auto">
              <SheetHeader className="mb-6 text-left">
                <SheetTitle>Más opciones</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-4 pb-8">
                <Link href="/recetas" className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors">
                  <BookOpen size={28} />
                  <span className="text-xs font-medium">Recetas</span>
                </Link>
                <Link href="/progreso" className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors">
                  <TrendingUp size={28} />
                  <span className="text-xs font-medium">Progreso</span>
                </Link>
                <Link href="/estadisticas" className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors">
                  <BarChart2 size={28} />
                  <span className="text-xs font-medium">Estadísticas</span>
                </Link>
                <Link href="/perfil" className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-secondary/50 text-secondary-foreground hover:bg-secondary transition-colors col-span-3 mt-2">
                  <User size={24} />
                  <span className="text-sm font-medium">Mi Perfil & Objetivos</span>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
