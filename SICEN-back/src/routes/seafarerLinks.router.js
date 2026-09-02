import express from "express";
import { seafarerLinksController } from "../controllers/seafarerLinks.controller.js";
import { guarded } from "../middlewares/authChains.js";
import { uploadSeafarerLinkIdentityRequired } from "../middlewares/seafarerLinkIdentityUpload.middleware.js";

export const seafarerLinksRouter = express.Router();

seafarerLinksRouter.get(
  "/me/status",
  ...guarded,
  seafarerLinksController.meStatus
);
seafarerLinksRouter.get(
  "/me/profile",
  ...guarded,
  seafarerLinksController.meProfile
);
seafarerLinksRouter.post(
  "/me/request-link",
  ...guarded,
  uploadSeafarerLinkIdentityRequired,
  seafarerLinksController.meRequestLink
);
seafarerLinksRouter.post(
  "/me/cancel",
  ...guarded,
  seafarerLinksController.meCancel
);
seafarerLinksRouter.post(
  "/me/request-unlink",
  ...guarded,
  seafarerLinksController.meRequestUnlink
);
seafarerLinksRouter.get(
  "/requests/:id/identity-document",
  ...guarded,
  seafarerLinksController.identityDocument
);

seafarerLinksRouter.get(
  "/requests/preview",
  ...guarded,
  seafarerLinksController.previewToken
);

seafarerLinksRouter.get(
  "/seafarer/:seafarerId/pending-actions",
  ...guarded,
  seafarerLinksController.pendingActions
);
seafarerLinksRouter.get(
  "/seafarer/:seafarerId/matching-accounts",
  ...guarded,
  seafarerLinksController.matchingAccounts
);
seafarerLinksRouter.post(
  "/seafarer/:seafarerId/link-user",
  ...guarded,
  seafarerLinksController.staffLinkUser
);
seafarerLinksRouter.post(
  "/seafarer/:seafarerId/request-unlink",
  ...guarded,
  seafarerLinksController.requestUnlink
);

seafarerLinksRouter.post(
  "/requests/:id/approve-link",
  ...guarded,
  seafarerLinksController.approveLink
);
seafarerLinksRouter.post(
  "/requests/:id/reject-link",
  ...guarded,
  seafarerLinksController.rejectLink
);
seafarerLinksRouter.post(
  "/requests/:id/approve-unlink",
  ...guarded,
  seafarerLinksController.approveUnlink
);
seafarerLinksRouter.post(
  "/requests/:id/reject-unlink",
  ...guarded,
  seafarerLinksController.rejectUnlink
);
