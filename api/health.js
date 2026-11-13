
import { db } from "./firebaseadmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Método no permitido"
    });
  }

  try {
    // Comprobamos que Firebase Admin puede consultar Firestore.
    await db.listCollections();

    return res.status(200).json({
      success: true,
      message: "Conexión con Firebase correcta",
      project: "amigo-secreto-familiar-d77ea"
    });

  } catch (error) {
    console.error("Error de conexión:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo conectar con Firebase"
    });
  }
}
