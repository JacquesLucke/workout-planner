import { useRef } from "react";
import { defaultSettings } from "./default_settings";
import { useSettings, useActivityLog } from "./local_storage";
import { Settings, ExerciseGroup, Exercise } from "./model";
import {
  getOverriddenExerciseDuration,
  shouldIncludeGroupInWorkout,
} from "./workout";
import { getLastTimeExerciseOfGroupWasFinished } from "./activity_log";
import { getStringForLastTime } from "./utils";

export function SettingsTab() {
  const [settings, _] = useSettings();
  const newGroupNameRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <GlobalTimeSettingsBox />
      {settings.exerciseGroups.map((group, i) => (
        <ExerciseGroupSection
          key={group.identifier}
          group={group}
          groupNameRef={
            i === settings.exerciseGroups.length - 1
              ? newGroupNameRef
              : undefined
          }
        />
      ))}
      <AddExerciseGroupButton newGroupNameRef={newGroupNameRef} />
      {settings.exerciseGroups.length === 0 && <RestoreDefaultsButton />}
    </>
  );
}

function GlobalTimeSettingsBox() {
  return (
    <div className="text-sky-50 bg-sky-900 p-2 shadow-sm shadow-gray-800">
      <WarmupDurationInput />
      <FirstExercisePreparationDurationInput />
      <DefaultTaskDurationInput />
      <CooldownDurationInput />
      <NextExerciseAnnouncementOffsetInput />
      <RestDaysPerGroupInput />
      <GroupsPerWorkoutInput />
      <SetsPerGroupRangeInput />
      <SetRepetitionsRangeInput />
      <ShowExtraSettingsInput />
    </div>
  );
}

function WarmupDurationInput() {
  return (
    <SettingsNumberInput
      label="Warmup"
      getter={(settings) => settings.warmupDuration}
      setter={(settings, newProp) => (settings.warmupDuration = newProp)}
    />
  );
}

function DefaultTaskDurationInput() {
  return (
    <SettingsNumberInput
      label="Set"
      getter={(settings) => settings.defaultTaskDuration}
      setter={(settings, newProp) => (settings.defaultTaskDuration = newProp)}
    />
  );
}

function CooldownDurationInput() {
  return (
    <SettingsNumberInput
      label="Cooldown"
      getter={(settings) => settings.cooldownDuration}
      setter={(settings, newProp) => (settings.cooldownDuration = newProp)}
    />
  );
}

function GroupsPerWorkoutInput() {
  return (
    <SettingsNumberInput
      label="Groups per Workout"
      getter={(settings) => settings.groupsPerWorkout}
      setter={(settings, newProp) => (settings.groupsPerWorkout = newProp)}
    />
  );
}

function FirstExercisePreparationDurationInput() {
  return (
    <SettingsNumberInput
      label="Initial Preparation"
      getter={(settings) => settings.firstExercisePreparationDuration}
      setter={(settings, newProp) =>
        (settings.firstExercisePreparationDuration = newProp)
      }
    />
  );
}

function NextExerciseAnnouncementOffsetInput() {
  return (
    <SettingsNumberInput
      label="Announcement Offset"
      getter={(settings) => settings.nextExerciseAnnouncementOffset}
      setter={(settings, newProp) =>
        (settings.nextExerciseAnnouncementOffset = newProp)
      }
    />
  );
}

function RestDaysPerGroupInput() {
  return (
    <SettingsNumberInput
      label="Rest Days per Group"
      getter={(settings) => settings.restDaysPerGroups}
      setter={(settings, newProp) => (settings.restDaysPerGroups = newProp)}
    />
  );
}

function SetsPerGroupRangeInput() {
  return (
    <SettingsRangeInput
      label="Sets per Group"
      getter={(settings) => [
        settings.minSetsPerGroup,
        settings.maxSetsPerGroup,
      ]}
      setter={(settings, newProp) => {
        settings.minSetsPerGroup = newProp[0];
        settings.maxSetsPerGroup = newProp[1];
      }}
    />
  );
}

