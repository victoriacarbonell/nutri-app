import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetProfile, useUpdateProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calculator } from "lucide-react";
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
  
  const { data: profile, isLoading } = useGetProfile({ 
    query: { queryKey: getGetProfileQueryKey() } 
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
        name: profile.name,
        age: profile.age,
        gender: profile.gender as any,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activityLevel: profile.activityLevel as any,
        goal: profile.goal as any,
        manualCalorieGoal: profile.manualCalorieGoal,
      });
    }
  }, [profile, form]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
          toast({
            title: "Perfil actualizado",
            description: "Tus objetivos han sido recalculados.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "No se pudo actualizar el perfil.",
            variant: "destructive",
          });
        }
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
      <h1 className="text-3xl font-serif text-foreground font-medium mb-6">Mi Perfil</h1>

      {profile && (
        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 mb-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4">
            <Calculator size={32} />
          </div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Objetivo Diario Calculado</h2>
          <div className="text-5xl font-serif font-medium text-foreground mb-2">
            {profile.calculatedCalorieGoal} <span className="text-xl text-muted-foreground font-sans">kcal</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-[250px]">
            Basado en la fórmula de Harris-Benedict para tu perfil y nivel de actividad.
          </p>
        </div>
      )}

      <div className="bg-card rounded-3xl p-6 shadow-sm border">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edad</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Género</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="heightCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altura (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} className="bg-secondary/30 border-none rounded-xl h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="activityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel de Actividad</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/30 border-none rounded-xl h-12">
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentario (Poco o ningún ejercicio)</SelectItem>
                      <SelectItem value="light">Ligero (Ejercicio ligero 1-3 días/sem)</SelectItem>
                      <SelectItem value="moderate">Moderado (Ejercicio moderado 3-5 días/sem)</SelectItem>
                      <SelectItem value="active">Activo (Ejercicio fuerte 6-7 días/sem)</SelectItem>
                      <SelectItem value="very_active">Muy Activo (Ejercicio muy fuerte, trabajo físico)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-secondary/30 border-none rounded-xl h-12">
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="lose">Perder peso</SelectItem>
                      <SelectItem value="maintain">Mantener peso</SelectItem>
                      <SelectItem value="gain">Ganar músculo/peso</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 border-t">
              <FormField
                control={form.control}
                name="manualCalorieGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo Manual (Opcional)</FormLabel>
                    <FormDescription className="text-xs mb-2">
                      Si prefieres establecer tu propio objetivo en lugar del calculado.
                    </FormDescription>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        className="bg-secondary/30 border-none rounded-xl h-12" 
                        placeholder="Ej. 2000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full rounded-2xl h-14 text-base font-medium shadow-md shadow-primary/20"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
              Guardar Perfil
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
