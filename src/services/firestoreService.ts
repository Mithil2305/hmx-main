import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	query,
	serverTimestamp,
	setDoc,
	updateDoc,
	where,
} from "firebase/firestore";
import { db } from "./firebase";

export const createUserProfile = async (
	uid: string,
	data: Record<string, any>,
) => {
	await setDoc(
		doc(db, "users", uid),
		{
			...data,
			updatedAt: serverTimestamp(),
		},
		{ merge: true },
	);
};

export const ensureUserProfile = async (
	uid: string,
	data: Record<string, any>,
) => {
	await addOrMergeDoc("users", uid, {
		...data,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
};

export const addOrMergeDoc = async (
	collectionName: string,
	docId: string,
	data: Record<string, any>,
) => {
	await setDoc(doc(db, collectionName, docId), data, { merge: true });
};

export const getUserProfile = async (uid: string) => {
	const snapshot = await getDoc(doc(db, "users", uid));
	if (!snapshot.exists()) return null;
	return { id: snapshot.id, ...snapshot.data() };
};

export const getRecord = async (collectionName: string, id: string) => {
	const snapshot = await getDoc(doc(db, collectionName, id));
	if (!snapshot.exists()) return null;
	return { id: snapshot.id, ...snapshot.data() };
};

export const createRecord = async (
	collectionName: string,
	data: Record<string, any>,
) => {
	const snapshot = await addDoc(collection(db, collectionName), {
		...data,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	});
	return snapshot.id;
};

export const updateRecord = async (
	collectionName: string,
	id: string,
	data: Record<string, any>,
) => {
	await updateDoc(doc(db, collectionName, id), {
		...data,
		updatedAt: serverTimestamp(),
	});
};

export const deleteRecord = async (collectionName: string, id: string) => {
	await deleteDoc(doc(db, collectionName, id));
};

export const getRecords = async (collectionName: string) => {
	const snapshot = await getDocs(collection(db, collectionName));
	return snapshot.docs.map((docSnap) => ({
		id: docSnap.id,
		...docSnap.data(),
	}));
};

export const getRecordsByField = async (
	collectionName: string,
	field: string,
	value: any,
) => {
	const snapshot = await getDocs(
		query(collection(db, collectionName), where(field, "==", value)),
	);
	return snapshot.docs.map((docSnap) => ({
		id: docSnap.id,
		...docSnap.data(),
	}));
};
