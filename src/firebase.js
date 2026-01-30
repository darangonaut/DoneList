import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  indexedDBLocalPersistence,
  setPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAL2hN40jx6sA9refGF3uNks9Bpd68sanY",
  authDomain: "donelist-8b4e7.firebaseapp.com",
  projectId: "donelist-8b4e7",
  storageBucket: "donelist-8b4e7.firebasestorage.app",
  messagingSenderId: "73001294102",
  appId: "1:73001294102:web:fc416b73b630f9f17f1837"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// IndexedDB je pre iPhone najstabilnejšia voľba
setPersistence(auth, indexedDBLocalPersistence).catch(err => console.error(err));

export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);