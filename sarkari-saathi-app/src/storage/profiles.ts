import AsyncStorage from "@react-native-async-storage/async-storage";
import { GENDER_OPTIONS } from "../constants";
import { Profile, SavedProfile } from "../types";

const KEY = "sarkari-saathi:profiles";
const MAX_PROFILES = 4;

function labelForProfile(profile: Profile): string {
  const genderLabel =
    GENDER_OPTIONS.find((o) => o.value === profile.gender)?.label ?? profile.gender;
  return `${profile.age}, ${genderLabel}, ${profile.state}`;
}

async function readAll(): Promise<SavedProfile[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as SavedProfile[]) : [];
}

async function writeAll(profiles: SavedProfile[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(profiles));
}

export async function listProfiles(): Promise<SavedProfile[]> {
  return readAll();
}

export async function getProfile(id: string): Promise<SavedProfile | null> {
  const all = await readAll();
  return all.find((p) => p.id === id) ?? null;
}

export async function saveProfile(
  profile: Profile,
  name: string,
  id?: string
): Promise<SavedProfile> {
  const all = await readAll();
  const label = labelForProfile(profile);

  if (id) {
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Profile not found");
    const updated: SavedProfile = { id, name, label, profile };
    all[index] = updated;
    await writeAll(all);
    return updated;
  }

  if (all.length >= MAX_PROFILES) {
    throw new Error(`You can only save up to ${MAX_PROFILES} profiles`);
  }
  const created: SavedProfile = { id: String(Date.now()), name, label, profile };
  await writeAll([...all, created]);
  return created;
}

export async function deleteProfile(id: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((p) => p.id !== id));
}

export const MAX_SAVED_PROFILES = MAX_PROFILES;
