
import { db } from "./firebaseadmin.js";
import {
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual
} from "node:crypto";
import { Timestamp, FieldValue } from "firebase-admin/firestore";

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;

function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function hashCode(code) {
  const secret = process.env.ACCESS_CODE_SECRET;

  if (!secret) {
    throw new Error("Falta ACCESS_CODE_SECRET");
  }

  return createHmac("sha256", secret)
    .update(code)
    .digest("hex");
}

function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");

  if (
    bufferA.length !== 32 ||
    bufferB.length !== 32
  ) {
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
    const { name, accessCode } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof accessCode !== "string" ||
      name.trim().length < 3 ||
      !/^\d{8}$/.test(accessCode)
    ) {
      return res.status(400).json({
        success: false,
        message: "Nombre o código de acceso inválido"
      });
    }

    const normalizedName = normalizeName(name);

    const participantId = createHmac(
      "sha256",
      process.env.ACCESS_CODE_SECRET
    )
      .update(normalizedName)
      .digest("hex");

    const participantRef = db
      .collection("participants")
      .doc(participantId);

    const attemptsRef = db
      .collection("loginAttempts")
      .doc(participantId);

    const participantSnapshot = await participantRef.get();

    if (!participantSnapshot.exists) {
      return res.status(401).json({
        success: false,
        message: "Nombre o código incorrecto"
      });
    }

    const participant = participantSnapshot.data();

    let loginAllowed = false;

    await db.runTransaction(async (transaction) => {
      const attemptsSnapshot = await transaction.get(attemptsRef);

      const attempts = attemptsSnapshot.exists
        ? attemptsSnapshot.data()
        : {};

      const now = Date.now();

      if (
        attempts.lockedUntil &&
        attempts.lockedUntil.toMillis() > now
      ) {
        throw new Error("ACCOUNT_LOCKED");
      }

      const submittedHash = hashCode(accessCode);

      const correctCode = safeCompare(
        submittedHash,
        participant.accessCodeHash
      );

      if (!correctCode) {
        const failedAttempts = (attempts.count || 0) + 1;

        transaction.set(attemptsRef, {
          count: failedAttempts,
          lockedUntil:
            failedAttempts >= MAX_ATTEMPTS
              ? Timestamp.fromMillis(now + LOCK_TIME)
              : null,
          updatedAt: FieldValue.serverTimestamp()
        });

        return;
      }

      transaction.delete(attemptsRef);
      loginAllowed = true;
    });

    if (!loginAllowed) {
      return res.status(401).json({
        success: false,
        message: "Nombre o código incorrecto"
      });
    }

    // Crear una sesión personal de 12 horas.
    const sessionToken = randomBytes(32).toString("hex");

    const sessionId = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const expiresAt = Timestamp.fromMillis(
      Date.now() + 12 * 60 * 60 * 1000
    );

    await db.collection("sessions").doc(sessionId).set({
      participantId,
      expiresAt,
      createdAt: FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      success: true,
      message: "Inicio de sesión correcto",
      participant: {
        name: participant.name
      },
      token: sessionToken
    });

  } catch (error) {
    if (error.message === "ACCOUNT_LOCKED") {
      return res.status(429).json({
        success: false,
        message: "Demasiados intentos. Espera 15 minutos."
      });
    }

    console.error("Error iniciando sesión:", error);

    return res.status(500).json({
      success: false,
      message: "Error al iniciar sesión"
    });
  }
}
