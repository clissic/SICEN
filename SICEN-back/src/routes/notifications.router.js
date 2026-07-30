import express from "express";
import { notificationsController } from "../controllers/notifications.controller.js";
import { guarded } from "../middlewares/authChains.js";

export const notificationsRouter = express.Router();

notificationsRouter.get("/", ...guarded, notificationsController.list);
notificationsRouter.get(
  "/unread-count",
  ...guarded,
  notificationsController.unreadCount
);
notificationsRouter.post(
  "/read-all",
  ...guarded,
  notificationsController.markAllRead
);
notificationsRouter.patch(
  "/:id/read",
  ...guarded,
  notificationsController.markRead
);
