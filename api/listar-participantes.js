
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

    // Buscar la sesión administrativa mediante el hash del token.
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

    const session = sessionSnapshot.data();

    if (
      !session.expiresAt ||
      typeof session.expiresAt.toMillis !== "function" ||
      session.expiresAt.toMillis() <= Date.now()
    ) {
      return res.status(401).json({
        success: false,
        message: "Tu sesión administrativa ha expirado"
      });
    }

    // Consultar únicamente los datos necesarios para el panel.
    const snapshot = await db
      .collection("participants")
      .orderBy("createdAt", "asc")
      .get();

    const participants = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        name: data.name,
        registered: data.registered === true,
        wishesCount: Array.isArray(data.wishes)
          ? data.wishes.length
          : 0
      };
    });

    return res.status(200).json({
      success: true,
      total: participants.length,
      completed: participants.filter(
        (participant) => participant.registered
      ).length,
      participants
    });

  } catch (error) {
    console.error("Error consultando participantes:", error);

    return res.status(500).json({
      success: false,
      message: "Error al consultar participantes"
    });
  }
}
