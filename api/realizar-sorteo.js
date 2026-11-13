
import { db } from "./firebaseadmin.js";
import {
  randomInt,
  createHash
} from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

const MAX_PARTICIPANTS = 20;
const MAX_ATTEMPTS = 1000;

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function createAssignments(participants) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const recipients = shuffle(participants);

    const hasSelfAssignment = recipients.some(
      (recipient, index) =>
        recipient.id === participants[index].id
    );

    if (!hasSelfAssignment) {
      return participants.map((participant, index) => ({
        participantId: participant.id,
        recipientId: recipients[index].id,
        recipientName: recipients[index].name
      }));
    }
  }

  throw new Error("ASSIGNMENT_GENERATION_FAILED");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Método no permitido"
    });
  }

  try {
    // Validar token administrativo.
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Debes iniciar sesión como administrador"
      });
    }

    const token = authorization.substring(7);

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(401).json({
        success: false,
        message: "Sesión administrativa inválida"
      });
    }

    const sessionId = createHash("sha256")
      .update(token)
      .digest("hex");

    const sessionSnapshot = await db
      .collection("adminSessions")
      .doc(sessionId)
      .get();

    if (!sessionSnapshot.exists) {
      return res.status(401).json({
        success: false,
        message: "Sesión administrativa no encontrada"
      });
    }

    const adminSession = sessionSnapshot.data();

    if (
      !adminSession.expiresAt ||
      typeof adminSession.expiresAt.toMillis !== "function" ||
      adminSession.expiresAt.toMillis() <= Date.now()
    ) {
      return res.status(401).json({
        success: false,
        message: "Tu sesión administrativa ha expirado"
      });
    }

    const participantsQuery = db.collection("participants");
    const assignmentsQuery = db.collection("assignments");
    const drawRef = db.collection("settings").doc("draw");

    await db.runTransaction(async (transaction) => {
      const drawSnapshot = await transaction.get(drawRef);

      if (drawSnapshot.exists) {
        throw new Error("DRAW_ALREADY_DONE");
      }

      const participantsSnapshot = await transaction.get(
        participantsQuery
      );

      const previousAssignments = await transaction.get(
        assignmentsQuery
      );

      if (!previousAssignments.empty) {
        throw new Error("EXISTING_ASSIGNMENTS");
      }

      const participants = participantsSnapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          name: data.name,
          registered: data.registered,
          wishes: data.wishes
        };
      });

      if (
        participants.length < 2 ||
        participants.length > MAX_PARTICIPANTS
      ) {
        throw new Error("INVALID_PARTICIPANT_COUNT");
      }

      const allReady = participants.every((participant) =>
        participant.registered === true &&
        typeof participant.name === "string" &&
        participant.name.trim().length > 0 &&
        Array.isArray(participant.wishes) &&
        participant.wishes.length === 3 &&
        participant.wishes.every(
          (wish) =>
            typeof wish === "string" &&
            wish.trim().length >= 2 &&
            wish.trim().length <= 150
        )
      );

      if (!allReady) {
        throw new Error("PARTICIPANTS_NOT_READY");
      }

      const assignments = createAssignments(participants);

      const noSelfAssignments = assignments.every(
        (assignment) =>
          assignment.participantId !== assignment.recipientId
      );

      const uniqueRecipients = new Set(
        assignments.map((assignment) => assignment.recipientId)
      );

      if (
        !noSelfAssignments ||
        uniqueRecipients.size !== participants.length
      ) {
        throw new Error("INVALID_ASSIGNMENTS");
      }

      for (const assignment of assignments) {
        const assignmentRef = db
          .collection("assignments")
          .doc(assignment.participantId);

        transaction.create(assignmentRef, {
          recipientId: assignment.recipientId,
          recipientName: assignment.recipientName,
          createdAt: FieldValue.serverTimestamp()
        });
      }

      transaction.create(drawRef, {
        completed: true,
        participantCount: participants.length,
        createdAt: FieldValue.serverTimestamp()
      });
    });

    return res.status(200).json({
      success: true,
      message: "El sorteo se realizó correctamente"
    });

  } catch (error) {
    if (error.message === "DRAW_ALREADY_DONE") {
      return res.status(409).json({
        success: false,
        message: "El sorteo ya fue realizado y no se puede repetir."
      });
    }

    if (error.message === "EXISTING_ASSIGNMENTS") {
      return res.status(409).json({
        success: false,
        message: "Existen asignaciones anteriores. Se requiere revisión."
      });
    }

    if (error.message === "PARTICIPANTS_NOT_READY") {
      return res.status(409).json({
        success: false,
        message: "Todos deben completar sus tres regalos correctamente."
      });
    }

    if (error.message === "INVALID_PARTICIPANT_COUNT") {
      return res.status(409).json({
        success: false,
        message: "Se necesitan entre 2 y 20 participantes."
      });
    }

    if (
      error.message === "ASSIGNMENT_GENERATION_FAILED" ||
      error.message === "INVALID_ASSIGNMENTS"
    ) {
      return res.status(500).json({
        success: false,
        message: "No se pudo generar una asignación válida."
      });
    }

    console.error("Error realizando el sorteo:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo realizar el sorteo."
    });
  }
}
