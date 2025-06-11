// firebase.js

// استدعاء الدوال من SDK
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// معلومات مشروعك من Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCVlknWDOH02lxR2Jw24EPRdCKZW4Yig1M",
  authDomain: "ulg1-3cdcc.firebaseapp.com",
  projectId: "ulg1-3cdcc",
  storageBucket: "ulg1-3cdcc.firebasestorage.app",
  messagingSenderId: "755301492420",
  appId: "1:755301492420:web:c61115e08fdbd6d33f4b91",
  measurementId: "G-BQ82JK5TZ6"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تهيئة Firestore
const db = getFirestore(app);

// تصدير قاعدة البيانات لاستخدامها في باقي الملفات
export { db };
