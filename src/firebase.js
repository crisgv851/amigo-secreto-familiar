
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQBhfu0oqak_Tg7pZOgfmzDVbrY8kED6o",
  authDomain: "amigo-secreto-familiar-d77ea.firebaseapp.com",
  projectId: "amigo-secreto-familiar-d77ea",
  storageBucket: "amigo-secreto-familiar-d77ea.firebasestorage.app",
  messagingSenderId: "947979133915",
  appId: "1:947979133915:web:d2a92e1effe4c559a37dfe",
  measurementId: "G-LXNP8FSC6D"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios de Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
