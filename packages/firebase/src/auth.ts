import {
  type Auth,
  type User,
  onAuthStateChanged,
  signInAnonymously,
} from "@firebase/auth";
import { Observable } from "rxjs";

import { type Query, composeQuery, useSuspenseQuery } from "@react-hooked/core";

export const authStateQuery = (auth: Auth): Query<User | null> => {
  return {
    key: `auth:authState:${auth.name}`,
    observable() {
      return new Observable((subscriber) => {
        if (auth.currentUser != null) {
          subscriber.next(auth.currentUser);
        }

        return onAuthStateChanged(auth, subscriber);
      });
    },
  } satisfies Query<User | null>;
};

export const authStateOrSignInAnonymouslyQuery = (auth: Auth) => {
  return composeQuery({
    key: `auth:authStateOrSignInAnonymously:${auth.name}`,
    async render({ read }) {
      const user = await read(authStateQuery(auth));
      if (user) return user;

      const cred = await signInAnonymously(auth);
      return cred.user;
    },
  }) satisfies Query<User>;
};

export const useAuthState = (auth: Auth): User | null => {
  return useSuspenseQuery(authStateQuery(auth));
};

export const useAuthStateOrSignInAnonymously = (auth: Auth): User => {
  return useSuspenseQuery(authStateOrSignInAnonymouslyQuery(auth));
};
