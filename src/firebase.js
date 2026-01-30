import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  browserPopupRedirectResolver, 
  browserSessionPersistence,
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

// Nastavenie perzistencie a resolvera pre lepšiu podporu Safari
setPersistence(auth, browserSessionPersistence);

export const googleProvider = new GoogleAuthProvider();
// Toto pomáha Safari pochopiť, ako spracovať návrat z prihlásenia
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const db = getFirestore(app);