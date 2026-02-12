import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listNotes, loadNote, loadNotesMapByDateKey, saveNote, type Dataset, type DateKey, type Note } from './localdb';

// Hook to load a single note for a dataset/date
export function useNote(datasetId: string, date: DateKey) {
	return useQuery({
		queryKey: ['note', datasetId, date],
		queryFn: () => loadNote(datasetId, date),
		enabled: !!datasetId && !!date,
	});
}

// Hook to list all notes for a dataset
export function useNotes(datasetId: string) {
	return useQuery({
		queryKey: ['notes', datasetId],
		queryFn: () => listNotes(datasetId),
		enabled: !!datasetId,
	});
}

// Hook to load a map of notes for a date key (day, week, month, year)
export function useNotesMapByDateKey(datasetId: string, dateKey: DateKey) {
	return useQuery({
		queryKey: ['notesByDateKey', datasetId, dateKey],
		queryFn: () => loadNotesMapByDateKey(datasetId, dateKey),
		enabled: !!datasetId && !!dateKey,
	});
}

// Hook to save a note and update caches
export function useSaveNote() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (params: { datasetId: string; date: DateKey; text: string }) => {
			return await saveNote(params.datasetId, params.date, params.text);
		},
		onSuccess: (saved) => {
			if (!saved) return;
			const { datasetId, date } = saved;

			queryClient.setQueryData(['note', datasetId, date], saved);

			const notesKey = ['notes', datasetId];
			const notes = queryClient.getQueryData(notesKey) as Note[] | undefined;
			if (notes) {
				const nextNotes = [...notes];
				const idx = nextNotes.findIndex((note) => note.date === date);
				if (idx !== -1) {
					nextNotes[idx] = saved;
				} else {
					nextNotes.push(saved);
				}
				queryClient.setQueryData(notesKey, nextNotes);
			}

			queryClient.setQueryData(['datasets'], (existing: Dataset[] | undefined) => {
				if (!Array.isArray(existing)) return existing;
				return existing.map((d) => (d?.id === datasetId ? { ...d, updatedAt: Date.now() } : d));
			});
			queryClient.setQueryData(['dataset', datasetId], (existing: Dataset | undefined) => {
				if (!existing) return existing;
				return { ...existing, id: datasetId, updatedAt: Date.now() };
			});

			const mapQueries = queryClient.getQueryCache().findAll({ queryKey: ['notesByDateKey', datasetId] });
			for (const q of mapQueries) {
				queryClient.invalidateQueries({ queryKey: q.queryKey });
			}
		},
	});
}
