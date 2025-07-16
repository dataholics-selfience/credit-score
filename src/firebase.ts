import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCI70r_25dRu7caMlAnEp4m4j9xI8nf3DI",
  authDomain: "credit-score-43967.firebaseapp.com",
  projectId: "credit-score-43967",
  storageBucket: "credit-score-43967.firebasestorage.app",
  messagingSenderId: "985387813672",
  appId: "1:985387813672:web:9aaa55a52127a4b2afde1d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth, Firestore and Storage instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;