import Schedule from "../../models/Schedule";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import CreateService from "../ScheduleServices/CreateService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import UpdateContactService from "../ContactServices/UpdateContactService";
import { getIO } from "../../libs/socket";
import { logger } from "../../utils/logger";
import * as Sentry from "@sentry/node";

const find_customer = async (
  { field }: { field: string },
  accountInfo: any
): Promise<string> => {
  const { ticketId, companyId } = accountInfo;

  try {
    let contact;

    try {
      contact = await ShowTicketService(ticketId, companyId);
      console.log("[FIND CUSTOMER] - Contact fetched:", contact?.dataValues);
    } catch (error) {
      console.error("[FIND CUSTOMER] - Error in ShowTicketService:", error);
      return "null";
    }

    if (!contact || !contact.contact) {
      console.log("[FIND CUSTOMER] - Contact not found");
      return "null";
    }

    const contactData = contact.contact;

    if (["name", "email", "number"].includes(field)) {
      const value = contactData[field];
      if (value) {
        console.log(`[FIND CUSTOMER] - Found field '${field}':`, value);
        return value;
      } else {
        console.log(`[FIND CUSTOMER] - Field '${field}' is empty or null`);
        return "null";
      }
    }

    const extraInfo = contactData.extraInfo || [];
    const fieldInfo = extraInfo.find((info: any) => info.name === field);

    if (fieldInfo) {
      console.log(`[FIND CUSTOMER] - Found field '${field}':`, fieldInfo.value);
      return fieldInfo.value || "null";
    }

    console.log(`[FIND CUSTOMER] - Field '${field}' not found`);
    return "false";
  } catch (error) {
    console.error("[FIND CUSTOMER] - General error:", error);
    return "null";
  }
};

const register_customer = async (
  { field, value }: { field: string; value: string },
  accountInfo: any
): Promise<string> => {
  const { contactId, companyId } = accountInfo;

  if (!contactId) {
    console.error("[REGISTER CUSTOMER] - Missing contactId");
    return "null";
  }

  try {
    let foundContact;

    try {
      foundContact = await Contact.findOne({
        where: { id: contactId },
        attributes: [
          "id",
          "name",
          "number",
          "email",
          "companyId",
          "profilePicUrl"
        ],
        include: ["extraInfo"]
      });
    } catch (error) {
      console.error("[REGISTER CUSTOMER] - Error finding contact:", error);
      return "null";
    }

    if (!foundContact) {
      console.log("[REGISTER CUSTOMER] - Contact not found");
      return "null";
    }

    if (foundContact.companyId !== companyId) {
      console.log("[REGISTER CUSTOMER] - Company mismatch");
      return "null";
    }

    if (
      !field ||
      typeof field !== "string" ||
      !value ||
      typeof value !== "string"
    ) {
      console.error("[REGISTER CUSTOMER] - Invalid field or value");
      return "null";
    }

    if (field === "number") {
      console.log("[REGISTER CUSTOMER] - Ignoring updates to 'number' field");
      return "true";
    }

    const contactData: any = {
      name: foundContact.name,
      number: foundContact.number,
      email: foundContact.email,
      profilePicUrl: foundContact.profilePicUrl
    };

    const extraInfoArray: any[] = Array.isArray(foundContact.extraInfo)
      ? foundContact.extraInfo
      : [];

    if (["name", "email"].includes(field)) {
      contactData[field] = value;
    } else {
      const existingField = extraInfoArray.find(
        (info: any) => info.name === field
      );
      if (existingField) {
        existingField.value = value;
      } else {
        extraInfoArray.push({ name: field, value });
      }
      contactData.extraInfo = extraInfoArray;
    }

    if (field === "name" && (!value || value.trim() === "")) {
      console.error("[REGISTER CUSTOMER] - Invalid name: cannot be empty");
      return "null";
    }

    if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      console.error("[REGISTER CUSTOMER] - Invalid email format");
      return "null";
    }

    console.log("[REGISTER CUSTOMER] - Final contactData:", contactData);

    try {
      let customFields: any = await ContactCustomField.findOne({
        where: { contactId: contactId }
      });

      console.log(
        "[REGISTER CUSTOMER] BEFORE UPDATE: ",
        contactId,
        customFields?.dataValues
      );
      extraInfoArray.forEach(info => {
        console.log("[REGISTER CUSTOMER] - Preparing upsert data:", {
          name: info.name,
          value: info.value,
          contactId
        });
      });

      await Promise.all(
        extraInfoArray.map(async (info: any) => {
          if (!info.name || !info.value || !contactId) {
            console.error(
              "[REGISTER CUSTOMER] - Invalid custom field data:",
              info
            );
            return;
          }
          await ContactCustomField.upsert({
            name: info.name,
            value: info.value,
            contactId
          });
        })
      );

      customFields = await ContactCustomField.findOne({
        where: { contactId: contactId }
      });

      console.log("[REGISTER CUSTOMER] UPDATED: ", contactId, customFields);
    } catch (error) {
      console.error(
        "[REGISTER CUSTOMER] - Error updating contact:",
        error?.parent?.detail || error?.message
      );
      return "null";
    }

    console.log("[REGISTER CUSTOMER] - Contact updated successfully");
    return "true";
  } catch (error) {
    console.error("[REGISTER CUSTOMER] - General error:", error);
    return "null";
  }
};

async function handleVerifySchedules(date: Date, companyId: number) {
  try {
    const { count, rows: schedules } = await Schedule.findAndCountAll({
      where: {
        sendAt: date,
        companyId: companyId
      },
      include: [
        {
          model: Contact,
          as: "contact"
        }
      ]
    });

    logger.info(
      `Found ${count} schedule(s) for company ${companyId} on ${date}`
    );

    return { count, schedules };
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("handleVerifySchedules -> error", e.message);
    throw e;
  }
}

const get_current_date = () => {
  const now = new Date();
  return now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

const check_calendar = async (
  {
    date
  }: {
    date: Date;
  },
  { companyId }: { companyId: number }
) => {
  try {
    const { count, schedules } = await handleVerifySchedules(date, companyId);

    return count == 0 ? "true" : "false";
  } catch (e: any) {
    logger.error("check_calendar -> error", e.message);
    throw e;
  }
};

const schedule = async (payload: any, accountInfo: any) => {
  try {
    const { date, message } = payload;
    const { contactId, companyId, userId } = accountInfo;
    const newSchedule = {
      body: message,
      sendAt: date,
      contactId,
      companyId,
      userId
    };

    const schedule = await CreateService(newSchedule);
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit("schedule", {
      action: "create",
      schedule
    });
    return "true";
  } catch (error) {
    logger.error("schedule -> error", error?.message);

    return "false";
  }
};

export {
  check_calendar,
  schedule,
  get_current_date,
  find_customer,
  register_customer
};
