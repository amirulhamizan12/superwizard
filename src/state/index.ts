import { merge } from "lodash";
import { create, StateCreator } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { createTaskManagerSlice, TaskManagerSlice, TaskHistoryEntry, TaskProgress, getTaskTab } from "./tasks";
import { createSettingsSlice, SettingsSlice } from "./settings";
import { createStorageSlice, StorageSlice, Chat, setTaskRunningState, chromeStorage } from "./storage";
import { createAuthSlice, AuthSlice } from "./auth";

export type StoreType = {
  taskManager: TaskManagerSlice;
  settings: SettingsSlice;
  storage: StorageSlice;
  auth: AuthSlice;
};
export type MyStateCreator<T> = StateCreator<StoreType, [["zustand/immer", never]], [], T>;

export const useAppState = create<StoreType>()(
  persist(
    immer(devtools((...a) => ({
      taskManager: createTaskManagerSlice(...a),
      settings: createSettingsSlice(...a),
      storage: createStorageSlice(...a),
      auth: createAuthSlice(...a),
    }))),
    {
      name: "app-state-v2",
      storage: createJSONStorage(() => chromeStorage),
      partialize: (state) => ({
        settings: {
          instructions: state.settings.instructions,
          darkMode: state.settings.darkMode,
          configuredProviders: state.settings.configuredProviders,
          selectedModel: state.settings.selectedModel,
        },
      }),
      merge: (persistedState: any, currentState: StoreType) => merge(currentState, persistedState),
    }
  )
);

export type { TaskHistoryEntry, TaskProgress, TaskManagerSlice, Chat, StorageSlice };
export { getTaskTab, createTaskManagerSlice, setTaskRunningState, chromeStorage, createStorageSlice };
