import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface NotificationPrefsState {
  orderUpdates: boolean;
  promotions: boolean;
  newRestaurants: boolean;
  setPref: (key: "orderUpdates" | "promotions" | "newRestaurants", value: boolean) => void;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      orderUpdates: true,
      promotions: true,
      newRestaurants: false,
      setPref: (key, value) => set({ [key]: value } as Partial<NotificationPrefsState>),
    }),
    { name: "golfeexpress-client-notification-prefs", storage: createJSONStorage(() => AsyncStorage) }
  )
);
