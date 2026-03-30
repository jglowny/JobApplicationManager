import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAwRsL48mH5K7XX_Yyq3Q4C56xCkEmPFaM",
  authDomain: "offers-app-d0fcc.firebaseapp.com",
  projectId: "offers-app-d0fcc",
  storageBucket: "offers-app-d0fcc.firebasestorage.app",
  messagingSenderId: "423300884891",
  appId: "1:423300884891:web:7d61e1a7cb6f7a7a1a193e",
  measurementId: "G-V4X92PEMKH",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
