
import { db } from "./firebaseadmin.js";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Método no permitido"
    });
  }

  try {
    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Debes iniciar sesión"
      });
    }

    const token = authorization.substring(7);

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(401).json({
        success: false,
        message: "Sesión inválida"
      });
    }

    const sessionId = createHash("sha256")
      .update(token)
      .digest("hex");

    const sessionRef = db.collection("sessions").doc(sessionId);
    const participantIdRef = db.collection("participants");

    const sessionSnapshot = await sessionRef.get();

    if (!sessionSnapshot.exists) {
      return res.status(401).json({
        success: false,
        message: "Sesión no encontrada"
      });
    }

    const session = sessionSnapshot.data();

    if (session.expiresAt.toMillis() <= Date.now()) {
      await sessionRef.delete();

      return res.status(401).json({
        success: false,
        message: "Tu sesión ha expirado"
      });
    }

    const wishes = req.body?.wishes;

    if (!Array.isArray(wishes) || wishes.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "Debes registrar exactamente 3 regalos"
      });
    }

    const cleanWishes = wishes.map((wish) =>
      typeof wish === "string" ? wish.trim() : ""
    );

    const invalidWish = cleanWishes.some(
      (wish) => wish.length < 2 || wish.length > 150
    );

    if (invalidWish) {
      return res.status(400).json({
        success: false,
        message: "Cada regalo debe tener entre 2 y 150 caracteres"
      });
    }

    const participantRef = participantIdRef.doc(
      session.participantId
    );

    // La transacción evita guardar deseos si el sorteo
    // se realiza simultáneamente.
    await db.runTransaction(async (transaction) => {
      const drawRef = db.collection("settings").doc("draw");

      const drawSnapshot = await transaction.get(drawRef);
      const participantSnapshot = await transaction.get(participantRef);

      if (drawSnapshot.exists) {
        throw new Error("DRAW_ALREADY_DONE");
      }

      if (!participantSnapshot.exists) {
        throw new Error("PARTICIPANT_NOT_FOUND");
      }

      transaction.update(participantRef, {
        wishes: cleanWishes,
        registered: true,
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    return res.status(200).json({
      success: true,
      message: "Tus tres regalos fueron guardados correctamente",
      wishesCount: 3
    });

  } catch (error) {
    if (error.message === "DRAW_ALREADY_DONE") {
      return res.status(409).json({
        success: false,
        message: "No puedes modificar tus regalos después del sorteo."
      });
    }

    if (error.message === "PARTICIPANT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Participante no encontrado"
      });
    }

    console.error("Error guardando deseos:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudieron guardar tus regalos"
    });
  }
}
