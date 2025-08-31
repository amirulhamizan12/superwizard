import { merge } from "lodash";
import { create, StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { createTaskManagerSlice, TaskManagerSlice, TaskHistoryEntry, getTaskTab } from "./TaskManager";
import { createSettingsSlice, SettingsSlice } from "./settings";
import { createStorageSlice, StorageSlice, chromeStorage } from "./storage";
import { createAuthSlice, AuthSlice } from "./auth";

export type StoreType = {
  taskManager: TaskManagerSlice;
  settings: SettingsSlice;
  storage: StorageSlice;
  auth: AuthSlice;
};

export type MyStateCreator<T> = StateCreator<
  StoreType,
  [["zustand/immer", never]],
  [],
  T
>;

export const useAppState = create<StoreType>()(
  persist(
    immer(
      devtools((...a) => ({
        taskManager: createTaskManagerSlice(...a),
        settings: createSettingsSlice(...a),
        storage: createStorageSlice(...a),
        auth: createAuthSlice(...a),
      }))
    ),
    {
      name: "app-state-v2",
      storage: createJSONStorage(() => chromeStorage),
      partialize: (state) => ({
        // Stuff we want to persist
        settings: {
          // UI settings
          instructions: state.settings.instructions,
          chatViewMode: state.settings.chatViewMode,
          screenVisionEnabled: state.settings.screenVisionEnabled,

          // Provider settings
          configuredProviders: state.settings.configuredProviders,
          selectedModel: state.settings.selectedModel,
        },
      }),
      merge: (persistedState: any, currentState: StoreType) => {
        return merge(currentState, persistedState);
      },
    }
  )
);

export type { TaskHistoryEntry };
export type { TaskProgress } from "./TaskManager";
export { getTaskTab };

export type { Chat } from "./storage";
