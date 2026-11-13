import { useState } from "react";
import { useLogin, useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiErrorMessage } from "@/lib/api-errors";

type Mode = "login" | "register";

interface LoginProps {
  /** Mensaje a mostrar encima del formulario (p. ej. "no se pudo conectar"). */
  notice?: string | null;
}

export default function Login({ notice }: LoginProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const login = useLogin();
  const register = useRegister();
  const isPending = login.isPending || register.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "login") {
        await login.mutateAsync({ data: { email, password } });
      } else {
        await register.mutateAsync({ data: { email, password, inviteCode: inviteCode || null } });
      }
      // La puerta de autenticación (App.tsx) vuelve a pedir /auth/me y entra.
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (err) {
      setError(apiErrorMessage(err, mode === "login" ? "No se pudo iniciar sesión." : "No se pudo crear la cuenta."));
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-4">
            <Leaf size={30} className="text-primary" />
          </div>
          <h1 className="text-3xl font-serif text-foreground font-medium">NutriApp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Inicia sesión para ver tu diario" : "Crea tu cuenta"}
          </p>
        </div>

        {notice && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-2xl p-3 mb-4">{notice}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block" htmlFor="email">Email</label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-card rounded-xl h-12"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block" htmlFor="password">Contraseña</label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-card rounded-xl h-12"
              placeholder={mode === "register" ? "Mínimo 8 caracteres" : ""}
            />
          </div>
          {mode === "register" && (
            <div>
              <label className="text-sm font-medium mb-1.5 block" htmlFor="inviteCode">Código de invitación</label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="bg-card rounded-xl h-12"
                placeholder="Solo si te lo han dado"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full h-12 rounded-xl text-base shadow-md shadow-primary/20" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
          className="w-full text-center text-sm text-primary mt-6"
        >
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
  );
}
