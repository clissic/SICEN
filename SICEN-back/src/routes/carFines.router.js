import express from "express";
import { carFinesController } from "../controllers/carFines.controller.js";
import { checkLogin, checkAdmin, checkAdminOrContable } from "../middlewares/auth.js";

export const carFinesRouter = express.Router();

carFinesRouter.get("/getAll", checkLogin, checkAdmin, carFinesController.getAll);
carFinesRouter.get("/paginated", checkLogin, carFinesController.paginateList);
carFinesRouter.get("/mine", checkLogin, carFinesController.mine);

carFinesRouter.post("/create", checkLogin, carFinesController.create);
carFinesRouter.post("/createAndRender", checkLogin, carFinesController.createAndRender);

carFinesRouter.get(
  "/findBy/number/update",
  checkLogin,
  checkAdminOrContable,
  carFinesController.findByNumberAndRenderForUpdate
);
carFinesRouter.get(
  "/update/:fine_number",
  checkLogin,
  checkAdminOrContable,
  carFinesController.findByNumberAndUpdate
);
carFinesRouter.put(
  "/update/:fine_number",
  checkLogin,
  checkAdminOrContable,
  carFinesController.findByNumberAndUpdate
);

carFinesRouter.get(
  "/findBy/number/delete",
  checkLogin,
  checkAdmin,
  carFinesController.findByNumberAndRenderForDelete
);
carFinesRouter.get(
  "/delete/:fine_number",
  checkLogin,
  checkAdmin,
  carFinesController.findByNumberAndDelete
);

carFinesRouter.delete(
  "/:id",
  checkLogin,
  checkAdmin,
  carFinesController.deleteOne
);
carFinesRouter.get("/:id", checkLogin, carFinesController.findById);
