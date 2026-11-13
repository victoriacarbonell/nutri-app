import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetProfile, useUpdateProfile, getGetProfileQueryKey, getGetTodaySummaryQueryKey,
  useGetMe, getGetMeQueryKey, useLogout,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calculator, CheckCircle2, LogOut } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const profileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  age: z.coerce.number().min(10).max(120),
  gender: z.enum(["male", "female", "other"]),
  heightCm: z.coerce.number().min(100).max(250),
  weightKg: z.coerce.number().min(30).max(300),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["lose", "maintain", "gain"]),
  manualCalorieGoal: z.coerce.number().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading, isError } = useGetProfile({
    query: {
      queryKey: getGetProfileQueryKey(),
      retry: false,
    },
  });

  const updateProfile = useUpdateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      age: 30,
      gender: "other",
      heightCm: 170,
      weightKg: 70,
      activityLevel: "moderate",
      goal: "maintain",
      manualCalorieGoal: null,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name ?? "",
        age: profile.age ?? 30,
        gender: (profile.gender as any) ?? "other",
        heightCm: profile.heightCm ?? 170,
        weightKg: profile.weightKg ?? 70,
        activityLevel: (profile.activityLevel as any) ?? "moderate",
        goal: (profile.goal as any) ?? "maintain",
        manualCalorieGoal: profile.manualCalorieGoal ?? null,
      });
    }
  }, [profile, form]);

  const onSubmit = (data: ProfileFormValues) => {
    setSaved(false);
    updateProfile.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTodaySummaryQueryKey() });
          setSaved(true);
          toast({ title: "Perfil guardado", description: "Tus objetivos han sido actualizados." });
          setTimeout(() => setSaved(false), 3000);
        },
        onError: () =>
          toast({ title: "Error", description: "No se pudo actualizar el perfil.", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 pt-12">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pt-8 px-4 pb-24">
      <h1 className="text-3xl font-serif text-foreground font-medium mb-2">Mi Perfil</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {profile ? "Actualiza tus datos para recalcular tu objetivo calórico." : "Completa tu perfil para calcular tu objetivo calórico personalizado."}
      </p>

      {/* Harris-Benedict result */}
      {profile && (
        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-5 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Objetivo Diario (Harris-Benedict)</p>
            <div className="text-4xl font-serif font-medium text-foreground">
              {(profile as any).calculatedCalorieGoal}{" "}
              <span className="text-lg text-muted-foreground font-sans">kcal</span>
            </div>
            {form.watch("goal") === "lose" && <p className="text-xs text-muted-foreground mt-1">Déficit de 500 kcal aplicado</p>}
            {form.watch("goal") === "gain" && <p className="text-xs text-muted-foreground mt-1">Superávit de 300 kcal aplicado</p>}
          </div>
          <div className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shrink-0">
            <Calculator size={26} />
          </div>
        </div>
      )}

      <div className="bg-card rounded-3xl p-6 shadow-sm border">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Tu nombre" className="bg-secondary/30 border-none rounded-xl h-12" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Age + Gender */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>Edad</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Género</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/30 border-none rounded-xl h-12">
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Height + Weight */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="heightCm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Altura (cm)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="weightKg" render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Activity */}
            <FormField control={form.control} name="activityLevel" render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel de Actividad</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary/30 border-none rounded-xl h-12">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentario (sin ejercicio)</SelectItem>
                    <SelectItem value="light">Ligero (1–3 días/semana)</SelectItem>
                    <SelectItem value="moderate">Moderado (3–5 días/semana)</SelectItem>
                    <SelectItem value="active">Activo (6–7 días/semana)</SelectItem>
                    <SelectItem value="very_active">Muy activo (trabajo físico)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Goal */}
            <FormField control={form.control} name="goal" render={({ field }) => (
              <FormItem>
                <FormLabel>Objetivo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-secondary/30 border-none rounded-xl h-12">
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="lose">Perder peso (−500 kcal/día)</SelectItem>
                    <SelectItem value="maintain">Mantener peso</SelectItem>
                    <SelectItem value="gain">Ganar músculo (+300 kcal/día)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Manual goal */}
            <div className="pt-2 border-t border-border/50">
              <FormField control={form.control} name="manualCalorieGoal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta calórica manual <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                  <FormDescription className="text-xs">Sobreescribe el cálculo automático si lo prefieres.</FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      className="bg-secondary/30 border-none rounded-xl h-12"
                      placeholder="Ej. 1800"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Button
              type="submit"
              className="w-full rounded-2xl h-14 text-base font-medium shadow-md shadow-primary/20"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
              ) : saved ? (
                <CheckCircle2 className="mr-2 h-5 w-5" />
              ) : null}
              {saved ? "Guardado" : "Guardar Perfil"}
            </Button>
          </form>
        </Form>
      </div>

      <AccountSection />
    </div>
  );
}

function AccountSection() {
  const queryClient = useQueryClient();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      // Vacía la caché: la puerta de autenticación volverá a pedir /auth/me
      // y mostrará el login.
      onSettled: () => queryClient.clear(),
    });
  };

  return (
    <div className="bg-card rounded-3xl p-5 shadow-sm border mt-6 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Cuenta</p>
        <p className="text-sm font-medium truncate">{me?.email ?? ""}</p>
      </div>
      <Button variant="outline" className="rounded-xl shrink-0" onClick={handleLogout} disabled={logout.isPending}>
        {logout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
        Cerrar sesión
      </Button>
    </div>
  );
}
