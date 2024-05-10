import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

import { getQueryKey } from "@react-hooked/core/observable/__tests__/test-utils";

const firebaseConfig = {
  apiKey: "-",
  projectId: "demo-test",
};

export const getFirebaseApp = () => {
  const app = initializeApp(firebaseConfig, getQueryKey());

  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://localhost:9099");

  const firestore = getFirestore(app);
  connectFirestoreEmulator(firestore, "localhost", 8080);

  return { auth, firestore };
};
