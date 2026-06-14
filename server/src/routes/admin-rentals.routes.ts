import { Router } from "express";
import { getAllNumberRentals } from "@/controllers/rentals.controller";
import { requireAuth } from "@/middleware/auth.middleware";

const router = Router();
router.use(requireAuth(["admin", "super admin"]));


router.get("/numbers", getAllNumberRentals);

export default router;