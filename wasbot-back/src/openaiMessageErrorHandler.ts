import { Op } from "sequelize";
import TicketTraking from "./models/TicketTraking";
import { format } from "date-fns";
import moment from "moment";
import Ticket from "./models/Ticket";
import Whatsapp from "./models/Whatsapp";
import { getIO } from "./libs/socket";
import { logger } from "./utils/logger";
import ShowTicketService from "./services/TicketServices/ShowTicketService";
import { verifyQueue } from "./services/WbotServices/wbotMessageListener";
import ListMessagesService from "./services/MessageServices/ListMessagesService";
import GetTicketWbot from "./helpers/GetTicketWbot";
import Contact from "./models/Contact";
import User from "./models/User";
import Message from "./models/Message";
import Queue from "./models/Queue";
import Prompt from "./models/Prompt";

let reprocessOpenaiMessageStarted = 0;

export const reprocessOpenaiMessage = async (): Promise<void> => {
  const io = getIO();

  if (reprocessOpenaiMessageStarted) {
    console.log("Processing is already running... Aborting this try");
    return;
  }

  reprocessOpenaiMessageStarted = 1;

  // Buscar os tickets que estão abertos e não estão sendo reprocessados
  const tickets = await Ticket.findAll({
    where: {
      status: "open",
      isInReprocess: { [Op.ne]: 1 } // Filtra tickets que não estão em reprocessamento
    },
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "email", "profilePicUrl"],
        include: ["extraInfo"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"],
        required: true, // Garante que o Queue associado exista
        where: {
          promptId: { [Op.ne]: null } // Garante que o Prompt associado ao Queue não seja null
        },
        include: [
          {
            model: Prompt,
            as: "prompt",
            required: true // Garante que o Prompt associado exista
          }
        ]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["name"]
      }
    ]
  });

  // Dividir os tickets em chunks de 300
  const chunkSize = 3000;
  for (let i = 0; i < tickets.length; i += chunkSize) {
    const ticketChunk = tickets.slice(i, i + chunkSize);
    const ticketChunkWithLastUpdate = ticketChunk.map(item => ({
      ...(item as any).dataValues
    }));

    const ticketIds = ticketChunk.map(ticket => ticket.id);

    await Promise.all(
      ticketChunk.map(async ticket => {
        const realTicket = ticketChunkWithLastUpdate.find(
          tick => tick.id === ticket.id
        );
        if (!realTicket?.queue?.prompt) return;

        const lastMessage = await Message.findOne({
          where: {
            ticketId: ticket.id,
            fromMe: false // Mensagem enviada pelo usuário
          },
          order: [["createdAt", "DESC"]]
        });

        if (!lastMessage) return;

        const threeMinutesAgo = moment().subtract(3, "minutes").toDate();
        if (
          new Date(lastMessage.updatedAt).getTime() <
          new Date(threeMinutesAgo).getTime()
        )
          return;

        logger.info(
          `Iniciando o processamento do ticket ID: ${ticket?.id}, status: ${ticket?.status}, atualizado em: ${ticket?.updatedAt} - , ${lastMessage}`
        );

        await Ticket.update(
          { isInReprocess: 1 },
          { where: { id: ticket?.id } }
        );

        try {
          // Chamar a função verifyQueue
          const wbot = await GetTicketWbot(ticket);
          const contact = await Contact.findOne({
            where: { id: ticket.contactId }
          });
          const messages = await Message.findAll({
            where: {
              ticketId: ticket.id
            },
            order: [["createdAt", "DESC"]]
          });
          const messagesToReprocess = [];
          for (let j = 0; j < messages.length; j++) {
            if (messages[j].fromMe) {
              break;
            }
            messagesToReprocess.push(messages[j]);
          }
          const promiseReprocess = messagesToReprocess.map(messageR => {
            const data = {
              key: {
                remoteJid: `${contact.number}@s.whatsapp.net`,
                fromMe: false,
                id: messageR.id
              },
              messageTimestamp: messageR.createdAt.getTime() / 1000,
              broadcast: false,
              message: {
                conversation: messageR.body
              }
            };

            console.log("verifyQueue - passing data");

            return verifyQueue(wbot, data, ticket, contact);
          });
          await Promise.all(promiseReprocess);
          // Emitir o evento para os clientes conectados
          io.to(ticket.status)
            .to("notification")
            .to(ticket.id.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
              action: "update",
              ticket
            });

          logger.info(`Processado ticket id ${ticket.id} na fila.`);
        } catch (err: any) {
          console.error(
            `Erro ao processar o ticket id ${ticket.id}:`,
            err.message
          );
        }
      })
    );

    await Ticket.update({ isInReprocess: 0 }, { where: { id: ticketIds } });
  }

  reprocessOpenaiMessageStarted = 0;
};