function SetRepetitionsRangeInput() {
  return (
    <SettingsRangeInput
      label="Set Repetitions"
      getter={(settings) => [
        settings.minSetRepetitions,
        settings.maxSetRepetitions,
      ]}
      setter={(settings, newProp) => {
        settings.minSetRepetitions = newProp[0];
        settings.maxSetRepetitions = newProp[1];
      }}
    />
  );
}

function ShowExtraSettingsInput() {
  return (
    <SettingsBooleanInput
      label="Show Extra Settings"
      getter={(settings) => settings.showExtraSettings}
      setter={(settings, newProp) => (settings.showExtraSettings = newProp)}
    />
  );
}

function SettingsBooleanInput({
  label,
  getter,
  setter,
}: {
  label: string;
  getter: (settings: Settings) => boolean;
  setter: (settings: Settings, newProp: boolean) => void;
}) {
  const [settings, setSettings] = useSettings();

  function updateProp(newProp: boolean) {
    setter(settings, newProp);
    setSettings(settings);
  }

  return (
    <div className="flex m-2 items-center">
      <label className="w-44">{label}:</label>
      <input
        type="checkbox"
        checked={getter(settings)}
        onChange={(e) => updateProp(e.target.checked)}
        className="ml-2 mr-4 cursor-pointer"
      />
    </div>
  );
}

function SettingsNumberInput({
  label,
  getter,
  setter,
}: {
  label: string;
  getter: (settings: Settings) => number;
  setter: (settings: Settings, newProp: number) => void;
}) {
  const [settings, setSettings] = useSettings();

  function updateProp(newProp: number) {
    if (isNaN(newProp)) {
      newProp = 0;
    }
    setter(settings, newProp);
    setSettings(settings);
  }

  return (
    <div className="flex m-2 items-center">
      <label className="w-44">{label}:</label>
      <input
        type="number"
        value={getter(settings)}
        onChange={(e) => updateProp(parseInt(e.target.value))}
        className="flex-1 bg-transparent border-lime-700 border-2 rounded px-2 py-1 focus:outline-none min-w-8 appearance-none"
      />
    </div>
  );
}

function SettingsRangeInput({
  label,
  getter,
  setter,
}: {
  label: string;
  getter: (settings: Settings) => [number, number];
  setter: (settings: Settings, newProp: [number, number]) => void;
}) {
  const [settings, setSettings] = useSettings();
  const [oldMin, oldMax] = getter(settings);

  function updateMin(newMin: number) {
    if (isNaN(newMin)) {
      newMin = 0;
    }
    setter(settings, [newMin, oldMax]);
    setSettings(settings);
  }

  function updateMax(newMax: number) {
    if (isNaN(newMax)) {
      newMax = 0;
    }
    setter(settings, [oldMin, newMax]);
    setSettings(settings);
  }

  return (
    <div className="flex m-2 items-center">
      <label className="w-44">{label}:</label>
      <input
        type="number"
        value={oldMin}
        onChange={(e) => updateMin(parseInt(e.target.value))}
        min={1}
        className="flex-1 bg-transparent border-lime-700 border-2 rounded px-2 py-1 focus:outline-none mr-2 min-w-8"
      />
      <input
        type="number"
        value={oldMax}
        onChange={(e) => updateMax(parseInt(e.target.value))}
        min={1}
        className="flex-1 bg-transparent border-lime-700 border-2 rounded px-2 py-1 focus:outline-none min-w-8"
      />
    </div>
  );
}

