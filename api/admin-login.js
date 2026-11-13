
import { db } from "./firebaseadmin.js";
import {
  randomBytes,
  createHash,
  timingSafeEqual
} from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Método no permitido"
    });
  }

  try {
    const expectedKey = process.env.ADMIN_SETUP_KEY;
    const { password } = req.body || {};

    if (!expectedKey) {
      throw new Error("Falta ADMIN_SETUP_KEY");
    }

    if (!safeCompare(expectedKey, password)) {
      return res.status(401).json({
        success: false,
        message: "Contraseña administrativa incorrecta"
      });
    }

    // Crear un token aleatorio para la sesión administrativa.
    const token = randomBytes(32).toString("hex");

    // Guardar solamente el hash del token.
    const sessionId = createHash("sha256")
      .update(token)
      .digest("hex");

    const expiresAt = Timestamp.fromMillis(
      Date.now() + 4 * 60 * 60 * 1000
    );

    await db.collection("adminSessions").doc(sessionId).set({
      expiresAt,
      createdAt: FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      success: true,
      message: "Acceso administrativo correcto",
      token
    });

  } catch (error) {
    console.error("Error en acceso administrativo:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo iniciar la sesión administrativa"
    });
  }
}
