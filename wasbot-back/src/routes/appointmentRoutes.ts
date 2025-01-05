import express from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";
import AppointmentController from "../controllers/AppointmentController";

const routes = express.Router();

routes.get("/appointments", AppointmentController.index);

routes.get("/appointments/:id", AppointmentController.show);

routes.post("/appointments", AppointmentController.store);

routes.put("/appointments/:id", AppointmentController.update);

routes.delete("/appointments/:id", AppointmentController.delete);

export default routes;
