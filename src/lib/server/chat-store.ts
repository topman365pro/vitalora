import { randomUUID } from "node:crypto";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseFirestore } from "@/lib/firebase/admin";

export type StoredChatThread = {
  id: string;
  userId: string;
  deviceId: string | null;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  contextSnapshot?: Record<string, unknown>;
};

type FirestoreChatThread = {
  userId: string;
  deviceId: string | null;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type FirestoreChatMessage = {
  role: string;
  content: string;
  contextSnapshot: Record<string, unknown>;
  createdAt: Timestamp;
};

const THREADS_COLLECTION = "chatThreads";

function toDate(value: Timestamp | Date | null | undefined) {
  if (!value) {
    return new Date(0);
  }

  return value instanceof Timestamp ? value.toDate() : value;
}

function threadFromDoc(
  id: string,
  data: Partial<FirestoreChatThread> | undefined,
): StoredChatThread | null {
  if (!data?.userId || !data.title) {
    return null;
  }

  return {
    id,
    userId: data.userId,
    deviceId: data.deviceId ?? null,
    title: data.title,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function getThreadsCollection(userId: string) {
  return getFirebaseFirestore().collection("users").doc(userId).collection(THREADS_COLLECTION);
}

function messageFromDoc(
  id: string,
  data: Partial<FirestoreChatMessage> | undefined,
): StoredChatMessage | null {
  if (!data?.role || !data.content) {
    return null;
  }

  return {
    id,
    role: data.role,
    content: data.content,
    createdAt: toDate(data.createdAt),
    contextSnapshot: data.contextSnapshot ?? {},
  };
}

export async function listThreads(userId: string) {
  const snapshot = await getThreadsCollection(userId).orderBy("updatedAt", "desc").get();

  return snapshot.docs
    .map((doc) => threadFromDoc(doc.id, doc.data() as Partial<FirestoreChatThread>))
    .filter((thread): thread is StoredChatThread => Boolean(thread));
}

export async function getThread(userId: string, threadId: string) {
  const doc = await getThreadsCollection(userId).doc(threadId).get();

  if (!doc.exists) {
    return null;
  }

  return threadFromDoc(doc.id, doc.data() as Partial<FirestoreChatThread>);
}

export async function createThread(params: {
  userId: string;
  deviceId?: string | null;
  title?: string | null;
}) {
  const ref = getThreadsCollection(params.userId).doc(randomUUID());
  const now = FieldValue.serverTimestamp();

  await ref.set({
    userId: params.userId,
    deviceId: params.deviceId ?? null,
    title: params.title?.trim() || "New conversation",
    createdAt: now,
    updatedAt: now,
  });

  const created = await ref.get();
  const thread = threadFromDoc(created.id, created.data() as Partial<FirestoreChatThread>);

  if (!thread) {
    throw new Error("Failed to create Firestore thread");
  }

  return thread;
}

export async function updateThread(
  userId: string,
  threadId: string,
  patch: Partial<Pick<StoredChatThread, "title">>,
) {
  await getThreadsCollection(userId)
    .doc(threadId)
    .set(
      {
        ...(patch.title ? { title: patch.title } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function listMessages(userId: string, threadId: string) {
  const snapshot = await getThreadsCollection(userId)
    .doc(threadId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .get();

  return snapshot.docs
    .map((doc) => messageFromDoc(doc.id, doc.data() as Partial<FirestoreChatMessage>))
    .filter((message): message is StoredChatMessage => Boolean(message));
}

export async function addMessage(params: {
  userId: string;
  threadId: string;
  role: string;
  content: string;
  contextSnapshot?: Record<string, unknown>;
}) {
  const ref = getThreadsCollection(params.userId)
    .doc(params.threadId)
    .collection("messages")
    .doc(randomUUID());

  await ref.set({
    role: params.role,
    content: params.content,
    contextSnapshot: params.contextSnapshot ?? {},
    createdAt: FieldValue.serverTimestamp(),
  });

  const created = await ref.get();
  const message = messageFromDoc(created.id, created.data() as Partial<FirestoreChatMessage>);

  if (!message) {
    throw new Error("Failed to create Firestore message");
  }

  return message;
}
