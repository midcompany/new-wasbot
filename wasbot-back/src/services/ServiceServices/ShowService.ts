import Service from "../../models/Service";
import AppError from "../../errors/AppError";
import User from "../../models/User";

const ShowServiceService = async (companyId: string | number): Promise<Service[]> => {
  const services = await Service.findAll({
    include: [
      {
        model: User,
        attributes: ["id", "name", "profession", "appointmentSpacing", "appointmentSpacingUnit", "schedules"],
        where: { companyId }
      }
    ]
  });

  if (!services || services.length === 0) {
    throw new AppError("ERR_NO_SERVICE_FOUND", 404);
  }

  return services;
};

export default ShowServiceService;