function ExerciseGroupSection({
  group,
  groupNameRef,
}: {
  group: ExerciseGroup;
  groupNameRef: React.RefObject<HTMLInputElement | null> | undefined;
}) {
  const [settings, setSettings] = useSettings();
  const [activityLog] = useActivityLog();
  const newExerciseNameRef = useRef<HTMLInputElement>(null);

  function renameGroup(newName: string) {
    const foundGroup = settings.exerciseGroups.find(
      (g) => g.identifier === group.identifier
    )!;
    foundGroup.name = newName;
    setSettings(settings);
  }

  function removeGroup() {
    settings.exerciseGroups = settings.exerciseGroups.filter(
      (g) => g.identifier !== group.identifier
    );
    setSettings(settings);
  }

  function toggleActive() {
    const foundGroup = settings.exerciseGroups.find(
      (g) => g.identifier === group.identifier
    )!;
    foundGroup.active = !foundGroup.active;
    setSettings(settings);
  }

  const lastTime = getLastTimeExerciseOfGroupWasFinished(activityLog, group);
  let lastTimeMessage = getStringForLastTime(lastTime, new Date());
  const shouldRest = !shouldIncludeGroupInWorkout(settings, group, activityLog);

  if (shouldRest) {
    lastTimeMessage += " (currently resting)";
  }

  return (
    <div className="bg-sky-900 my-2 p-1">
      <div className="flex justify-between items-center">
        <div className="font-bold text-lg">
          <input
            type="checkbox"
            checked={group.active ?? true}
            onChange={toggleActive}
            className="ml-2 mr-4 cursor-pointer"
            disabled={shouldRest}
          />
          <input
            value={group.name}
            onChange={(e) => renameGroup(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.target as HTMLInputElement).blur()
            }
            className="bg-transparent p-1 text-sky-50 w-44"
            ref={groupNameRef}
            placeholder="Exercise Group Name"
          />
        </div>
        <div
          className="text-sky-300 mr-3 cursor-pointer select-none"
          onClick={removeGroup}
        >
          Remove Group
        </div>
      </div>
      <div className="text-gray-400 text-sm ml-2">{`Last Time: ${lastTimeMessage}`}</div>
      {group.exercises.map((exercise, i) => (
        <ExerciseInfoRow
          key={exercise.identifier}
          group={group}
          exercise={exercise}
          nameRef={
            i === group.exercises.length - 1 ? newExerciseNameRef : undefined
          }
        />
      ))}
      <AddExerciseButton
        group={group}
        newExerciseNameRef={newExerciseNameRef}
      />
    </div>
  );
}

function AddExerciseGroupButton({
  newGroupNameRef,
}: {
  newGroupNameRef: React.RefObject<HTMLInputElement | null> | undefined;
}) {
  const [settings, setSettings] = useSettings();

  function addGroup() {
    const newIdentifier = getNewIdentifier();
    settings.exerciseGroups.push({
      identifier: newIdentifier,
      name: "",
      exercises: [],
      active: true,
    });
    setSettings(settings);
    setTimeout(() => {
      newGroupNameRef?.current?.focus();
    }, 0);
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={addGroup}
        className="m-2 cursor-pointer bg-gray-800 py-1 px-2 rounded hover:bg-gray-900 transition duration-300 text-sky-50 select-none"
      >
        Add Exercise Group
      </button>
    </div>
  );
}

function RestoreDefaultsButton() {
  const [_, setSettings] = useSettings();

  function restoreDefaults() {
    setSettings(defaultSettings);
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={restoreDefaults}
        className="m-2 cursor-pointer bg-gray-800 py-1 px-2 rounded hover:bg-gray-900 transition duration-300 text-sky-50 select-none"
      >
        Restore Defaults
      </button>
    </div>
  );
}

