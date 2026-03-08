import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyB9NmMe0LXIAzaT_mBhF0NFEeMz-wr-JeA",
  authDomain: "weatherza-64ed2.firebaseapp.com",
  projectId: "weatherza-64ed2",
  storageBucket: "weatherza-64ed2.firebasestorage.app",
  messagingSenderId: "58859301277",
  appId: "1:58859301277:web:4a6ac839bbbee7ba79a774",
  measurementId: "G-5SSVSXHC2F"
};

export const firebaseApp = initializeApp(firebaseConfig);
