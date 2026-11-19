// Fields that middlewares add to the request.
declare global {
  namespace Express {
    interface Request {
      /** Owner of the request's data; set by middlewares/current-user.ts */
      userId: number;
    }
  }
}

export {};
