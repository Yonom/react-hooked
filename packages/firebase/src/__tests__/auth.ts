import { describe, expect, jest, test } from "@jest/globals";
import { User, signInAnonymously } from "firebase/auth";

import { getFirebaseApp } from "./test-utils";
import { authStateQuery } from "../auth";
import readQuery from "@react-hooked/core/observable/helpers/readQuery";
import { subscribeToQuery } from "@react-hooked/core/observable/helpers/subscribeToQuery";

jest.useFakeTimers();

describe.skip("firebase auth", () => {
  test("read auth", async () => {
    const { auth } = getFirebaseApp();
    const query = authStateQuery(auth);
    const val = await readQuery(query);
    expect(val).toBe(auth.currentUser);
  });

  test("sync value if loaded", async () => {
    const { auth } = getFirebaseApp();
    const query = authStateQuery(auth);
    const { user } = await signInAnonymously(auth);

    const val = readQuery(query).value;
    expect(val).toBe(user);
  });

  test("subscribe to auth", async () => {
    const { auth } = getFirebaseApp();
    const query = authStateQuery(auth);
    const results: (User | null)[] = [];
    subscribeToQuery(query, {
      next(user) {
        results.push(user);
      },
    });

    await jest.advanceTimersByTimeAsync(0);

    const { user } = await signInAnonymously(auth);
    expect(results).toEqual([null, user]);
  });
});
