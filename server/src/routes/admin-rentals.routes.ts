import { Router } from "express";
import { getAllNumberRentals } from "@/controllers/rentals.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();
router.use(requireAuth(["admin", "super admin"]));

// GET /api/admin/rentals/numbers  — সব users এর rentals (admin only)
router.get("/numbers", getAllNumberRentals);

export default router;