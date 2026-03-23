import { create } from "zustand";
import type {
  KnowledgeFolder,
  KnowledgeDocument,
} from "@/tauri/knowledge";
import {
  knowledgeListFolders,
  knowledgeCreateFolder,
  knowledgeUpdateFolder,
  knowledgeDeleteFolder,
  knowledgeListDocuments,
  knowledgeCreateDocument,
  knowledgeGetDocument,
  knowledgeUpdateDocument,
  knowledgeDeleteDocument,
  knowledgeSearchDocuments,
} from "@/tauri/knowledge";

interface KnowledgeState {
  folders: KnowledgeFolder[];
  documents: KnowledgeDocument[];
  selectedFolderId: string | null;
  selectedDocumentId: string | null;
  isLoading: boolean;

  loadFolders: () => Promise<void>;
  createFolder: (name: string, parentId: string | null) => Promise<void>;
  updateFolder: (id: string, name: string, icon: string, color: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  selectFolder: (id: string | null) => void;
  loadDocuments: (folderId: string) => Promise<void>;
  createDocument: (title: string) => Promise<void>;
  getDocument: (id: string) => Promise<KnowledgeDocument | null>;
  updateDocument: (id: string, title: string, content: string, tags: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  selectDocument: (id: string | null) => void;
  searchDocuments: (query: string) => Promise<KnowledgeDocument[]>;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  folders: [],
  documents: [],
  selectedFolderId: null,
  selectedDocumentId: null,
  isLoading: false,

  loadFolders: async () => {
    set({ isLoading: true });
    try {
      const folders = await knowledgeListFolders();
      set({ folders });
    } catch {
      // IPC unavailable
    } finally {
      set({ isLoading: false });
    }
  },

  createFolder: async (name, parentId) => {
    const id = crypto.randomUUID();
    const sortOrder = get().folders.length;
    try {
      await knowledgeCreateFolder({
        id,
        name,
        parentId,
        icon: "folder",
        color: "#3b82f6",
        sortOrder,
      });
      await get().loadFolders();
    } catch {
      // IPC unavailable
    }
  },

  updateFolder: async (id, name, icon, color) => {
    const folder = get().folders.find((f) => f.id === id);
    if (!folder) return;
    try {
      await knowledgeUpdateFolder({
        id,
        name,
        icon,
        color,
        sortOrder: folder.sortOrder,
      });
      await get().loadFolders();
    } catch {
      // IPC unavailable
    }
  },

  deleteFolder: async (id) => {
    try {
      await knowledgeDeleteFolder(id);
      const state = get();
      if (state.selectedFolderId === id) {
        set({ selectedFolderId: null, documents: [], selectedDocumentId: null });
      }
      await get().loadFolders();
    } catch {
      // IPC unavailable
    }
  },

  selectFolder: (id) => {
    set({ selectedFolderId: id, selectedDocumentId: null });
    if (id) {
      void get().loadDocuments(id);
    } else {
      set({ documents: [] });
    }
  },

  loadDocuments: async (folderId) => {
    try {
      const documents = await knowledgeListDocuments(folderId);
      set({ documents });
    } catch {
      // IPC unavailable
    }
  },

  createDocument: async (title) => {
    const { selectedFolderId } = get();
    if (!selectedFolderId) return;

    const id = crypto.randomUUID();
    try {
      await knowledgeCreateDocument({
        id,
        folderId: selectedFolderId,
        title,
        content: "",
        tags: "",
      });
      await get().loadDocuments(selectedFolderId);
      set({ selectedDocumentId: id });
    } catch {
      // IPC unavailable
    }
  },

  getDocument: async (id) => {
    try {
      return await knowledgeGetDocument(id);
    } catch {
      return null;
    }
  },

  updateDocument: async (id, title, content, tags) => {
    try {
      await knowledgeUpdateDocument({ id, title, content, tags });
      const { selectedFolderId } = get();
      if (selectedFolderId) {
        await get().loadDocuments(selectedFolderId);
      }
    } catch {
      // IPC unavailable
    }
  },

  deleteDocument: async (id) => {
    try {
      await knowledgeDeleteDocument(id);
      const state = get();
      if (state.selectedDocumentId === id) {
        set({ selectedDocumentId: null });
      }
      if (state.selectedFolderId) {
        await get().loadDocuments(state.selectedFolderId);
      }
    } catch {
      // IPC unavailable
    }
  },

  selectDocument: (id) => {
    set({ selectedDocumentId: id });
  },

  searchDocuments: async (query) => {
    try {
      return await knowledgeSearchDocuments(query);
    } catch {
      return [];
    }
  },
}));
