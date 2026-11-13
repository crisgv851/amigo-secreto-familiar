
import {
  initializeApp,
  applicationDefault,
  cert,
  getApps
} from "firebase-admin/app";

import { getFirestore } from "firebase-admin/firestore";

const projectId = "amigo-secreto-familiar-d77ea";

function createFirebaseApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  let credential;

  // En producción utilizaremos una variable privada de Vercel.
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    credential = cert(serviceAccount);
  } else {
    // En desarrollo local utilizaremos la credencial de Windows.
    credential = applicationDefault();
  }

  return initializeApp({
    credential,
    projectId
  });
}

const firebaseApp = createFirebaseApp();

export const db = getFirestore(firebaseApp);
export default firebaseApp;
