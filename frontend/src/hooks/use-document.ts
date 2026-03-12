import { useCallback, useEffect, useState } from "react";
import * as api from "../lib/api";
import type { Document } from "../types";

export function useDocument(conversationId: string | null) {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!conversationId) {
			setDocuments([]);
			setActiveDocumentId(null);
			return;
		}
		try {
			setError(null);
			const docs = await api.fetchDocuments(conversationId);
			setDocuments(docs);
			// If the current active doc is no longer in the list (or none set), pick the first
			setActiveDocumentId((prev) => {
				if (prev && docs.some((d) => d.id === prev)) return prev;
				return docs[0]?.id ?? null;
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load documents");
		}
	}, [conversationId]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const upload = useCallback(
		async (file: File) => {
			if (!conversationId) return null;
			try {
				setUploading(true);
				setError(null);
				const doc = await api.uploadDocument(conversationId, file);
				setDocuments((prev) => [...prev, doc]);
				setActiveDocumentId(doc.id);
				return doc;
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to upload document",
				);
				return null;
			} finally {
				setUploading(false);
			}
		},
		[conversationId],
	);

	const activeDocument =
		documents.find((d) => d.id === activeDocumentId) ?? null;

	return {
		// multi-doc
		documents,
		activeDocument,
		setActiveDocumentId,
		// single-doc compat (first doc)
		document: activeDocument,
		uploading,
		error,
		upload,
		refresh,
	};
}
