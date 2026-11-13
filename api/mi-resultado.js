
import { db } from "./firebaseadmin.js";
import { createHash } from "node:crypto";

export default async function handler(req, res) {
  if (req.method !== "GET") {
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

    // Buscar la sesión mediante el hash del token.
    const sessionId = createHash("sha256")
      .update(token)
      .digest("hex");

    const sessionSnapshot = await db
      .collection("sessions")
      .doc(sessionId)
      .get();

    if (!sessionSnapshot.exists) {
      return res.status(401).json({
        success: false,
        message: "Sesión no encontrada"
      });
    }

    const session = sessionSnapshot.data();

    // Comprobar que la sesión tenga los datos necesarios.
    if (
      !session.participantId ||
      !session.expiresAt ||
      typeof session.expiresAt.toMillis !== "function"
    ) {
      return res.status(401).json({
        success: false,
        message: "Sesión inválida"
      });
    }

    // Comprobar que la sesión no haya expirado.
    if (session.expiresAt.toMillis() <= Date.now()) {
      return res.status(401).json({
        success: false,
        message: "Tu sesión ha expirado"
      });
    }

    // Verificar que el sorteo esté oficialmente finalizado.
    const drawSnapshot = await db
      .collection("settings")
      .doc("draw")
      .get();

    if (
      !drawSnapshot.exists ||
      drawSnapshot.data().completed !== true
    ) {
      return res.status(403).json({
        success: false,
        message: "El sorteo todavía no está disponible"
      });
    }

    // Consultar únicamente el resultado del participante autenticado.
    const assignmentSnapshot = await db
      .collection("assignments")
      .doc(session.participantId)
      .get();

    if (!assignmentSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "No se encontró tu asignación"
      });
    }

    const assignment = assignmentSnapshot.data();

    if (
      typeof assignment.recipientName !== "string" ||
      !assignment.recipientName.trim()
    ) {
      return res.status(500).json({
        success: false,
        message: "La asignación no tiene un resultado válido"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tu amigo secreto está listo",
      result: {
        name: assignment.recipientName
      }
    });

  } catch (error) {
    console.error("Error consultando resultado:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo consultar tu resultado"
    });
  }
}
