import User from "../../models/User";
import AppError from "../../errors/AppError";
import Services from "../../models/Service";

const ListService = async (): Promise<Services[]> => {
  try {
    const services = await Services.findAll({
      include: [
        {
          model: User,
          attributes: ["id", "name"],
          through: { attributes: [] }, // Exclui os campos intermediários da tabela UserServices
        },
      ],
    });
    return services;
  } catch (error) {
    console.error("Erro ao buscar serviços com usuários:", error);
    throw error;
  }
};

export default ListService;
