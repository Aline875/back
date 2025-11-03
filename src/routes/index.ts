import { Router, Request, Response } from "express";

export const router = Router();

router.get("/teste", (req: Request, res: Response) => {
  res.json({ message: "Rota de teste funcionando!" });
});
