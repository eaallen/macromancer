import { getAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";
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
  measurementId: "G-PJWGKDL8RS",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

type AnalyticsParam = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsParam>;

let analytics: Analytics | null = null;
let analyticsReady: Promise<Analytics | null> | null = null;

export function initAnalytics(): Promise<Analytics | null> {
  analyticsReady ??= isSupported()
    .then((supported) => {
      if (!supported) {
        return null;
      }
      analytics = getAnalytics(firebaseApp);
      return analytics;
    })
    .catch(() => null);
  return analyticsReady;
}

export function logAnalyticsEvent(name: string, params?: AnalyticsParams): void {
  void initAnalytics().then((instance) => {
    if (!instance) {
      return;
    }
    logEvent(instance, name, params);
  });
}
