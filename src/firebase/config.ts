import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  "projectId": "studio-6042688875-c5251",
  "appId": "1:905700458697:web:c0281d8b8cbf4272654d18",
  "apiKey": "AIzaSyASZ4AhfMW-rUCWLoA3QDAkjfV8gKHmVbM",
  "authDomain": "studio-6042688875-c5251.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "905700458697",
  "storageBucket": "studio-6042688875-c5251.firebasestorage.app"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);


