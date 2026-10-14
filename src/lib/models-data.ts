// Import JSON data files
import objectsData from "../models/objects.json";
import pedsData from "../models/peds.json";
import vehiclesData from "../models/vehicles.json";
import weaponsData from "../models/weapons.json";

export const explosionsList = [
  { value: 0, label: "Grenade" },
  { value: 1, label: "Grenade Launcher" },
  { value: 2, label: "Sticky Bomb" },
  { value: 3, label: "Molotov" },
  { value: 4, label: "Rocket" },
  { value: 5, label: "TankShell" },
  { value: 6, label: "Hi_Octane" },
  { value: 7, label: "Car" },
  { value: 8, label: "Plane" },
  { value: 9, label: "PetrolPump" },
  { value: 10, label: "Bike" },
  { value: 11, label: "Dir_Steam" },
  { value: 12, label: "Dir_Flame" },
  { value: 13, label: "Dir_Water_Hydrant" },
  { value: 14, label: "Dir_Gas_Canister" },
  { value: 15, label: "Boat" },
  { value: 16, label: "Ship_Destroy" },
  { value: 17, label: "Truck" },
  { value: 18, label: "Bullet" },
  { value: 19, label: "SmokeGrenadeLauncher" },
  { value: 20, label: "SmokeGrenade" },
  { value: 21, label: "BZGAS" },
  { value: 22, label: "Flare" },
  { value: 23, label: "Gas_Canister" },
  { value: 24, label: "Extinguisher" },
  { value: 25, label: "Programmablear" },
  { value: 26, label: "Train" },
  { value: 27, label: "Barrel" },
  { value: 28, label: "PROPANE" },
  { value: 29, label: "Blimp" },
  { value: 30, label: "Dir_Flame_Explode" },
  { value: 31, label: "Tanker" },
  { value: 32, label: "PlaneRocket" },
  { value: 33, label: "VehicleBullet" },
  { value: 34, label: "Gas_Tank" },
  { value: 35, label: "EXP_TAG_BIRD_CRAP" },
  { value: 36, label: "EXP_TAG_RAILGUN" },
  { value: 37, label: "EXP_TAG_BLIMP2" },
  { value: 38, label: "EXP_TAG_FIREWORK" },
  { value: 39, label: "EXP_TAG_SNOWBALL" },
  { value: 40, label: "EXP_TAG_PROXMINE" },
  { value: 41, label: "EXP_TAG_VALKYRIE_CANNON" },
  { value: 42, label: "EXP_TAG_AIR_DEFENCE" },
  { value: 43, label: "EXP_TAG_PIPEBOMB" },
  { value: 44, label: "EXP_TAG_VEHICLEMINE" },
  { value: 45, label: "EXP_TAG_EXPLOSIVEAMMO" },
  { value: 46, label: "EXP_TAG_APCSHELL" },
  { value: 47, label: "EXP_TAG_BOMB_CLUSTER" },
  { value: 48, label: "EXP_TAG_BOMB_GAS" },
  { value: 49, label: "EXP_TAG_BOMB_INCENDIARY" },
  { value: 50, label: "EXP_TAG_BOMB_STANDARD" },
  { value: 51, label: "EXP_TAG_TORPEDO" },
  { value: 52, label: "EXP_TAG_TORPEDO_UNDERWATER" },
  { value: 53, label: "EXP_TAG_BOMBUSHKA_CANNON" },
  { value: 54, label: "EXP_TAG_BOMB_CLUSTER_SECONDARY" },
  { value: 55, label: "EXP_TAG_HUNTER_BARRAGE" },
  { value: 56, label: "EXP_TAG_HUNTER_CANNON" },
  { value: 57, label: "EXP_TAG_ROGUE_CANNON" },
  { value: 58, label: "EXP_TAG_MINE_UNDERWATER" },
  { value: 59, label: "EXP_TAG_ORBITAL_CANNON" },
  { value: 60, label: "EXP_TAG_BOMB_STANDARD_WIDE" },
  { value: 61, label: "EXP_TAG_EXPLOSIVEAMMO_SHOTGUN" },
  { value: 62, label: "EXP_TAG_OPPRESSOR2_CANNON" },
  { value: 63, label: "EXP_TAG_MORTAR_KINETIC" },
  { value: 64, label: "EXP_TAG_VEHICLEMINE_KINETIC" },
  { value: 65, label: "EXP_TAG_VEHICLEMINE_EMP" },
  { value: 66, label: "EXP_TAG_VEHICLEMINE_SPIKE" },
  { value: 67, label: "EXP_TAG_VEHICLEMINE_SLICK" },
  { value: 68, label: "EXP_TAG_VEHICLEMINE_TAR" },
  { value: 69, label: "EXP_TAG_SCRIPT_DRONE" },
  { value: 70, label: "EXP_TAG_RAYGUN" },
  { value: 71, label: "EXP_TAG_BURIEDMINE" },
  { value: 72, label: "EXP_TAG_SCRIPT_MISSILE" },
  { value: 73, label: "EXP_TAG_RCTANK_ROCKET" },
  { value: 74, label: "EXP_TAG_BOMB_WATER" },
  { value: 75, label: "EXP_TAG_BOMB_WATER_SECONDARY" },
  { value: 76, label: "_0xF728C4A9" },
  { value: 77, label: "_0xBAEC056F" },
  { value: 78, label: "EXP_TAG_FLASHGRENADE" },
  { value: 79, label: "EXP_TAG_STUNGRENADE" },
  { value: 80, label: "_0x763D3B3B" },
  { value: 81, label: "EXP_TAG_SCRIPT_MISSILE_LARGE" },
  { value: 82, label: "EXP_TAG_SUBMARINE_BIG" },
  { value: 83, label: "EMPLAUNCHER_EMP" },
];

