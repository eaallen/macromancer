import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDuIRR76xhNiz5ttcu8DtIVWAuCN04mDB0",
  authDomain: "fire-rat.firebaseapp.com",
  projectId: "fire-rat",
  storageBucket: "fire-rat.firebasestorage.app",
  messagingSenderId: "55755258244",
  appId: "1:55755258244:web:0a73677d9028ca9e7305d1",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
