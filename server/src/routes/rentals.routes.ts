import { Router } from "express";
import { getMyNumberRentals } from "@/controllers/rentals.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();
router.use(requireAuth());

// GET /api/rentals/numbers  — logged-in user এর rentals
router.get("/numbers", getMyNumberRentals);

export default router;