import {
  collection as colRef,
  collectionGroup as colGroup,
  CollectionReference,
  doc as docRef,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  FieldPath,
  FirebaseFirestore,
  FirestoreError,
  getDoc as getDocument,
  getDocs as getDocuments,
  onSnapshot,
  query as qry,
  Query,
  QueryConstraint,
  QuerySnapshot,
  SnapshotOptions,
} from 'firebase/firestore'

export function collection<T = DocumentData>(
  fs: FirebaseFirestore,
  path: string,
  ...pathSegments: string[]
) {
  return colRef(fs, path, ...pathSegments) as CollectionReference<T>
}

export function collectionGroup<T = DocumentData>(fs: FirebaseFirestore, collectionId: string) {
  return colGroup(fs, collectionId) as CollectionReference<T>
}

export function query<T = DocumentData>(q: Query<T>, ...constraints: QueryConstraint[]) {
  return qry(q, ...constraints)
}

export function doc<T = DocumentData>(
  fs: FirebaseFirestore,
  path: string,
  ...pathSegments: string[]
) {
  return docRef(fs, path, ...pathSegments) as DocumentReference<T>
}

export async function getDoc<T = DocumentData, U = Partial<T>>(
  ref: DocumentReference<T>,
  dataOnly = false,
  options?: SnapshotOptions,
  ...getFields: { fieldPath: string | FieldPath; options?: SnapshotOptions }[]
) {
  const snap = getDocument(ref)
  const { exists, get, id, metadata } = await snap

  if (getFields.length) {
    const d = getFields.map(({ fieldPath, options }) => ({
      data: get(fieldPath, options),
      fieldPath,
    }))
    let data: U | Record<string, unknown> = {}
    for (const v of d) {
      const parsedFieldPath: {
        [key: string]: unknown
      } = parseFieldPath(v.fieldPath as string, data)
      data = {
        ...data,
        ...parsedFieldPath,
      }
    }

    if (dataOnly) return data

    return {
      data,
      exists,
      id,
      metadata,
    }
  }

  if (dataOnly) return (await snap).data(options)

  return {
    data: (await snap).data(options),
    exists,
    id,
    metadata,
  }
}

export async function getDocs<T = DocumentData, U = Partial<T>>(
  query: Query<T>,
  dataOnly = false,
  options?: SnapshotOptions,
  ...getFields: { fieldPath: string; options?: SnapshotOptions }[]
) {
  const snaps = (await getDocuments(query)).docs
  if (dataOnly)
    return snaps.map((snap) => {
      if (getFields.length) {
        const d = getFields.map(({ fieldPath, options }) => ({
          data: snap.get(fieldPath, options),
          fieldPath,
        }))
        let data: U | Record<string, unknown> = {}
        for (const v of d) {
          const parsedFieldPath: {
            [key: string]: unknown
          } = parseFieldPath(v.fieldPath as string, data)
          data = {
            ...data,
            ...parsedFieldPath,
          }
        }
        return data as U
      }

      return snap.data()
    })

  return snaps.map((snap) => {
    const { exists, get, id, metadata } = snap
    if (getFields.length) {
      const d = getFields.map(({ fieldPath, options }) => ({
        data: get(fieldPath, options),
        fieldPath,
      }))
      let data: U | Record<string, unknown> = {}
      for (const v of d) {
        const parsedFieldPath: {
          [key: string]: unknown
        } = parseFieldPath(v.fieldPath as string, data)
        data = {
          ...data,
          ...parsedFieldPath,
        }
      }

      return {
        data,
        exists,
        id,
        metadata,
      }
    }
    return {
      data: snap.data(),
      exists,
      id,
      metadata,
    }
  })
}

export function listenDoc<T = DocumentData>(
  ref: DocumentReference<T>,
  cb: {
    complete?: () => void
    error?: (err: FirestoreError) => void
    next?: (snap: DocumentSnapshot<T>) => void
  },
) {
  onSnapshot(ref, {
    complete: cb.complete,
    error: cb.error,
    next: cb.next,
  })
}

export function listenDocs<T = DocumentData>(
  query: Query<T>,
  cb: {
    complete?: () => void
    error?: (err: FirestoreError) => void
    next?: (snaps: QuerySnapshot<T>) => void
  },
) {
  onSnapshot(query, {
    complete: cb.complete,
    error: cb.error,
    next: cb.next,
  })
}

export function parseFieldPath<
  U = {
    [key: string]: unknown
  },
>(fp: string, data: unknown) {
  let result: {
    [key: string]: Record<string, unknown> | unknown
  } = {}
  const fields = fp.split('.')
  result = {
    [fields[0]]: data,
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  if (fields.slice(1).length) result[fields[0]] = parseFieldPath(fields.slice(1).join('.'), data)
  return result as unknown as U
}
