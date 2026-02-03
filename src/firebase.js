import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  indexedDBLocalPersistence,
  setPersistence
} from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

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

// IndexedDB is the most stable for PWA/iOS
setPersistence(auth, indexedDBLocalPersistence).catch(err => console.error(err));

export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Enable Firestore offline persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore persistence failed: Browser not supported');
    }
});