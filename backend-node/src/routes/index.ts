import { Router } from "express";
import adminRoutes from "./admin.js";
import adminPoliceRoutes from "./adminPolice.js";
import adminHospitalRoutes from "./adminHospitals.js";
import authRoutes from "./auth.js";
import dashboardRoutes from "./dashboard.js";
import riskZoneRoutes from "./riskZones.js";
import publicRiskZoneRoutes from "./publicRiskZones.js";
import sosRoutes from "./sos.js";
import publicStationsRoutes from "./publicStations.js";
import publicHospitalsRoutes from "./publicHospitals.js";
import healthRoutes from "./health.js";
import notificationRoutes from "./notifications.js";
import advisoryRoutes from "./advisories.js";
import auditLogRoutes from "./auditLog.js";
import safetyRoutes from "./safety.js";
import broadcastRoutes from "./broadcast.js";

const router = Router();

router.use("/api/admin", adminRoutes);
router.use("/api/admin/police", adminPoliceRoutes);
router.use("/api/admin/hospitals", adminHospitalRoutes);
router.use("/api/admin/advisories", advisoryRoutes);
router.use("/api/admin/audit-logs", auditLogRoutes);
router.use("/api/admin/broadcast", broadcastRoutes);
router.use("/api/auth", authRoutes);
router.use("/api", dashboardRoutes);
router.use("/api/admin/risk-zones", riskZoneRoutes);
router.use("/api/risk-zones", publicRiskZoneRoutes);
router.use("/api/action", sosRoutes);
router.use("/api/police-stations", publicStationsRoutes);
router.use("/api/hospitals", publicHospitalsRoutes);
router.use("/api/advisories", advisoryRoutes);
router.use("/api/health", healthRoutes);
router.use("/api", notificationRoutes);
router.use("/api/v1/safety", safetyRoutes);

export default router;
