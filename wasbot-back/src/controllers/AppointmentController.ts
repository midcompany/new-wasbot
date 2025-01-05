import { Request, Response } from "express";
import Appointment from "../models/Appointment";
import User from "../models/User";
import Ticket from "../models/Ticket";

class AppointmentController {
  // Listar todos os agendamentos
  async index(req: Request, res: Response): Promise<Response> {
    try {
      const appointments = await Appointment.findAll({
        include: [User, Ticket],
      });
      return res.json(appointments);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao listar agendamentos" });
    }
  }

  // Criar um novo agendamento
  async store(req: Request, res: Response): Promise<Response> {
    const { scheduledDate, description, status, userId, ticketId } = req.body;

    try {
      const appointment = await Appointment.create({
        scheduledDate: new Date(scheduledDate),
        description,
        status,
        userId,
        ticketId,
      });
      await appointment.save()
      return res.status(201).json(appointment);
    } catch (error) {
      console.log("ERROR [STORE APPOINTMENT]", error)
      return res.status(500).json({ error: "Erro ao criar agendamento" });
    }
  }

  // Atualizar um agendamento existente
  async update(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const { scheduledDate, description, status } = req.body;

    try {
      const appointment = await Appointment.findByPk(id);

      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }

      await appointment.update({
        scheduledDate,
        description,
        status,
      });

      return res.json(appointment);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao atualizar agendamento" });
    }
  }

  // Deletar um agendamento
  async delete(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const appointment = await Appointment.findByPk(id);

      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }

      await appointment.destroy();
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: "Erro ao deletar agendamento" });
    }
  }

  // Obter um agendamento específico
  async show(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const appointment = await Appointment.findByPk(id, {
        include: [User, Ticket],
      });

      if (!appointment) {
        return res.status(404).json({ error: "Agendamento não encontrado" });
      }

      return res.json(appointment);
    } catch (error) {
      return res.status(500).json({ error: "Erro ao buscar agendamento" });
    }
  }
}

export default new AppointmentController();
