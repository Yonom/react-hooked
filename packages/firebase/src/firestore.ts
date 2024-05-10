import {
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Query as FirestoreQuery,
  QuerySnapshot,
  onSnapshot,
  queryEqual,
} from "@firebase/firestore";
import { Observable } from "rxjs";

import readQuery from "@react-hooked/core/observable/helpers/readQuery";
import useSuspenseQuery from "@react-hooked/core/observable/react/useSuspenseQuery";
import { Query } from "@react-hooked/core/observable/types";
import composeQuery from "@react-hooked/core/observable/compose/composeQuery";

const cachedQueries: FirestoreQuery<any>[] = [];

function getUniqueIdForFirestoreQuery<T = DocumentData>(
  query: FirestoreQuery<T>,
) {
  const index = cachedQueries.findIndex((cachedQuery) =>
    queryEqual(cachedQuery, query),
  );
  if (index > -1) {
    return index;
  }
  return cachedQueries.push(query) - 1;
}

export const firestoreDocQuery = <T>(ref: DocumentReference<T>) => {
  return {
    key: `firestore:doc:${ref.firestore.app.name}:${ref.path}`,
    observable: new Observable((subscriber) => {
      return onSnapshot(ref, subscriber);
    }),
  } satisfies Query<DocumentSnapshot<T>>;
};

export const firestoreDocDataQuery = <T>(ref: DocumentReference<T>) => {
  return composeQuery({
    key: `firestore:docData:${ref.firestore.app.name}:${ref.path}`,
    render: async ({ read }) => {
      const snapshot = await read(firestoreDocQuery(ref));
      return snapshot.data();
    },
  });
};

export const firestoreDocsQuery = <T>(query: FirestoreQuery<T>) => {
  return {
    key: `firestore:docs:${getUniqueIdForFirestoreQuery(query)}`,
    observable: new Observable((subscriber) => {
      return onSnapshot(query, subscriber);
    }),
  } satisfies Query<QuerySnapshot<T>>;
};

export const DocumentIdSymbol = Symbol("DocumentId");

type WithId<T> = T & {
  [DocumentIdSymbol]: string;
};

export const firestoreDocsDataQuery = <T>(
  query: FirestoreQuery<T>,
): Query<WithId<T>[]> => {
  return composeQuery({
    key: `firestore:docsData:${getUniqueIdForFirestoreQuery(query)}`,
    render: async ({ read }) => {
      const snapshot = await read(firestoreDocsQuery(query));
      return snapshot.docs.map((doc) => {
        const data = doc.data() as WithId<T>;
        data[DocumentIdSymbol] = doc.id;
        return data;
      });
    },
  });
};

export const useFirestoreDoc = <T = DocumentData>(
  ref: DocumentReference<T>,
): DocumentSnapshot<T> => {
  return useSuspenseQuery(firestoreDocQuery(ref));
};

export const getFirestoreDoc = async <T = DocumentData>(
  ref: DocumentReference<T>,
): Promise<DocumentSnapshot<T>> => {
  return readQuery(firestoreDocQuery(ref));
};

export const useFirestoreDocData = <T = DocumentData>(
  ref: DocumentReference<T>,
): T | undefined => {
  return useSuspenseQuery(firestoreDocDataQuery(ref));
};

export function useFirestoreDocs<T = DocumentData>(
  query: FirestoreQuery<T>,
): QuerySnapshot<T> {
  return useSuspenseQuery(firestoreDocsQuery(query));
}

export function useFirestoreDocsData<T = DocumentData>(
  query: FirestoreQuery<T>,
): WithId<T>[] {
  return useSuspenseQuery(firestoreDocsDataQuery(query));
}
