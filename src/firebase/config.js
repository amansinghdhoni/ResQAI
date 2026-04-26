import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase config provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyAM0ajkdjJXAZh4ZnoV0HVEPO-DFhMNobg",
  authDomain: "resqai-ed8b0.firebaseapp.com",
  projectId: "resqai-ed8b0",
  storageBucket: "resqai-ed8b0.firebasestorage.app",
  messagingSenderId: "393105660970",
  appId: "1:393105660970:web:01f0fe648acf5e29487753"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
