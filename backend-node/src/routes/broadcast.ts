import { Router } from "express";
import { requireAdmin } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { sendBroadcast } from "../controllers/broadcastController.js";
import { z } from "zod";

const broadcastSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  target: z.string().optional().default("all"),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional().default("normal"),
});

const router = Router();

/**
 * POST /api/admin/broadcast
 * Send a push + in-app notification to all or targeted tourists.
 * target: "all" | "tourist:<id>" | "zone:<id>"
 */
router.post("/", requireAdmin, validate(broadcastSchema), sendBroadcast);

export default router;
