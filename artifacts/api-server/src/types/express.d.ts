// Campos que los middlewares añaden a la petición.
declare global {
  namespace Express {
    interface Request {
      /** Dueño de los datos de la petición; lo pone middlewares/current-user.ts */
      userId: number;
    }
  }
}

export {};
