import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import CreateServiceService from "../services/ServiceServices/CreateService";
// import ListServicesService from "../services/ServiceServices/ListService";
import UpdateServiceService from "../services/ServiceServices/UpdateService";
import ShowServiceService from "../services/ServiceServices/ShowService";
import DeleteServiceService from "../services/ServiceServices/DeleteService";
import ListService from "../services/ServiceServices/ListService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, description, price, duration } = req.body;
  const userId = +req.user.id;

  const service = await CreateServiceService({
    name,
    description,
    price,
    duration,
  });

  const io = getIO();
  io.to(`user-${userId}-mainchannel`).emit(`user-${userId}-service`, {
    action: "create",
    service
  });

  return res.status(200).json(service);
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const services = await ListService();

  return res.status(200).json(services);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.params;

  const services = await ShowServiceService(companyId);

  return res.status(200).json(services);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { serviceId } = req.params;
  const serviceData = req.body;
  const userId = +req.user.id;

  const service = await UpdateServiceService({
    serviceData,
    serviceId,
    requestUserId: +userId
  });

  const io = getIO();
  io.to(`user-${userId}-mainchannel`).emit(`user-${userId}-service`, {
    action: "update",
    service
  });

  return res.status(200).json(service);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { serviceId } = req.params;
  const userId = +req.user.id;

  await DeleteServiceService(serviceId, userId);

  const io = getIO();
  io.to(`user-${userId}-mainchannel`).emit(`user-${userId}-service`, {
    action: "delete",
    serviceId
  });

  return res.status(200).json({ message: "Service deleted" });
};
