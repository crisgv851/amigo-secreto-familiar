
import { db } from "./firebaseadmin.js";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

const MAX_PARTICIPANTS = 20;

function hashCode(code) {
  const secret = process.env.ACCESS_CODE_SECRET;

  if (!secret) {
    throw new Error("Falta ACCESS_CODE_SECRET");
  }

  return createHmac("sha256", secret)
    .update(code)
    .digest("hex");
}

function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

function authorized(req) {
  return safeCompare(
    process.env.ADMIN_SETUP_KEY,
    req.headers["x-admin-key"]
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Método no permitido"
    });
  }

  if (!authorized(req)) {
    return res.status(401).json({
      success: false,
      message: "No autorizado"
    });
  }

  try {
    const { name } = req.body || {};

    if (
      typeof name !== "string" ||
      name.trim().length < 3 ||
      name.trim().length > 80
    ) {
      return res.status(400).json({
        success: false,
        message: "El nombre debe tener entre 3 y 80 caracteres"
      });
    }

    const cleanName = name.trim().replace(/\s+/g, " ");
    const normalizedName = normalizeName(cleanName);

    const participantId = createHmac(
      "sha256",
      process.env.ACCESS_CODE_SECRET
    )
      .update(normalizedName)
      .digest("hex");

    const participantRef = db
      .collection("participants")
      .doc(participantId);

    const counterRef = db
      .collection("settings")
      .doc("participantCounter");

    const drawRef = db
      .collection("settings")
      .doc("draw");

    const accessCode = String(
      randomInt(10000000, 100000000)
    );

    await db.runTransaction(async (transaction) => {
      // Leer todos los documentos antes de escribir.
      const drawSnapshot = await transaction.get(drawRef);
      const participantSnapshot = await transaction.get(participantRef);
      const counterSnapshot = await transaction.get(counterRef);

      if (drawSnapshot.exists) {
        throw new Error("DRAW_ALREADY_DONE");
      }

      if (participantSnapshot.exists) {
        throw new Error("PARTICIPANT_EXISTS");
      }

      const total = counterSnapshot.exists
        ? counterSnapshot.data().total || 0
        : 0;

      if (total >= MAX_PARTICIPANTS) {
        throw new Error("PARTICIPANT_LIMIT");
      }

      transaction.create(participantRef, {
        name: cleanName,
        normalizedName,
        accessCodeHash: hashCode(accessCode),
        registered: false,
        wishes: [],
        createdAt: FieldValue.serverTimestamp()
      });

      transaction.set(counterRef, {
        total: total + 1,
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    return res.status(201).json({
      success: true,
      message: "Participante registrado correctamente",
      participant: {
        name: cleanName,
        accessCode
      }
    });

  } catch (error) {
    if (error.message === "DRAW_ALREADY_DONE") {
      return res.status(409).json({
        success: false,
        message: "El registro está cerrado porque el sorteo ya se realizó."
      });
    }

    if (error.message === "PARTICIPANT_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "Este participante ya está registrado."
      });
    }

    if (error.message === "PARTICIPANT_LIMIT") {
      return res.status(409).json({
        success: false,
        message: "Se alcanzó el límite de 20 participantes."
      });
    }

    console.error("Error registrando participante:", error);

    return res.status(500).json({
      success: false,
      message: "Error al registrar participante."
    });
  }
}
