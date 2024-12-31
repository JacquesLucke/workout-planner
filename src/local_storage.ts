import useLocalStorageState, {
  LocalStorageState,
} from "use-local-storage-state";
import { defaultSettings } from "./default_settings";
import { defaultWorkout } from "./default_workout";
import {
  Settings,
  settingsLocalStorageKey,
  Workout,
  workoutLocalStorageKey,
} from "./model";

export function useSettings(): LocalStorageState<Settings> {
  let result = useLocalStorageState<Settings>(settingsLocalStorageKey, {
    defaultValue: defaultSettings,
  });
  return result;
}

export function useCurrentTab() {
  return useLocalStorageState<string>("currentTab", {
    defaultValue: "workout",
  });
}

export function useCurrentWorkout(): LocalStorageState<Workout> {
  return useLocalStorageState<Workout>(workoutLocalStorageKey, {
    defaultValue: defaultWorkout,
  });
}
