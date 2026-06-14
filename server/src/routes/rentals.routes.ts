import { Router } from "express";
import { getMyNumberRentals } from "@/controllers/rentals.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();
router.use(requireAuth());


router.get("/numbers", getMyNumberRentals);

export default router;