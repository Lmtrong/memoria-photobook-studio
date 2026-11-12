import { create } from 'zustand';
import { Album, UserProfile } from '../types';

const AUTH_STORAGE_KEY = 'memoria_current_user_v1';

function loadSavedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

interface AuthState {
  currentUser: UserProfile | null;
  authModalOpen: boolean;
  cloudConfigModalOpen: boolean;
  setCurrentUser: (user: UserProfile | null) => void;
  logout: () => void;
  setAuthModalOpen: (open: boolean) => void;
  setCloudConfigModalOpen: (open: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: loadSavedUser(),
  authModalOpen: false,
  cloudConfigModalOpen: false,

  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    set({ currentUser: user });
  },

  logout: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    set({ currentUser: null });
  },

  setAuthModalOpen: (open) => set({ authModalOpen: open }),
  setCloudConfigModalOpen: (open) => set({ cloudConfigModalOpen: open }),
}));

/**
 * Checks whether `user` has Owner permission to edit/delete/modify `album`.
 * Visitors opening a shared link who are not the album's owner get Read-Only (Viewer) access.
 */
export function canUserEditAlbum(
  album: Album | null | undefined,
  user: UserProfile | null
): boolean {
  if (!album) return false;
  if (!album.ownerId) {
    // Unclaimed sample/local album on the creator's browser
    return true;
  }
  if (!user) return false;
  return album.ownerId === user.id;
}