// Model types
export type ModelType = "vehicle" | "ped" | "weapon" | "object" | "explosion";

export interface Model {
  name: string;
  hash: string | number; // number for explosions, string for others
  type: ModelType;
}

// Convert JSON object to Model array
const convertToModelArray = (
  data: Record<string, string>,
  type: ModelType
): Model[] => {
  return Object.entries(data).map(([name, hash]) => ({
    name: name.toLowerCase(),
    hash: hash,
    type,
  }));
};

// Convert explosions list to Model array
const convertExplosionsToModelArray = (): Model[] => {
  return explosionsList.map((explosion: { value: number; label: string }) => ({
    name: explosion.label.toLowerCase().replace(/\s+/g, '_'),
    hash: explosion.value,
    type: "explosion" as ModelType,
  }));
};

// Parse all data
export const VEHICLE_DATA: Model[] = convertToModelArray(
  vehiclesData as Record<string, string>,
  "vehicle"
);
export const PED_DATA: Model[] = convertToModelArray(pedsData as Record<string, string>, "ped");
export const WEAPON_DATA: Model[] = convertToModelArray(weaponsData as Record<string, string>, "weapon");
export const OBJECT_DATA: Model[] = convertToModelArray(objectsData as Record<string, string>, "object");
export const EXPLOSION_DATA: Model[] = convertExplosionsToModelArray();

// Combined data
export const getAllModels = (): Model[] => {
  return [...VEHICLE_DATA, ...PED_DATA, ...WEAPON_DATA, ...OBJECT_DATA, ...EXPLOSION_DATA];
};

// Get models by type
export const getModelsByType = (type: ModelType): Model[] => {
  switch (type) {
    case "vehicle":
      return VEHICLE_DATA;
    case "ped":
      return PED_DATA;
    case "weapon":
      return WEAPON_DATA;
    case "object":
      return OBJECT_DATA;
    case "explosion":
      return EXPLOSION_DATA;
    default:
      return [];
  }
};

// Search models with optional type filter
export const searchModels = (query: string, type?: ModelType): Model[] => {
  const data = type ? getModelsByType(type) : getAllModels();
  const searchTerm = query.toLowerCase();

  return data.filter(
    (model) => {
      const nameMatch = model.name.includes(searchTerm);
      const hashMatch = typeof model.hash === 'number' 
        ? model.hash.toString().includes(searchTerm)
        : model.hash.toLowerCase().includes(searchTerm);
      return nameMatch || hashMatch;
    }
  );
};

// Get model by hash
export const getModelByHash = (hash: string): Model | undefined => {
  return getAllModels().find((model) => {
    if (typeof model.hash === 'number') {
      return model.hash.toString() === hash || model.hash === parseInt(hash);
    }
    return model.hash.toLowerCase() === hash.toLowerCase();
  });
};

// Get model by name
export const getModelByName = (name: string): Model | undefined => {
  return getAllModels().find((model) => model.name.toLowerCase() === name.toLowerCase());
};