function ExerciseInfoRow({
  group,
  exercise,
  nameRef,
}: {
  group: ExerciseGroup;
  exercise: Exercise;
  nameRef: React.RefObject<HTMLInputElement | null> | undefined;
}) {
  const [settings, setSettings] = useSettings();

  function renameExercise(newName: string) {
    const foundExercise = findExercise(
      settings.exerciseGroups,
      exercise.identifier
    )!;
    foundExercise.name = newName;
    setSettings(settings);
  }

  function removeExercise() {
    const foundGroup = settings.exerciseGroups.find(
      (g) => g.identifier === group.identifier
    )!;
    foundGroup.exercises = foundGroup.exercises.filter(
      (e) => e.identifier !== exercise.identifier
    );
    setSettings(settings);
  }

  return (
    <div
      className={`${
        settings.showExtraSettings ? "bg-sky-950 rounded my-2" : ""
      }`}
    >
      <div className={`flex justify-between items-center`}>
        <input
          value={exercise.name}
          onChange={(e) => renameExercise(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.target as HTMLInputElement).blur()
          }
          className={`bg-transparent ml-2 py-1 text-sky-50 w-64 ${
            settings.showExtraSettings ? "font-bold" : ""
          }`}
          ref={nameRef}
          placeholder="Exercise Name"
        />
        <div
          className="p-1 hover:underline cursor-pointer text-sky-300 mr-2 select-none"
          onClick={removeExercise}
        >
          Remove
        </div>
      </div>
      {settings.showExtraSettings ? (
        <ExerciseExtraSettings exercise={exercise} />
      ) : null}
    </div>
  );
}

function ExerciseExtraSettings({ exercise }: { exercise: Exercise }) {
  const [settings, setSettings] = useSettings();

  function updateDurationOverride(newValue: string) {
    const foundExercise = findExercise(
      settings.exerciseGroups,
      exercise.identifier
    )!;
    foundExercise.durationOverride = newValue;
    setSettings(settings);
  }

  const hasValidOverride = getOverriddenExerciseDuration(
    exercise,
    settings
  ).overrideIsValid;

  function updateIsPrimary(newValue: boolean) {
    const foundExercise = findExercise(
      settings.exerciseGroups,
      exercise.identifier
    )!;
    foundExercise.isPrimary = newValue;
    setSettings(settings);
  }

  return (
    <div>
      <div className="flex items-center ml-2">
        <label className="w-44 text-sky-50">Is Primary:</label>
        <input
          type="checkbox"
          checked={exercise.isPrimary}
          onChange={(e) => updateIsPrimary(e.target.checked)}
          className={``}
        />
      </div>
      <div className="flex items-center ml-2">
        <label className="w-44 text-sky-50">Duration Override:</label>
        <input
          value={exercise.durationOverride}
          onChange={(e) => updateDurationOverride(e.target.value)}
          className={`max-w-24 text-sky-50 flex-1 bg-transparent rounded px-2 py-1 focus:outline-none appearance-none ${
            hasValidOverride ? "" : "bg-red-800"
          }`}
        />
      </div>
    </div>
  );
}

function AddExerciseButton({
  group,
  newExerciseNameRef,
}: {
  group: ExerciseGroup;
  newExerciseNameRef: React.RefObject<HTMLInputElement | null> | undefined;
}) {
  const [settings, setSettings] = useSettings();

  function addExercise() {
    const foundGroup = settings.exerciseGroups.find(
      (g) => g.identifier === group.identifier
    )!;
    foundGroup.exercises.push({
      identifier: getNewIdentifier(),
      name: "",
      durationOverride: "+0",
      isPrimary: false,
    });
    setSettings(settings);
    setTimeout(() => {
      newExerciseNameRef?.current?.focus();
    }, 0);
  }

  return (
    <div className="px-4 mt-2">
      <button
        onClick={addExercise}
        className="cursor-pointer bg-gray-800 py-1 px-2 rounded hover:bg-gray-900 transition duration-300 text-sky-50 select-none"
      >
        Add Exercise
      </button>
    </div>
  );
}

function getNewIdentifier() {
  return Math.random().toString().substring(2);
}

function findExercise(groups: ExerciseGroup[], identifier: string) {
  for (const group of groups) {
    for (const exercise of group.exercises) {
      if (exercise.identifier === identifier) {
        return exercise;
      }
    }
  }
  return null;
}
