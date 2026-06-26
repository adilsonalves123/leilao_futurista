import { createContext, useContext, useState, type ReactNode } from 'react';

export const DEFAULT_AVATAR = 'https://i.pravatar.cc/120?img=12';

type ProfileContextValue = {
  avatarUri: string;
  setAvatarUri: (uri: string) => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [avatarUri, setAvatarUri] = useState(DEFAULT_AVATAR);

  return (
    <ProfileContext.Provider value={{ avatarUri, setAvatarUri }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile deve ser usado dentro de ProfileProvider');
  }
  return ctx;
}
