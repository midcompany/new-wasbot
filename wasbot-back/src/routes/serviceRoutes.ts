import { Router } from "express";

import isAuth from "../middleware/isAuth";
import * as ServiceController from "../controllers/ServiceController";

const serviceRoutes = Router();

// serviceRoutes.get("/service", ServiceController.list);

serviceRoutes.post("/service", isAuth, ServiceController.store);

serviceRoutes.put("/service/:serviceId", isAuth, ServiceController.update);

// serviceRoutes.get("/service/user/:userId", ServiceController.show);

serviceRoutes.get("/service/:companyId", ServiceController.show);

serviceRoutes.delete("/service/:serviceId", isAuth, ServiceController.remove);

export default serviceRoutes;
