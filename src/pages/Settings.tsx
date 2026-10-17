import {
  Shield, Server, Network, Target, Webhook, Car, Bomb, Cpu, RotateCcw, Search, Check, Swords, ShieldCheck, ShieldAlert, Settings as SettingsIcon, Info, Globe, Layers, UserCheck, Sliders, Share2, Copy, Sparkles, X, Download, Upload, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { apiMutationHeaders, apiUrl, ensureCsrfCookie } from "@/lib/api-base";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// =========================================================================
// Types
// =========================================================================

export interface AnticheatOption {
  id: string;
  name: string;
  enabled: boolean;
  action: 'ban' | 'kick' | 'logs';
  log?: boolean;
  l1?: boolean;
  l2?: boolean;
  l3?: boolean;
}

// =========================================================================
// Tooltips & Explanations Map
// =========================================================================

const OPTION_TOOLTIPS: Record<string, string> = {
  // Player Movement & State
  'Anti Noclip': 'Prevents players from flying through walls and solid collision objects.',
  'Anti Noclip2': 'Advanced velocity-based flight and clip detection algorithm.',
  'Anti Noclip3': 'Detects entity coordinate tampering during high-speed movement.',
  'Anti Noclip4': 'Blocks unauthorized zero-gravity vertical vector offsets.',
  'Anti Noclip5': 'Heuristic detection for stealth noclip and camera detachment.',
  'Anti Bebetter Noclip': 'Counters Bebetter cheat menu noclip patterns.',
  'Anti Parachute Noclip': 'Prevents noclip flight activated while deploying a parachute.',
  'Anti Force Fall': 'Blocks forced skydiving and air displacement exploits.',
  'Armour Detection': 'Monitors unnatural armour stat spikes and instant refills.',
  'Anti invisible': 'Detects hidden player ped models and zero-alpha rendering.',
  'Anti invisible2': 'Prevents entity transparency and client visibility spoofing.',
  'Anti Teleport': 'Detects instant distance displacement across the map.',
  'Anti Teleport2': 'Blocks coordinate warping between server updates.',
  'Anti Speedhack': 'Prevents movement speed multipliers and accelerated locomotion.',
  'Anti Fast Run': 'Counters modified locomotion animations and sprint speed hacks.',
  'Anti SuperJump': 'Blocks modified jump height and gravity velocity hacks.',
  'Anti SuperJump2': 'Counters air-jump and secondary jump impulse exploits.',
  'Anti Night/ThermalVision': 'Prevents unauthorized night vision or thermal vision toggle.',
  'Anti Infinite Stamina': 'Monitors sprint stamina drain to block infinite run cheats.',
  'Anti Spectate': 'Blocks unauthorized camera spectating of other players.',
  'Anti Look Around': 'Detects free look camera detachment hacks.',
  'Anti Freecam': 'Blocks out-of-body spectator camera cheats and noclip spectating.',
  'Anti Freecam2': 'Secondary raycast check for detached camera controllers.',
  'Anti Freecam3': 'Detects drone and freecam injection overlays.',
  'Anti Freecam #4': 'Advanced camera vector translation and coordinate desync detection.',
  'Anti Freecam #5': 'Heuristic camera orientation and rendering buffer detector.',
  'Anti Freecam #6': 'Deep memory pointer and detached viewport security scan.',
  'Anti Block Input': 'Counters malicious client input suppression scripts.',
  'Anti LUA Input': 'Blocks injected Lua input stream commands.',
  'Anti Player Blips': 'Blocks unauthorized global player radar blip rendering.',
  'Anti Spoof Name': 'Prevents player display name spoofing and nickname impersonation.',
  'Anti OCR': 'Detects screen OCR menu scanning and cheat overlays.',
  'Anti Fling': 'Counters high-velocity entity collision fling attacks.',

  // Game & World Interaction / Combat
  'Anti Crash': 'Intercepts invalid crash vehicles, particle cascades, and malicious server payloads.',
  'Anti Super Punch': 'Prevents melee damage multipliers and instant kill punches.',
  'Anti Model Changer': 'Blocks unauthorized ped model morphing and giant/tiny peds.',
  'Anti Ped Scale': 'Prevents ped bone scale manipulation and hitbox scaling.',
  'Anti Camera Rotation': 'Counters camera angle lock and forced spin exploits.',
  'Anti Rape Player': 'Blocks malicious sync animation harassment exploits.',
  'Anti Player Harassment': 'Prevents persistent player collision and animation trolling.',
  'Anti Lua Freeze': 'Counters client thread freezing and event blocking.',
  'Anti Player On Fire': 'Blocks malicious remote igniting of player entities.',
  'Anti Freeze Player': 'Prevents remote player freeze command execution.',
  'Anti Ragdoll Abuse': 'Blocks continuous forced ragdoll triggering.',
  'Anti Task Clear Loop': 'Detects rapid ped task clearing loops.',
  'Anti Animation Injection': 'Blocks unauthorized client animation playing.',
  'Anti Player Attach': 'Prevents attaching entities or peds onto other players.',
  'Anti Player Collision Disable': 'Prevents disabling player collision vectors.',
  'Anti Infinite Roll': 'Blocks combat roll cooldown bypass hacks.',
  'Anti Heal Spam': 'Prevents rapid health pack or event healing spam.',
  'Anti Godmode': 'Prevents health invulnerability, damage immunity, and health refill hacks.',
  'Anti Npc Hijack': 'Blocks unauthorized taking control of NPC peds.',
  'Anti Solo Session': 'Detects forced desync into solo network sessions.',
  'Anti Clear Tasks': 'Prevents clearing ped animations and arrest tasks.',
  'Anti Aggresive Peds': 'Prevents spawning aggressive combat NPC peds.',
  'Blacklisted Particles': 'Blocks crash particles and lag fireworks.',
  'Anti Object Spawn': 'Validates generic object creation requests against allowed scripts/models.',
  'Anti Attach Object to Player': 'Kicks or punishes unauthorized prop attachments onto players.',
  'Anti Unauthorized Entity Spawn': 'Blocks entity creations outside framework whitelist.',
  'Anti Kill': 'Detects forced player health zeroing.',
  'Anti Kill2': 'Secondary death event validation and health modification check.',
  'Anti Kill All': 'Blocks mass server kill commands.',
  'Anti Taze': 'Prevents stun gun spam and impossible distance taze attacks.',

  // Weapons, Ammo & Aim
  'Anti Spawn Weapon': 'Blocks client-side weapon spawning and weapon inventory injection.',
  'Anti Spawn Weapon2': 'Secondary hash check against server weapon list.',
  'Anti Spawn Weapon3': 'Validates weapon equip calls against server weapon table.',
  'Anti Spoofed Damage/Weapon': 'Validates weapon shot origin and source entity.',
  'Anti Shoot Without Weapon': 'Blocks firing bullets without a weapon in hand.',
  'Anti NoRecoil': 'Detects zero recoil pitch/yaw weapon recoil hacks.',
  'Anti NoReload': 'Blocks firing weapons past max magazine capacity without reload.',
  'Anti Explosion Bullet': 'Prevents ammo modifier explosion impact bullets.',
  'Anti Explosion Bullet2': 'Secondary impact particle check for explosive ammo.',
  'Anti Infinite Ammo': 'Prevents ammo count freezing and infinite clip hacks.',
  'Anti Give Money': 'Blocks client-side money injection and event triggering.',
  'Anti Kill Punch': 'Counters one-hit melee kills.',
  'Anti Weapon Damage Changer': 'Blocks custom weapon damage value overrides.',
  'Anti Blacklisted Weapon': 'Instantly removes and punishes blacklisted weapon usage.',
  'Anti Aim Bot': 'Counters automatic target lock, aimbot injection, and aim assistance.',
  'Anti Silent Aim': 'Detects bullet trajectory vector redirection to targets.',
  'Anti Overlay': 'Detects cheat drawing overlays, ESP text, and crosshair injections.',
    'Anti Cheat Overlay2': 'Detects cheat drawing overlays, ESP text, and crosshair injections.',
  'Anti Menu Texture': 'Blocks external UI menu textures and render target hooks.',
  'Anti Damage Changer': 'Blocks modified bullet damage multipliers.',
  'Anti Fast Shoot': 'Monitors rapid fire rates exceeding maximum weapon RPM.',
  'Anti Recoil Manip': 'Deep detection for partial weapon recoil softening scripts.',
  'Anti Hitbox Manip': 'Prevents player ped collision hitbox inflation and bullet magnetism.',
  'Anti No Headshot': 'Blocks disabling headshot critical damage multipliers.',
  'Anti Pickup Collection': 'Prevents teleporting and vacuuming weapon/item pickups across the map.',

  // Vehicles & Entities
  'Anti Carry Vehicle': 'Prevents picking up or moving vehicles improperly.',
  'Anti Throw Vehicle': 'Detects vehicle velocity throwing and physics attacks.',
  'Anti Boost vehicle': 'Blocks unauthorized vehicle speed boost hacks.',
  'Anti Vehicle Spam': 'Prevents mass vehicle spawning and entity floods.',
  'Anti Bring Vehicle': 'Blocks teleporting vehicles directly to player location.',
  'Anti Bring All Vehicles': 'Counters pulling all map vehicles to one spot.',
  'Anti Repair Vehicle': 'Blocks instant vehicle health repair hacks.',
  'Anti Delete Vehicle': 'Prevents deleting other players vehicles.',
  'Anti Bug Vehicle': 'Blocks vehicle physics glitches and collision bugs.',
  'Anti Spawn Vehicle/Entity': 'Validates vehicle spawn requests.',
  'Anti Spawn Entity': 'Validates generic entity creation calls.',
  'Anti Vehicle Weapon': 'Blocks mounted vehicle weapon firing unless authorized.',
  'Anti Plate Changer': 'Prevents unauthorized vehicle license plate modification.',
  'Anti Launch/Fly Vehicle': 'Detects airborne vehicle velocity boosts and flying car hacks.',
  'Anti Car Speed Hack': 'Blocks vehicle engine torque and top-speed multipliers.',
  'Anti Entity Manipulation': 'Prevents remote entity position, model, or owner modification.',
  'Anti Clone Player': 'Blocks cloning player ped entities to desync network sessions.',
  'Anti Vehicle Mod Abuse': 'Prevents instant max-upgrading vehicle performance stats.',
  'Anti Spawn Ped': 'Blocks unauthorized ped creation and ped mass spawning.',
  'Anti Blacklisted Vehicle': 'Instantly removes and punishes blacklisted vehicle spawns.',
  'Anti Blacklisted Ped': 'Blocks spawning blacklisted ped models.',

  // Explosions
  'Anti Ai Explosion': 'Blocks AI-triggered and ped-attributed explosion events.',
  'Anti Explosion': 'Validates and filters explosion creation calls.',
  'Anti Silent Explosion': 'Detects silent, inaudible explosion triggers.',
  'Anti Phone Explosion': 'Prevents remote phone bomb explosion triggers.',
  'Anti Invisible Explosion': 'Prevents invisible explosion particle triggers.',
  'Anti Inaudible Explosion': 'Detects inaudible audio tag explosion attempts.',

  // Network, Events, Cheat Menus & Advanced Hooks
  'Anti Cipher': 'Detects Cipher obfuscated script injections.',
  'Anti Spoof': 'Prevents network packet spoofing and client state lying.',
  'Anti Vpn': 'Blocks connections originating from proxy servers and VPN IP ranges.',
  'Anti Afk': 'Monitors player idle time and kicks inactive players.',
  'Anti Stop Resource': 'Prevents clients or unauthorized resources from stopping scripts.',
  'Anti Unknown Resource': 'Blocks unlisted dynamic resources from starting.',
  'Anti Spam Trigger': 'Limits trigger event frequency per second.',
  'Anti Trigger Event': 'Filters unauthorized remote event invocations.',
  'blacklisted Trigger': 'Blocks execution of known blacklisted server events.',
  'Anti Event Token Bypass': 'Prevents forging or bypassing server event security tokens.',
  'Anti Resource Injection': 'Blocks dynamic resource registration and execution.',
  'Anti Voice Exploits': 'Prevents voice frequency overloading and audio exploits.',
  'Anti Global Voice': 'Blocks forcing broadcast voice channels to all players.',
  'Anti Inventory Exploit': 'Prevents remote inventory item dupe and modification events.',
  'Cheat Ai Detection': 'Heuristic detection for AI cheat automation and macros.',
  'Anti Lua Menu': 'Detects and blocks client-side execution of Lua cheat menus.',
  'Anti NUI Blocker': 'Prevents NUI focus hijacking and overlay blocking.',
  'Anti DevTools': 'Prevents browser DevTools injection and runtime debugging.',
  'Anti Cheat Menu': 'Detects active cheat menu memory signatures.',
  'Anti Cheat Menu Functions': 'Blocks cheat menu hook functions.',
  'Anti Cheat Spawn Functions': 'Blocks menu-based entity spawn helper functions.',
  'Anti Cheat Teleport Functions': 'Prevents cheat menu position modification calls.',
  'Anti Cheat Weapon Functions': 'Blocks cheat menu weapon give/remove functions.',
  'Anti Cheat Vehicle Functions': 'Blocks cheat menu vehicle control hooks.',
  'Anti Cheat Ped Functions': 'Blocks cheat menu ped modification functions.',
  'Anti Cheat Object Functions': 'Blocks cheat menu object manipulation helpers.',
  'Anti Lua Executor': 'Blocks client-side Lua code execution.',
  'Anti AC Scanner': 'Counters anticheat scanner bypass tools.',
  'Anti Unauthorized Admin': 'Blocks fake admin menu permission spoofing.',
  'Anti Bytecode Injection': 'Detects pre-compiled Lua bytecode injection.',
  'Anti Global Function Hook': 'Prevents hooking core GTA/FiveM global functions.',
  'Anti Native Hook': 'Blocks native function pointer hooks.',
  'Anti Loadstring': 'Prevents dynamic string execution via loadstring.',
  'Anti Citizen.Invoke Abuse': 'Blocks unauthorized low-level Citizen.Invoke calls.',
  'Anti Export Hijack': 'Prevents overriding resource export definitions.',
  'Anti Shared Object Override': 'Blocks replacing shared ESX/QBCore framework objects.',
  'Anti Resource Rename Bypass': 'Prevents bypassing checks by renaming resource folder.',
  'Anti Cheat Explosion Functions': 'Blocks cheat menu explosion trigger functions.',
  'Anti Cheat Spectate': 'Blocks cheat menu player spectate modes.',
  'Anti Cheat Force Functions': 'Prevents forced ped task overrides from cheat menus.',
  'Anti Cheat Clone Functions': 'Blocks cheat menu ped cloning functions.',
  'Anti Cheat Cage Functions': 'Prevents cheat menu player trapping/caging functions.',
  'Anti Cheat Inventory Exploit': 'Blocks cheat menu inventory tampering functions.',
  'Anti cheat Menu': 'Detects legacy cheat menu variations.',
  'Anti cheat Menu Functions': 'Blocks secondary cheat menu hooks.',
  'Anti cheat API Functions': 'Intercepts unauthorized FiveM cheat API calls.',
  'Anti cheat Spectate': 'Secondary spectator mode detector.',
  'Anti cheat Bypass Functions': 'Blocks known anticheat bypass and token evasion hooks.',
};

// =========================================================================
// Default Protections Arrays
// =========================================================================

const defaultPlayerOptions: AnticheatOption[] = [
  { id: 'Anti Noclip', name: 'Anti Noclip', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Noclip2', name: 'Anti Noclip2', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Noclip3', name: 'Anti Noclip3', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Noclip4', name: 'Anti Noclip4', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Noclip5', name: 'Anti Noclip5', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Bebetter Noclip', name: 'Anti Bebetter Noclip', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Parachute Noclip', name: 'Anti Parachute Noclip', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Force Fall', name: 'Anti Force Fall', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Armour Detection', name: 'Armour Detection', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti invisible', name: 'Anti invisible', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti invisible2', name: 'Anti invisible2', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Teleport', name: 'Anti Teleport', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Teleport2', name: 'Anti Teleport2', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Speedhack', name: 'Anti Speedhack', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Fast Run', name: 'Anti Fast Run', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti SuperJump', name: 'Anti SuperJump', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti SuperJump2', name: 'Anti SuperJump2', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Night/ThermalVision', name: 'Anti Night/ThermalVision', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Infinite Stamina', name: 'Anti Infinite Stamina', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Spectate', name: 'Anti Spectate', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Look Around', name: 'Anti Look Around', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Freecam', name: 'Anti Freecam', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Freecam2', name: 'Anti Freecam2', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Freecam3', name: 'Anti Freecam3', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Freecam #4', name: 'Anti Freecam #4', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Freecam #5', name: 'Anti Freecam #5', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Freecam #6', name: 'Anti Freecam #6', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Block Input', name: 'Anti Block Input', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti LUA Input', name: 'Anti LUA Input', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Player Blips', name: 'Anti Player Blips', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Spoof Name', name: 'Anti Spoof Name', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti OCR', name: 'Anti OCR', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Fling', name: 'Anti Fling', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
];

const defaultGameOptions: AnticheatOption[] = [
  { id: 'Anti Crash', name: 'Anti Crash', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Super Punch', name: 'Anti Super Punch', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Model Changer', name: 'Anti Model Changer', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Ped Scale', name: 'Anti Ped Scale', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Camera Rotation', name: 'Anti Camera Rotation', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Rape Player', name: 'Anti Rape Player', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Player Harassment', name: 'Anti Player Harassment', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Lua Freeze', name: 'Anti Lua Freeze', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Player On Fire', name: 'Anti Player On Fire', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Freeze Player', name: 'Anti Freeze Player', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Ragdoll Abuse', name: 'Anti Ragdoll Abuse', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Task Clear Loop', name: 'Anti Task Clear Loop', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Animation Injection', name: 'Anti Animation Injection', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Player Attach', name: 'Anti Player Attach', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Player Collision Disable', name: 'Anti Player Collision Disable', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Infinite Roll', name: 'Anti Infinite Roll', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Heal Spam', name: 'Anti Heal Spam', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Godmode', name: 'Anti Godmode', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Npc Hijack', name: 'Anti Npc Hijack', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Solo Session', name: 'Anti Solo Session', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Clear Tasks', name: 'Anti Clear Tasks', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Aggresive Peds', name: 'Anti Aggresive Peds', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Blacklisted Particles', name: 'Blacklisted Particles', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Object Spawn', name: 'Anti Object Spawn', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Attach Object to Player', name: 'Anti Attach Object to Player', enabled: true, action: 'kick', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Unauthorized Entity Spawn', name: 'Anti Unauthorized Entity Spawn', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Kill', name: 'Anti Kill', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Kill2', name: 'Anti Kill2', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Kill All', name: 'Anti Kill All', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Taze', name: 'Anti Taze', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
];

const defaultWeaponOptions: AnticheatOption[] = [
  { id: 'Anti Spawn Weapon', name: 'Anti Spawn Weapon', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Spawn Weapon2', name: 'Anti Spawn Weapon2', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Spawn Weapon3', name: 'Anti Spawn Weapon3', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Spoofed Damage/Weapon', name: 'Anti Spoofed Damage/Weapon', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Shoot Without Weapon', name: 'Anti Shoot Without Weapon', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti NoRecoil', name: 'Anti NoRecoil', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti NoReload', name: 'Anti NoReload', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Explosion Bullet', name: 'Anti Explosion Bullet', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Explosion Bullet2', name: 'Anti Explosion Bullet2', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Infinite Ammo', name: 'Anti Infinite Ammo', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Give Money', name: 'Anti Give Money', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Kill Punch', name: 'Anti Kill Punch', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Weapon Damage Changer', name: 'Anti Weapon Damage Changer', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Blacklisted Weapon', name: 'Anti Blacklisted Weapon', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Aim Bot', name: 'Anti Aim Bot', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Silent Aim', name: 'Anti Silent Aim', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Overlay', name: 'Anti Overlay', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Menu Texture', name: 'Anti Menu Texture', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Damage Changer', name: 'Anti Damage Changer', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Fast Shoot', name: 'Anti Fast Shoot', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Recoil Manip', name: 'Anti Recoil Manip', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Hitbox Manip', name: 'Anti Hitbox Manip', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti No Headshot', name: 'Anti No Headshot', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Pickup Collection', name: 'Anti Pickup Collection', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
];

const defaultVehicleOptions: AnticheatOption[] = [
  { id: 'Anti Carry Vehicle', name: 'Anti Carry Vehicle', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Throw Vehicle', name: 'Anti Throw Vehicle', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Boost vehicle', name: 'Anti Boost vehicle', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Vehicle Spam', name: 'Anti Vehicle Spam', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Bring Vehicle', name: 'Anti Bring Vehicle', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Bring All Vehicles', name: 'Anti Bring All Vehicles', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Repair Vehicle', name: 'Anti Repair Vehicle', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Delete Vehicle', name: 'Anti Delete Vehicle', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Bug Vehicle', name: 'Anti Bug Vehicle', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Spawn Vehicle/Entity', name: 'Anti Spawn Vehicle/Entity', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Spawn Entity', name: 'Anti Spawn Entity', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Vehicle Weapon', name: 'Anti Vehicle Weapon', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Plate Changer', name: 'Anti Plate Changer', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Launch/Fly Vehicle', name: 'Anti Launch/Fly Vehicle', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Car Speed Hack', name: 'Anti Car Speed Hack', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Entity Manipulation', name: 'Anti Entity Manipulation', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Clone Player', name: 'Anti Clone Player', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Vehicle Mod Abuse', name: 'Anti Vehicle Mod Abuse', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Spawn Ped', name: 'Anti Spawn Ped', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Blacklisted Vehicle', name: 'Anti Blacklisted Vehicle', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Blacklisted Ped', name: 'Anti Blacklisted Ped', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
];

const defaultExplosionOptions: AnticheatOption[] = [
  { id: 'Anti Ai Explosion', name: 'Anti Ai Explosion', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Explosion', name: 'Anti Explosion', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Silent Explosion', name: 'Anti Silent Explosion', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Phone Explosion', name: 'Anti Phone Explosion', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Invisible Explosion', name: 'Anti Invisible Explosion', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Inaudible Explosion', name: 'Anti Inaudible Explosion', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
];

const defaultNetworkInjectorOptions: AnticheatOption[] = [
  { id: 'Anti Cipher', name: 'Anti Cipher', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Spoof', name: 'Anti Spoof', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Vpn', name: 'Anti Vpn', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Afk', name: 'Anti Afk', enabled: false, action: 'ban', log: false, l1: false, l2: false, l3: false },
  { id: 'Anti Stop Resource', name: 'Anti Stop Resource', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Unknown Resource', name: 'Anti Unknown Resource', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Spam Trigger', name: 'Anti Spam Trigger', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Trigger Event', name: 'Anti Trigger Event', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'blacklisted Trigger', name: 'blacklisted Trigger', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Event Token Bypass', name: 'Anti Event Token Bypass', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Resource Injection', name: 'Anti Resource Injection', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Voice Exploits', name: 'Anti Voice Exploits', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Global Voice', name: 'Anti Global Voice', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Inventory Exploit', name: 'Anti Inventory Exploit', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Cheat Ai Detection', name: 'Cheat Ai Detection', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Lua Menu', name: 'Anti Lua Menu', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti NUI Blocker', name: 'Anti NUI Blocker', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti DevTools', name: 'Anti DevTools', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Menu', name: 'Anti Cheat Menu', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Menu Functions', name: 'Anti Cheat Menu Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Spawn Functions', name: 'Anti Cheat Spawn Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Teleport Functions', name: 'Anti Cheat Teleport Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Weapon Functions', name: 'Anti Cheat Weapon Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Vehicle Functions', name: 'Anti Cheat Vehicle Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Ped Functions', name: 'Anti Cheat Ped Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Object Functions', name: 'Anti Cheat Object Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Lua Executor', name: 'Anti Lua Executor', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti AC Scanner', name: 'Anti AC Scanner', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Unauthorized Admin', name: 'Anti Unauthorized Admin', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Bytecode Injection', name: 'Anti Bytecode Injection', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Global Function Hook', name: 'Anti Global Function Hook', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Native Hook', name: 'Anti Native Hook', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Loadstring', name: 'Anti Loadstring', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Citizen.Invoke Abuse', name: 'Anti Citizen.Invoke Abuse', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Export Hijack', name: 'Anti Export Hijack', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Shared Object Override', name: 'Anti Shared Object Override', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Resource Rename Bypass', name: 'Anti Resource Rename Bypass', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Explosion Functions', name: 'Anti Cheat Explosion Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Spectate', name: 'Anti Cheat Spectate', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Force Functions', name: 'Anti Cheat Force Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Clone Functions', name: 'Anti Cheat Clone Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Cage Functions', name: 'Anti Cheat Cage Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti Cheat Inventory Exploit', name: 'Anti Cheat Inventory Exploit', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti cheat Menu', name: 'Anti cheat Menu', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti cheat Menu Functions', name: 'Anti cheat Menu Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti cheat API Functions', name: 'Anti cheat API Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti cheat Spectate', name: 'Anti cheat Spectate', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
  { id: 'Anti cheat Bypass Functions', name: 'Anti cheat Bypass Functions', enabled: true, action: 'ban', log: false, l1: true, l2: true, l3: true },
];

export default function Settings() {
  const { toast } = useToast();
  const { serverId } = useParams();

  // State Lists
  const [playerOptions, setPlayerOptions] = useState<AnticheatOption[]>(defaultPlayerOptions);
  const [gameOptions, setGameOptions] = useState<AnticheatOption[]>(defaultGameOptions);
  const [weaponOptions, setWeaponOptions] = useState<AnticheatOption[]>(defaultWeaponOptions);
  const [vehicleOptions, setVehicleOptions] = useState<AnticheatOption[]>(defaultVehicleOptions);
  const [explosionOptions, setExplosionOptions] = useState<AnticheatOption[]>(defaultExplosionOptions);
  const [networkOptions, setNetworkOptions] = useState<AnticheatOption[]>(defaultNetworkInjectorOptions);

  // Server & Pure Mode Params
  const [serverName, setServerName] = useState("Server Name");
  const [discordInvite, setDiscordInvite] = useState("https://discord.gg/serverinvite");
  const [serverLogo, setServerLogo] = useState("");
  const [language, setLanguage] = useState("en");
  const [requireDiscord, setRequireDiscord] = useState(true);
  const [framework, setFramework] = useState("auto");
  const [showAirBanner, setShowAirBanner] = useState(true);
  const [pureModeEnabled, setPureModeEnabled] = useState(false);
  const [pureLevel, setPureLevel] = useState("2");
  const [scriptHookAllowed, setScriptHookAllowed] = useState("0");
  const [filterRequestControl, setFilterRequestControl] = useState("1");
  const [minOnlineSeconds, setMinOnlineSeconds] = useState(4);
  const [requireSteam, setRequireSteam] = useState(false);
  const [logIPInformation, setLogIPInformation] = useState(true);
  const [resourceWhitelistEnabled, setResourceWhitelistEnabled] = useState(true);
  const [resourceWhitelistAction, setResourceWhitelistAction] = useState("flag");

  // Auto Installer Params (Config.AutoInstaller)
  const [autoInstallerEnabled, setAutoInstallerEnabled] = useState(true);
  const [blockMissingInjection, setBlockMissingInjection] = useState(true);
  const [autoRestartOnInstall, setAutoRestartOnInstall] = useState(false);
  const [ignoredResources, setIgnoredResources] = useState<string[]>([
    "_cfx_internal", "VexShield", "oxmysql", "mysql-async", "ghmattimysql",
    "chat", "sessionmanager", "spawnmanager", "baseevents", "hardcap", "rconlog"
  ]);

  // Numerical parameters
  const [maxArmour, setMaxArmour] = useState(100);
  const [maxTeleportDistance, setMaxTeleportDistance] = useState(500);
  const [maxAFKTime, setMaxAFKTime] = useState(300);
  const [maxTazeDistance, setMaxTazeDistance] = useState(10.0);
  const [explosionDistance, setExplosionDistance] = useState(12.0);
  const [giveMoneyMaxIncrease, setGiveMoneyMaxIncrease] = useState(500000000);
  const [giveMoneyCheckInterval, setGiveMoneyCheckInterval] = useState(10000);
  const [injectionChecking, setInjectionChecking] = useState(15000);
  const [cheatEngineChecking, setCheatEngineChecking] = useState(15000);
  const [infiniteAmmoMax, setInfiniteAmmoMax] = useState(250);
  const [infiniteAmmoMin, setInfiniteAmmoMin] = useState(0);
  const [maxPropsLimit, setMaxPropsLimit] = useState(15);
  const [maxSuspiciousPropsLimit, setMaxSuspiciousPropsLimit] = useState(5);

  // Advanced Spoof Detection Engine (Config.SpoofDetection)
  const [spoofEnabled, setSpoofEnabled] = useState(true);
  const [spoofMinTokens, setSpoofMinTokens] = useState(3);
  const [spoofRequireLicense, setSpoofRequireLicense] = useState(true);
  const [spoofRequireSteam, setSpoofRequireSteam] = useState(false);
  const [spoofAllowPrivateIPs, setSpoofAllowPrivateIPs] = useState(false);
  const [spoofMinFlagsToBlock, setSpoofMinFlagsToBlock] = useState(2);
  const [spoofMinFlagsToBan, setSpoofMinFlagsToBan] = useState(3);
  const [spoofFingerprint, setSpoofFingerprint] = useState(true);
  const [spoofCheckIP, setSpoofCheckIP] = useState(true);
  const [spoofTokenRecycling, setSpoofTokenRecycling] = useState(true);
  const [spoofEntropy, setSpoofEntropy] = useState(true);

  // Smart Prop Delete (Config.SmartPropDelete)
  const [smartPropEnabled, setSmartPropEnabled] = useState(true);
  const [smartPropMaxSize, setSmartPropMaxSize] = useState(10.0);
  const [smartPropMinDist, setSmartPropMinDist] = useState(1.0);
  const [smartPropMaxDist, setSmartPropMaxDist] = useState(150.0);
  const [smartPropAutoDelete, setSmartPropAutoDelete] = useState(true);
  const [smartPropBanSuspicious, setSmartPropBanSuspicious] = useState(true);

  // Entity & Prop Spawn Limits (Config.MaxSpawn)
  const [maxVehiclesPerPlayer, setMaxVehiclesPerPlayer] = useState(3);
  const [maxPedsPerPlayer, setMaxPedsPerPlayer] = useState(3);
  const [maxPropsPerPlayer, setMaxPropsPerPlayer] = useState(5);
  const [maxVehiclesGlobal, setMaxVehiclesGlobal] = useState(100);
  const [maxPedsGlobal, setMaxPedsGlobal] = useState(150);
  const [maxPropsGlobal, setMaxPropsGlobal] = useState(250);

  // AntiCrash Engine (Config.AntiCrash)
  const [antiCrashEnabled, setAntiCrashEnabled] = useState(true);
  const [antiCrashModels, setAntiCrashModels] = useState(true);
  const [antiCrashExplosions, setAntiCrashExplosions] = useState(true);
  const [antiCrashParticles, setAntiCrashParticles] = useState(true);
  const [antiCrashScenarios, setAntiCrashScenarios] = useState(true);

  // Discord Integration & 4 Webhooks (Config Section 3)
  const [logsBans, setLogsBans] = useState("");
  const [logsConnection, setLogsConnection] = useState("");
  const [logsLeave, setLogsLeave] = useState("");
  const [logsWebhook, setLogsWebhook] = useState("");
  const [banClipEnabled, setBanClipEnabled] = useState(true);
  const [banClipDurationMs, setBanClipDurationMs] = useState(5000);
  const [banClipVideoBitsPerSecond, setBanClipVideoBitsPerSecond] = useState(320000);

  // Blacklists & Whitelists
  const [blacklistedMenuWords, setBlacklistedMenuWords] = useState<string[]>([]);
  const [blacklistedProps, setBlacklistedProps] = useState<string[]>([]);
  const [blacklistedVehicles, setBlacklistedVehicles] = useState<string[]>([]);
  const [blacklistedPeds, setBlacklistedPeds] = useState<string[]>([]);
  const [whiteListPeds, setWhiteListPeds] = useState<string[]>(["mp_f_freemode_01", "mp_m_freemode_01"]);
  const [blacklistedWeapons, setBlacklistedWeapons] = useState<string[]>([]);
  const [blacklistedNames, setBlacklistedNames] = useState<string[]>([]);
  const [blacklistedCommands, setBlacklistedCommands] = useState<string[]>([]);
  const [blacklistedTriggers, setBlacklistedTriggers] = useState<string[]>([]);
  const [whitelistedTriggers, setWhitelistedTriggers] = useState<string[]>([]);
  const [allowedResources, setAllowedResources] = useState<string[]>(["handup_search", "policejob", "ems_job"]);
  const [allowedVehicleSpawnResources, setAllowedVehicleSpawnResources] = useState<string[]>(["qb-core", "rentcar"]);
  const [adminGroups, setAdminGroups] = useState<string[]>(["admin", "superadmin", "god"]);
  const [exemptGroups, setExemptGroups] = useState<string[]>(["superadmin"]);
  const [fullWhitelistResources, setFullWhitelistResources] = useState<string[]>(["VexShield", "screenshot-basic"]);
  const [blockedAnimations, setBlockedAnimations] = useState<string[]>(["rcmpaparazzo_2"]);
  const [blackListedVehiclePlates, setBlackListedVehiclePlates] = useState<string[]>(["LUA", "EULEN", "TZX"]);
  const [inventoryAllowedJobs, setInventoryAllowedJobs] = useState<string[]>(["police", "sheriff", "ambulance"]);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [activeModalList, setActiveModalList] = useState<{ title: string; key: string } | null>(null);
  const [modalTextContent, setModalTextContent] = useState("");

  // Share Config state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareServerType, setShareServerType] = useState<"pvp" | "rp">("rp");
  const [shareDescription, setShareDescription] = useState("");
  const [shareTags, setShareTags] = useState("Balanced, FiveM, VexShield");
  const [shareCode, setShareCode] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [importShareCode, setImportShareCode] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [shareActiveTab, setShareActiveTab] = useState<"publish" | "import" | "export">("publish");

  const markChanged = () => setPendingChanges(true);

  // Reset all settings to factory recommended defaults
  const resetToDefaults = () => {
    setPlayerOptions(defaultPlayerOptions);
    setGameOptions(defaultGameOptions);
    setWeaponOptions(defaultWeaponOptions);
    setVehicleOptions(defaultVehicleOptions);
    setExplosionOptions(defaultExplosionOptions);
    setNetworkOptions(defaultNetworkInjectorOptions);

    setPureModeEnabled(false);
    setPureLevel("2");
    setScriptHookAllowed("0");
    setFilterRequestControl("1");
    setMinOnlineSeconds(4);
    setRequireSteam(false);
    setLogIPInformation(true);
    setResourceWhitelistEnabled(false);
    setResourceWhitelistAction("ban");
    setRequireDiscord(true);
    setFramework("auto");
    setShowAirBanner(true);

    setAutoInstallerEnabled(true);
    setBlockMissingInjection(true);
    setAutoRestartOnInstall(true);
    setIgnoredResources([]);

    setMaxArmour(100);
    setMaxTeleportDistance(500);
    setMaxAFKTime(300);
    setMaxTazeDistance(10.0);
    setExplosionDistance(12.0);
    setInfiniteAmmoMax(250);
    setInfiniteAmmoMin(1);
    setMaxPropsLimit(15);
    setMaxSuspiciousPropsLimit(5);
    setGiveMoneyMaxIncrease(500000000);
    setGiveMoneyCheckInterval(10000);
    setInjectionChecking(15000);
    setCheatEngineChecking(15000);

    setSpoofEnabled(true);
    setSpoofMinTokens(3);
    setSpoofRequireLicense(true);
    setSpoofRequireSteam(true);
    setSpoofAllowPrivateIPs(false);
    setSpoofMinFlagsToBlock(2);
    setSpoofMinFlagsToBan(3);
    setSpoofFingerprint(true);
    setSpoofCheckIP(true);
    setSpoofTokenRecycling(true);
    setSpoofEntropy(true);

    setSmartPropEnabled(true);
    setSmartPropMaxSize(10.0);
    setSmartPropMinDist(1.0);
    setSmartPropMaxDist(150.0);
    setSmartPropAutoDelete(true);
    setSmartPropBanSuspicious(true);

    setMaxVehiclesPerPlayer(3);
    setMaxPedsPerPlayer(3);
    setMaxPropsPerPlayer(5);
    setMaxVehiclesGlobal(100);
    setMaxPedsGlobal(150);
    setMaxPropsGlobal(250);

    setAntiCrashEnabled(true);
    setAntiCrashModels(true);
    setAntiCrashExplosions(true);
    setAntiCrashParticles(true);
    setAntiCrashScenarios(true);

    setBanClipEnabled(true);
    setBanClipDurationMs(5000);
    setBanClipVideoBitsPerSecond(320000);

    setBlacklistedMenuWords([]);
    setBlacklistedProps([]);
    setBlacklistedVehicles([]);
    setBlacklistedPeds([]);
    setWhiteListPeds(["mp_f_freemode_01", "mp_m_freemode_01"]);
    setBlacklistedWeapons([]);
    setBlacklistedNames([]);
    setBlacklistedCommands([]);
    setBlacklistedTriggers([]);
    setWhitelistedTriggers([]);
    setAllowedResources(["handup_search", "policejob", "ems_job"]);
    setAllowedVehicleSpawnResources(["qb-core", "rentcar"]);
    setAdminGroups(["admin", "superadmin", "god"]);
    setExemptGroups(["superadmin"]);
    setFullWhitelistResources(["VexShield", "screenshot-basic"]);
    setBlockedAnimations(["rcmpaparazzo_2"]);
    setBlackListedVehiclePlates(["LUA", "EULEN", "TZX"]);
    setInventoryAllowedJobs(["police", "sheriff", "ambulance"]);

    setPendingChanges(true);
    toast({
      title: "✓ Reset to Default Settings",
      description: "All configuration values have been reset to factory defaults. Click 'Save Changes' to apply to server.",
    });
  };

  // Cross-category Global Search Results
  const searchQueryTrimmed = searchQuery.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!searchQueryTrimmed) return [];

    const results: Array<{
      opt: AnticheatOption;
      setter: React.Dispatch<React.SetStateAction<AnticheatOption[]>>;
      category: string;
    }> = [];

    const checkMatch = (opt: AnticheatOption) => {
      const nameMatch = opt.name.toLowerCase().includes(searchQueryTrimmed);
      const idMatch = opt.id.toLowerCase().includes(searchQueryTrimmed);
      const tipMatch = (OPTION_TOOLTIPS[opt.id] || "").toLowerCase().includes(searchQueryTrimmed);
      return nameMatch || idMatch || tipMatch;
    };

    playerOptions.forEach(opt => {
      if (checkMatch(opt)) results.push({ opt, setter: setPlayerOptions, category: "Player Movement" });
    });
    gameOptions.forEach(opt => {
      if (checkMatch(opt)) results.push({ opt, setter: setGameOptions, category: "World & Combat" });
    });
    weaponOptions.forEach(opt => {
      if (checkMatch(opt)) results.push({ opt, setter: setWeaponOptions, category: "Weapons & Aim" });
    });
    vehicleOptions.forEach(opt => {
      if (checkMatch(opt)) results.push({ opt, setter: setVehicleOptions, category: "Vehicles & Peds" });
    });
    explosionOptions.forEach(opt => {
      if (checkMatch(opt)) results.push({ opt, setter: setExplosionOptions, category: "Explosions" });
    });
    networkOptions.forEach(opt => {
      if (checkMatch(opt)) results.push({ opt, setter: setNetworkOptions, category: "Network & Injections" });
    });

    return results;
  }, [searchQueryTrimmed, playerOptions, gameOptions, weaponOptions, vehicleOptions, explosionOptions, networkOptions]);

  // Helper to update detection item
  const updateOption = (
    setter: React.Dispatch<React.SetStateAction<AnticheatOption[]>>,
    id: string,
    updates: Partial<AnticheatOption>
  ) => {
    setter(prev => prev.map(opt => (opt.id === id ? { ...opt, ...updates } : opt)));
    markChanged();
  };

  // Helper for batch actions in each tab
  const batchUpdate = (
    setter: React.Dispatch<React.SetStateAction<AnticheatOption[]>>,
    updates: Partial<AnticheatOption>
  ) => {
    setter(prev => prev.map(opt => ({ ...opt, ...updates })));
    markChanged();
  };

  // Helper to parse protection options with L1, L2, L3 levels
  const parseProtectionOption = (opt: AnticheatOption, rawVal: any, rawAction: any): AnticheatOption => {
    let enabled = opt.enabled;
    let log = false;
    let l1 = opt.l1 ?? opt.enabled;
    let l2 = opt.l2 ?? opt.enabled;
    let l3 = opt.l3 ?? opt.enabled;

    if (typeof rawVal === "boolean") {
      enabled = rawVal;
      l1 = rawVal;
      l2 = rawVal;
      l3 = rawVal;
    } else if (typeof rawVal === "object" && rawVal !== null) {
      const isObjEnabled = rawVal.Enabled ?? rawVal.enabled;
      const hasLog = rawVal.Log ?? rawVal.log;
      const hasL1 = rawVal.L1 ?? rawVal.l1;
      const hasL2 = rawVal.L2 ?? rawVal.l2;
      const hasL3 = rawVal.L3 ?? rawVal.l3;

      if (isObjEnabled !== undefined) {
        enabled = Boolean(isObjEnabled);
      } else if (hasL1 !== undefined || hasL2 !== undefined || hasL3 !== undefined) {
        enabled = Boolean(hasL1 || hasL2 || hasL3);
      }

      if (hasLog !== undefined) {
        log = Boolean(hasLog);
      }

      if (enabled) {
        const hasAnyLevelTrue = (hasL1 === true) || (hasL2 === true) || (hasL3 === true);
        l1 = hasAnyLevelTrue ? Boolean(hasL1) : true;
        l2 = hasAnyLevelTrue ? Boolean(hasL2) : true;
        l3 = hasAnyLevelTrue ? Boolean(hasL3) : true;
      } else {
        l1 = false;
        l2 = false;
        l3 = false;
      }
    }

    let action: 'ban' | 'kick' | 'logs' = opt.action;
    if (typeof rawAction === 'string') {
      const lower = rawAction.toLowerCase();
      if (lower === 'ban' || lower === 'kick' || lower === 'logs') {
        action = lower as 'ban' | 'kick' | 'logs';
      }
    }

    return {
      ...opt,
      enabled,
      log: log || action === 'logs',
      l1,
      l2,
      l3,
      action,
    };
  };

  const mapOptionsWithFallback = (
    defaultList: AnticheatOption[],
    savedArray: AnticheatOption[] | undefined,
    protectionsMap: Record<string, any>,
    actionsMap: Record<string, any>
  ): AnticheatOption[] => {
    return defaultList.map(opt => {
      // 1. If saved array has this option
      if (Array.isArray(savedArray) && savedArray.length > 0) {
        const existing = savedArray.find(o => o.id === opt.id || o.name === opt.name);
        if (existing) return existing;
      }

      // 2. If Lua Protections dictionary has this key
      const rawVal = protectionsMap[opt.id] ??
        protectionsMap[opt.name] ??
        protectionsMap[opt.id.toLowerCase()] ??
        protectionsMap[opt.name.toLowerCase()];

      const rawAction = actionsMap[opt.id] ??
        actionsMap[opt.name] ??
        actionsMap[opt.id.toLowerCase()] ??
        actionsMap[opt.name.toLowerCase()];

      if (rawVal !== undefined || rawAction !== undefined) {
        return parseProtectionOption(opt, rawVal, rawAction);
      }

      return opt;
    });
  };

  const parseList = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      } catch { }
      return val.split('\n').map(l => l.trim()).filter(Boolean);
    }
    if (typeof val === 'object') {
      return Object.keys(val).filter(Boolean);
    }
    return [];
  };

  // Load Settings from Supabase / server
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      let targetServerId = serverId;
      let sessionName = "";
      let sessionInvite = "";
      try {
        const cs = sessionStorage.getItem('connected_server');
        if (cs) {
          const parsed = JSON.parse(cs);
          if (!targetServerId) targetServerId = parsed?.server_id;
          sessionName = parsed?.server_name || parsed?.name || "";
          sessionInvite = parsed?.discord_invite || "";
        }
      } catch { }

      if (!targetServerId) {
        setIsLoading(false);
        return;
      }

      // 1. Primary: load from backend API (reads DB, same data FiveM plugin uses)
      let apiConfig: Record<string, any> = {};
      try {
        const apiRes = await fetch(apiUrl(`/api/servers/${targetServerId}/airshield-config`), {
          credentials: 'include',
          headers: { Accept: 'application/json', 'X-AirCore-Client': '1' },
        });
        if (apiRes.ok) {
          const apiData = await apiRes.json() as { config?: Record<string, any> };
          apiConfig = apiData.config || {};
        }
      } catch (_) { }

      // 2. Secondary: load from Supabase directly
      const [settingsRes, serverRes] = await Promise.all([
        supabase.from('server_settings').select('*').eq('server_id', targetServerId).maybeSingle(),
        supabase.from('servers').select('*').eq('server_id', targetServerId).maybeSingle()
      ]);

      const serverRow = serverRes.data as any;
      const data = settingsRes.data;

      let s: Record<string, any> = { ...apiConfig };
      if (data) {
        const row = data as any;
        if (typeof row.settings === 'string') {
          try {
            s = { ...s, ...JSON.parse(row.settings) };
          } catch { }
        } else if (typeof row.settings === 'object' && row.settings !== null) {
          s = { ...s, ...row.settings };
        }
      }

      // Server Info resolution with fallbacks
      const nameVal = s.Servername || s.server_name || s.serverName || s.ServerName || s.servername || s.name || serverRow?.display_name || serverRow?.name || serverRow?.server_name || sessionName;
      if (nameVal !== undefined && nameVal !== null) {
        setServerName(String(nameVal));
      }

      const inviteVal = s.Discordinvite || s.discord_invite || s.discordInvite || s.DiscordInvite || s.discordinvite || serverRow?.discord_invite || sessionInvite;
      if (inviteVal !== undefined && inviteVal !== null) {
        setDiscordInvite(String(inviteVal));
      }

      const logoVal = s.ServerLogo || s.server_logo || s.serverLogo;
      setServerLogo(logoVal || "");

      const langVal = s.Language || s.language;
      setLanguage(langVal || "en");

      const reqDiscVal = s.RequireDiscord ?? s.requireDiscord ?? s.require_discord;
      setRequireDiscord(reqDiscVal !== undefined ? Boolean(reqDiscVal) : true);

      const frameVal = s.Framework || s.framework;
      setFramework(frameVal || "auto");

      if (s.ShowAirBanner !== undefined || s.showAirBanner !== undefined) {
        setShowAirBanner(Boolean(s.ShowAirBanner ?? s.showAirBanner));
      }

      // Pure Mode
      const pureObj = s.PureMode || s.pure_mode || {};
      if (pureObj.Enabled !== undefined || pureObj.enabled !== undefined || s.pureModeEnabled !== undefined) {
        setPureModeEnabled(Boolean(pureObj.Enabled ?? pureObj.enabled ?? s.pureModeEnabled));
      } else {
        setPureModeEnabled(false);
      }
      if (pureObj.PureLevel !== undefined || pureObj.pureLevel !== undefined || s.pureLevel !== undefined) {
        setPureLevel(String(pureObj.PureLevel ?? pureObj.pureLevel ?? s.pureLevel));
      }
      if (pureObj.ScriptHookAllowed !== undefined || s.scriptHookAllowed !== undefined) {
        setScriptHookAllowed(String(pureObj.ScriptHookAllowed ?? s.scriptHookAllowed));
      }
      if (pureObj.FilterRequestControl !== undefined || s.filterRequestControl !== undefined) {
        setFilterRequestControl(String(pureObj.FilterRequestControl ?? s.filterRequestControl));
      }

      if (s.MinimumOnlineSecondsBeforeBan !== undefined || s.minOnlineSeconds !== undefined) {
        setMinOnlineSeconds(Number(s.MinimumOnlineSecondsBeforeBan ?? s.minOnlineSeconds) || 4);
      }
      if (s.RequireSteam !== undefined || s.requireSteam !== undefined) {
        setRequireSteam(Boolean(s.RequireSteam ?? s.requireSteam));
      }
      if (s.LogIPInformation !== undefined || s.logIPInformation !== undefined) {
        setLogIPInformation(Boolean(s.LogIPInformation ?? s.logIPInformation));
      }
      if (s.ResourceWhitelistEnabled !== undefined || s.resourceWhitelistEnabled !== undefined) {
        setResourceWhitelistEnabled(Boolean(s.ResourceWhitelistEnabled ?? s.resourceWhitelistEnabled));
      }
      if (s.ResourceWhitelistAction || s.resourceWhitelistAction) {
        setResourceWhitelistAction(String(s.ResourceWhitelistAction || s.resourceWhitelistAction));
      }

      // Auto Installer (Config.AutoInstaller)
      const autoInst = s.AutoInstaller || s.autoInstaller || s.auto_installer || {};
      if (autoInst.Enabled !== undefined || autoInst.enabled !== undefined) {
        setAutoInstallerEnabled(Boolean(autoInst.Enabled ?? autoInst.enabled));
      }
      if (autoInst.BlockConnectionOnMissingInjection !== undefined || autoInst.blockConnectionOnMissingInjection !== undefined) {
        setBlockMissingInjection(Boolean(autoInst.BlockConnectionOnMissingInjection ?? autoInst.blockConnectionOnMissingInjection));
      }
      if (autoInst.AutoRestartOnInstall !== undefined || autoInst.autoRestartOnInstall !== undefined) {
        setAutoRestartOnInstall(Boolean(autoInst.AutoRestartOnInstall ?? autoInst.autoRestartOnInstall));
      }
      if (autoInst.IgnoredResources || autoInst.ignoredResources) {
        setIgnoredResources(parseList(autoInst.IgnoredResources ?? autoInst.ignoredResources));
      }

      // Numerical limits (Config.Client)
      const clientObj = s.Client || s.client || {};
      if (clientObj['MAX ARMOUR'] !== undefined || s.maxArmour !== undefined) {
        setMaxArmour(Number(clientObj['MAX ARMOUR'] ?? s.maxArmour) || 100);
      }
      if (clientObj['Max Distance Teleporting'] !== undefined || s.maxTeleportDistance !== undefined) {
        setMaxTeleportDistance(Number(clientObj['Max Distance Teleporting'] ?? s.maxTeleportDistance) || 500);
      }
      if (clientObj['AntiAFK']?.MaxAFKTime !== undefined || s.maxAFKTime !== undefined) {
        setMaxAFKTime(Number(clientObj['AntiAFK']?.MaxAFKTime ?? s.maxAFKTime) || 300);
      }
      if (clientObj['AntiTaze']?.MaxTazeDistance !== undefined || s.maxTazeDistance !== undefined) {
        setMaxTazeDistance(Number(clientObj['AntiTaze']?.MaxTazeDistance ?? s.maxTazeDistance) || 10.0);
      }
      if (clientObj['Explosion Vehicle Distance'] !== undefined || s.explosionDistance !== undefined) {
        setExplosionDistance(Number(clientObj['Explosion Vehicle Distance'] ?? s.explosionDistance) || 12.0);
      }
      if (clientObj['InfiniteAmmoMax'] !== undefined || s.infiniteAmmoMax !== undefined) {
        setInfiniteAmmoMax(Number(clientObj['InfiniteAmmoMax'] ?? s.infiniteAmmoMax) || 250);
      }
      if (clientObj['InfiniteAmmoMin'] !== undefined || s.infiniteAmmoMin !== undefined) {
        setInfiniteAmmoMin(Number(clientObj['InfiniteAmmoMin'] ?? s.infiniteAmmoMin) || 1);
      }
      if (clientObj['Anti Spawn Props']?.MAX_PROPS !== undefined || s.maxPropsLimit !== undefined) {
        setMaxPropsLimit(Number(clientObj['Anti Spawn Props']?.MAX_PROPS ?? s.maxPropsLimit) || 15);
      }
      if (clientObj['Anti Spawn Props']?.MAX_SUSPICIOUS_PROPS !== undefined || s.maxSuspiciousPropsLimit !== undefined) {
        setMaxSuspiciousPropsLimit(Number(clientObj['Anti Spawn Props']?.MAX_SUSPICIOUS_PROPS ?? s.maxSuspiciousPropsLimit) || 5);
      }

      if (s.GiveMoneyMaxIncrease !== undefined || s.giveMoneyMaxIncrease !== undefined) {
        setGiveMoneyMaxIncrease(Number(s.GiveMoneyMaxIncrease ?? s.giveMoneyMaxIncrease) || 500000000);
      }
      if (s.GiveMoneyCheckInterval !== undefined || s.giveMoneyCheckInterval !== undefined) {
        setGiveMoneyCheckInterval(Number(s.GiveMoneyCheckInterval ?? s.giveMoneyCheckInterval) || 10000);
      }
      if (s.InjectionChecking !== undefined || s.injectionChecking !== undefined) {
        setInjectionChecking(Number(s.InjectionChecking ?? s.injectionChecking) || 15000);
      }
      if (s.CheatEngineChecking !== undefined || s.cheatEngineChecking !== undefined) {
        setCheatEngineChecking(Number(s.CheatEngineChecking ?? s.cheatEngineChecking) || 15000);
      }

      // Spoof Detection Engine (Config.SpoofDetection)
      const spoofObj = s.SpoofDetection || s.spoofDetection || {};
      if (spoofObj.Enabled !== undefined) setSpoofEnabled(Boolean(spoofObj.Enabled));
      if (spoofObj.MinTokens !== undefined) setSpoofMinTokens(Number(spoofObj.MinTokens) || 3);
      if (spoofObj.RequireLicense !== undefined) setSpoofRequireLicense(Boolean(spoofObj.RequireLicense));
      if (spoofObj.RequireSteam !== undefined) setSpoofRequireSteam(Boolean(spoofObj.RequireSteam));
      if (spoofObj.AllowPrivateIPs !== undefined) setSpoofAllowPrivateIPs(Boolean(spoofObj.AllowPrivateIPs));
      if (spoofObj.MinFlagsToBlock !== undefined) setSpoofMinFlagsToBlock(Number(spoofObj.MinFlagsToBlock) || 2);
      if (spoofObj.MinFlagsToBan !== undefined) setSpoofMinFlagsToBan(Number(spoofObj.MinFlagsToBan) || 3);
      if (spoofObj.FingerprintAnalysis !== undefined) setSpoofFingerprint(Boolean(spoofObj.FingerprintAnalysis));
      if (spoofObj.CheckIPConsistency !== undefined) setSpoofCheckIP(Boolean(spoofObj.CheckIPConsistency));
      if (spoofObj.DetectTokenRecycling !== undefined) setSpoofTokenRecycling(Boolean(spoofObj.DetectTokenRecycling));
      if (spoofObj.EntropyScoring !== undefined) setSpoofEntropy(Boolean(spoofObj.EntropyScoring));

      // Smart Prop Delete (Config.SmartPropDelete)
      const smartPropObj = s.SmartPropDelete || s.smartPropDelete || {};
      if (smartPropObj.Enabled !== undefined) setSmartPropEnabled(Boolean(smartPropObj.Enabled));
      if (smartPropObj.MaxPropSize !== undefined) setSmartPropMaxSize(Number(smartPropObj.MaxPropSize) || 10.0);
      if (smartPropObj.MinDistanceFromPlayer !== undefined) setSmartPropMinDist(Number(smartPropObj.MinDistanceFromPlayer) || 1.0);
      if (smartPropObj.MaxDistanceFromPlayer !== undefined) setSmartPropMaxDist(Number(smartPropObj.MaxDistanceFromPlayer) || 150.0);
      if (smartPropObj.AutoDeleteEnabled !== undefined) setSmartPropAutoDelete(Boolean(smartPropObj.AutoDeleteEnabled));
      if (smartPropObj.BanOnSuspicious !== undefined) setSmartPropBanSuspicious(Boolean(smartPropObj.BanOnSuspicious));

      // Entity Spawn Limits (Config.MaxSpawn)
      const spawnObj = s.MaxSpawn || s.maxSpawn || {};
      if (spawnObj.MaxVehiclesPerPlayer !== undefined) setMaxVehiclesPerPlayer(Number(spawnObj.MaxVehiclesPerPlayer) || 3);
      if (spawnObj.MaxPedsPerPlayer !== undefined) setMaxPedsPerPlayer(Number(spawnObj.MaxPedsPerPlayer) || 3);
      if (spawnObj.MaxPropsPerPlayer !== undefined) setMaxPropsPerPlayer(Number(spawnObj.MaxPropsPerPlayer) || 5);
      if (spawnObj.MaxVehiclesGlobal !== undefined) setMaxVehiclesGlobal(Number(spawnObj.MaxVehiclesGlobal) || 100);
      if (spawnObj.MaxPedsGlobal !== undefined) setMaxPedsGlobal(Number(spawnObj.MaxPedsGlobal) || 150);
      if (spawnObj.MaxPropsGlobal !== undefined) setMaxPropsGlobal(Number(spawnObj.MaxPropsGlobal) || 250);

      // AntiCrash (Config.AntiCrash)
      const antiCrashObj = s.AntiCrash || s.antiCrash || s.anti_crash || {};
      if (antiCrashObj.Enabled !== undefined || antiCrashObj.enabled !== undefined) {
        setAntiCrashEnabled(Boolean(antiCrashObj.Enabled ?? antiCrashObj.enabled));
      }
      if (antiCrashObj.AntiCrashModels !== undefined || antiCrashObj.antiCrashModels !== undefined) {
        setAntiCrashModels(Boolean(antiCrashObj.AntiCrashModels ?? antiCrashObj.antiCrashModels));
      }
      if (antiCrashObj.AntiCrashExplosions !== undefined || antiCrashObj.antiCrashExplosions !== undefined) {
        setAntiCrashExplosions(Boolean(antiCrashObj.AntiCrashExplosions ?? antiCrashObj.antiCrashExplosions));
      }
      if (antiCrashObj.AntiCrashParticles !== undefined || antiCrashObj.antiCrashParticles !== undefined) {
        setAntiCrashParticles(Boolean(antiCrashObj.AntiCrashParticles ?? antiCrashObj.antiCrashParticles));
      }
      if (antiCrashObj.AntiCrashScenarios !== undefined || antiCrashObj.antiCrashScenarios !== undefined) {
        setAntiCrashScenarios(Boolean(antiCrashObj.AntiCrashScenarios ?? antiCrashObj.antiCrashScenarios));
      }

      // Discord Integration — 4 Webhooks (Config Section 3)
      const webhooksObj = s.discord_webhooks || {};
      const banWebhook = s.logsBans || s.logs_bans || webhooksObj.logsBans || data?.discord_webhook || serverRow?.discord_webhook || s.discord_webhook || "";
      const connWebhook = s.logsConnection || s.logs_connection || webhooksObj.logsConnection || "";
      const leaveWebhook = s.logsLeave || s.logs_leave || webhooksObj.logsLeave || "";
      const kickWebhook = s.logsWebhook || s.logs_webhook || webhooksObj.logsWebhook || "";

      setLogsBans(banWebhook);
      setLogsConnection(connWebhook);
      setLogsLeave(leaveWebhook);
      setLogsWebhook(kickWebhook);

      // Ban Video Clip
      const banClipObj = s.BanClip || s.banClip || {};
      if (s.BanClipEnabled !== undefined || banClipObj.Enabled !== undefined || s.banClipEnabled !== undefined) {
        setBanClipEnabled(Boolean(s.BanClipEnabled ?? banClipObj.Enabled ?? s.banClipEnabled));
      }
      if (s.BanClipDurationMs !== undefined || banClipObj.DurationMs !== undefined || s.banClipDurationMs !== undefined) {
        setBanClipDurationMs(Number(s.BanClipDurationMs ?? banClipObj.DurationMs ?? s.banClipDurationMs) || 5000);
      }
      if (s.BanClipVideoBitsPerSecond !== undefined || banClipObj.VideoBitsPerSecond !== undefined || s.banClipVideoBitsPerSecond !== undefined) {
        setBanClipVideoBitsPerSecond(Number(s.BanClipVideoBitsPerSecond ?? banClipObj.VideoBitsPerSecond ?? s.banClipVideoBitsPerSecond) || 320000);
      }

      // Map Protections & Actions
      const protectionsMap = s.Protections || s.protections || s.Config?.Protections || {};
      const actionsMap = s.EnforcementActions || s.enforcementActions || s.enforcement_actions || s.Config?.EnforcementActions || {};

      setPlayerOptions(prev => mapOptionsWithFallback(prev, s.playerOptions, protectionsMap, actionsMap));
      setGameOptions(prev => mapOptionsWithFallback(prev, s.gameOptions, protectionsMap, actionsMap));
      setWeaponOptions(prev => mapOptionsWithFallback(prev, s.weaponOptions, protectionsMap, actionsMap));
      setVehicleOptions(prev => mapOptionsWithFallback(prev, s.vehicleOptions, protectionsMap, actionsMap));
      setExplosionOptions(prev => mapOptionsWithFallback(prev, s.explosionOptions, protectionsMap, actionsMap));
      setNetworkOptions(prev => mapOptionsWithFallback(prev, s.networkOptions, protectionsMap, actionsMap));

      // Lists & Blacklists
      setBlacklistedMenuWords(parseList(s.BlacklistedMenuWords ?? s.blacklistedMenuWords ?? data?.anti_blackwords));
      setBlacklistedProps(parseList(s.BlacklistedProps ?? s.blacklistedProps ?? data?.anti_objects));
      setBlacklistedVehicles(parseList(s.BlacklistedVehicles ?? s.blacklistedVehicles));
      setBlacklistedPeds(parseList(s.BlacklistedPeds ?? s.blacklistedPeds));
      setWhiteListPeds(parseList(s.WhiteListPeds ?? s.whiteListPeds ?? ["mp_f_freemode_01", "mp_m_freemode_01"]));
      setBlacklistedWeapons(parseList(s.BlacklistedWeapons ?? s.blacklistedWeapons));
      setBlacklistedNames(parseList(s.BlacklistedNames ?? s.blacklistedNames));
      setBlacklistedCommands(parseList(s.BlacklistedCommands ?? s.blacklistedCommands));
      setBlacklistedTriggers(parseList(s.BlacklistedTriggers ?? s.blacklistedTriggers));
      setWhitelistedTriggers(parseList(s.WhitelistedTriggers ?? s.whitelistedTriggers));
      setAllowedResources(parseList(s.AllowedResources ?? s.allowedResources ?? ["handup_search", "policejob", "ems_job"]));
      setAllowedVehicleSpawnResources(parseList(s.AllowedVehicleSpawnResources ?? s.allowedVehicleSpawnResources ?? ["qb-core", "rentcar"]));
      setAdminGroups(parseList(s.ADMIN_GROUPS ?? s.adminGroups ?? ["admin", "superadmin", "god"]));
      setExemptGroups(parseList(s.EXEMPT_GROUPS ?? s.exemptGroups ?? ["superadmin"]));
      setFullWhitelistResources(parseList(s.FullWhitelistResources ?? s.fullWhitelistResources ?? ["VexShield", "screenshot-basic"]));
      setBlockedAnimations(parseList(s.BlockedAnimations ?? s.blockedAnimations ?? ["rcmpaparazzo_2"]));
      setBlackListedVehiclePlates(parseList(s.BlackListedVehiclePlates ?? s.blackListedVehiclePlates ?? ["LUA", "EULEN", "TZX"]));
      setInventoryAllowedJobs(parseList(s.InventoryAllowedJobs ?? s.inventoryAllowedJobs ?? ["police", "sheriff", "ambulance"]));

      setPendingChanges(false);
    } catch (err) {
      console.error('[Settings] Error loading server settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save changes to database and server
  const handleSave = async () => {
    const targetServerId = serverId;
    if (!targetServerId) {
      toast({
        title: "No Server Selected",
        description: "Please select a server before saving settings.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Build protections & enforcement dictionaries for FiveM Lua config
      const protectionsDict: Record<string, boolean | { Enabled?: boolean; Log?: boolean; L1?: boolean; L2?: boolean; L3?: boolean }> = {};
      const enforcementActionsDict: Record<string, 'ban' | 'kick' | 'logs'> = {};

      const populateCategory = (opts: AnticheatOption[]) => {
        opts.forEach(opt => {
          protectionsDict[opt.id] = {
            Enabled: opt.enabled,
            Log: opt.action === 'logs' || Boolean(opt.log),
            L1: opt.l1 ?? true,
            L2: opt.l2 ?? true,
            L3: opt.l3 ?? true,
          };
          enforcementActionsDict[opt.id] = opt.action;
        });
      };

      populateCategory(playerOptions);
      populateCategory(gameOptions);
      populateCategory(weaponOptions);
      populateCategory(vehicleOptions);
      populateCategory(explosionOptions);
      populateCategory(networkOptions);

      const ignoredResourcesMap: Record<string, boolean> = {};
      ignoredResources.forEach(res => { if (res) ignoredResourcesMap[res] = true; });

      const payload = {
        // Main Server Identity & Framework (all casing variants for FiveM site.lua compatibility)
        server_name: serverName,
        serverName: serverName,
        Servername: serverName,
        ServerName: serverName,

        discord_invite: discordInvite,
        discordInvite: discordInvite,
        Discordinvite: discordInvite,
        DiscordInvite: discordInvite,

        server_logo: serverLogo,
        serverLogo: serverLogo,
        ServerLogo: serverLogo,

        language: language,
        Language: language,

        require_discord: requireDiscord,
        requireDiscord: requireDiscord,
        RequireDiscord: requireDiscord,

        framework: framework,
        Framework: framework,

        show_air_banner: showAirBanner,
        showAirBanner: showAirBanner,
        ShowAirBanner: showAirBanner,

        PureMode: {
          Enabled: pureModeEnabled,
          PureLevel: parseInt(pureLevel) || 2,
          ScriptHookAllowed: parseInt(scriptHookAllowed) || 0,
          FilterRequestControl: parseInt(filterRequestControl) || 1,
        },
        pure_mode: {
          enabled: pureModeEnabled,
          pure_level: parseInt(pureLevel) || 2,
          script_hook_allowed: parseInt(scriptHookAllowed) || 0,
          filter_request_control: parseInt(filterRequestControl) || 1,
        },
        MinimumOnlineSecondsBeforeBan: minOnlineSeconds,
        minimum_online_seconds_before_ban: minOnlineSeconds,
        RequireSteam: requireSteam,
        require_steam: requireSteam,
        LogIPInformation: logIPInformation,
        log_ip_information: logIPInformation,
        ResourceWhitelistEnabled: resourceWhitelistEnabled,
        resource_whitelist_enabled: resourceWhitelistEnabled,
        ResourceWhitelistAction: resourceWhitelistAction,
        resource_whitelist_action: resourceWhitelistAction,

        // AntiCrash (Config.AntiCrash)
        AntiCrash: {
          Enabled: antiCrashEnabled,
          AntiCrashModels: antiCrashModels,
          AntiCrashExplosions: antiCrashExplosions,
          AntiCrashParticles: antiCrashParticles,
          AntiCrashScenarios: antiCrashScenarios,
        },

        // Auto Installer (Config.AutoInstaller)
        AutoInstaller: {
          Enabled: autoInstallerEnabled,
          BlockConnectionOnMissingInjection: blockMissingInjection,
          AutoRestartOnInstall: autoRestartOnInstall,
          IgnoredResources: ignoredResourcesMap,
        },
        autoInstaller: {
          enabled: autoInstallerEnabled,
          blockConnectionOnMissingInjection: blockMissingInjection,
          autoRestartOnInstall: autoRestartOnInstall,
          ignoredResources: ignoredResources,
        },

        Protections: protectionsDict,
        protections: protectionsDict,
        EnforcementActions: enforcementActionsDict,
        enforcementActions: enforcementActionsDict,

        // Discord 4 Webhooks (Config Section 3)
        logsBans,
        logsConnection,
        logsLeave,
        logsWebhook,
        discord_webhooks: {
          logsBans,
          logsConnection,
          logsLeave,
          logsWebhook,
        },

        // Ban Clip Recording (Config.BanClip)
        BanClipEnabled: banClipEnabled,
        BanClipDurationMs: banClipDurationMs,
        BanClipVideoBitsPerSecond: banClipVideoBitsPerSecond,
        BanClip: {
          Enabled: banClipEnabled,
          DurationMs: banClipDurationMs,
          VideoBitsPerSecond: banClipVideoBitsPerSecond,
        },

        // Client numerical parameters (Config.Client)
        Client: {
          'MAX ARMOUR': maxArmour,
          'Max Distance Teleporting': maxTeleportDistance,
          'AntiAFK': { MaxAFKTime: maxAFKTime },
          'AntiTaze': { MaxTazeDistance: maxTazeDistance },
          'Explosion Vehicle Distance': explosionDistance,
          'InfiniteAmmoMax': infiniteAmmoMax,
          'InfiniteAmmoMin': infiniteAmmoMin,
          'Anti Spawn Props': {
            MAX_PROPS: maxPropsLimit,
            MAX_SUSPICIOUS_PROPS: maxSuspiciousPropsLimit,
          },
        },
        GiveMoneyMaxIncrease: giveMoneyMaxIncrease,
        GiveMoneyCheckInterval: giveMoneyCheckInterval,
        InjectionChecking: injectionChecking,
        CheatEngineChecking: cheatEngineChecking,

        // Advanced Engines
        SpoofDetection: {
          Enabled: spoofEnabled,
          MinTokens: spoofMinTokens,
          RequireLicense: spoofRequireLicense,
          RequireSteam: spoofRequireSteam,
          AllowPrivateIPs: spoofAllowPrivateIPs,
          MinFlagsToBlock: spoofMinFlagsToBlock,
          MinFlagsToBan: spoofMinFlagsToBan,
          FingerprintAnalysis: spoofFingerprint,
          CheckIPConsistency: spoofCheckIP,
          DetectTokenRecycling: spoofTokenRecycling,
          EntropyScoring: spoofEntropy,
        },

        SmartPropDelete: {
          Enabled: smartPropEnabled,
          MaxPropSize: smartPropMaxSize,
          MinDistanceFromPlayer: smartPropMinDist,
          MaxDistanceFromPlayer: smartPropMaxDist,
          CheckUnnaturalSpawn: true,
          AutoDeleteEnabled: smartPropAutoDelete,
          BanOnSuspicious: smartPropBanSuspicious,
        },

        MaxSpawn: {
          MaxVehiclesPerPlayer: maxVehiclesPerPlayer,
          MaxPedsPerPlayer: maxPedsPerPlayer,
          MaxPropsPerPlayer: maxPropsPerPlayer,
          MaxVehiclesGlobal: maxVehiclesGlobal,
          MaxPedsGlobal: maxPedsGlobal,
          MaxPropsGlobal: maxPropsGlobal,
          ResetOnDisconnect: true,
        },

        // Lists
        BlacklistedMenuWords: blacklistedMenuWords,
        BlacklistedProps: blacklistedProps,
        BlacklistedVehicles: blacklistedVehicles,
        BlacklistedPeds: blacklistedPeds,
        WhiteListPeds: whiteListPeds,
        BlacklistedWeapons: blacklistedWeapons,
        BlacklistedNames: blacklistedNames,
        BlacklistedCommands: blacklistedCommands,
        BlacklistedTriggers: blacklistedTriggers,
        WhitelistedTriggers: whitelistedTriggers,
        AllowedResources: allowedResources,
        AllowedVehicleSpawnResources: allowedVehicleSpawnResources,
        ADMIN_GROUPS: adminGroups,
        EXEMPT_GROUPS: exemptGroups,
        FullWhitelistResources: fullWhitelistResources,
        BlockedAnimations: blockedAnimations,
        BlackListedVehiclePlates: blackListedVehiclePlates,
        InventoryAllowedJobs: inventoryAllowedJobs,

        // Direct state values for UI state persistence
        pureModeEnabled,
        pureLevel,
        scriptHookAllowed,
        filterRequestControl,
        minOnlineSeconds,
        requireSteam,
        logIPInformation,
        resourceWhitelistEnabled,
        resourceWhitelistAction,
        autoInstallerEnabled,
        blockMissingInjection,
        autoRestartOnInstall,
        ignoredResources,
        maxArmour,
        maxTeleportDistance,
        maxAFKTime,
        maxTazeDistance,
        explosionDistance,
        infiniteAmmoMax,
        infiniteAmmoMin,
        maxPropsLimit,
        maxSuspiciousPropsLimit,
        giveMoneyMaxIncrease,
        giveMoneyCheckInterval,
        injectionChecking,
        cheatEngineChecking,
        spoofEnabled,
        spoofMinTokens,
        spoofRequireLicense,
        spoofRequireSteam,
        spoofAllowPrivateIPs,
        spoofMinFlagsToBlock,
        spoofMinFlagsToBan,
        spoofFingerprint,
        spoofCheckIP,
        spoofTokenRecycling,
        spoofEntropy,
        smartPropEnabled,
        smartPropMaxSize,
        smartPropMinDist,
        smartPropMaxDist,
        smartPropAutoDelete,
        smartPropBanSuspicious,
        maxVehiclesPerPlayer,
        maxPedsPerPlayer,
        maxPropsPerPlayer,
        maxVehiclesGlobal,
        maxPedsGlobal,
        maxPropsGlobal,
        playerOptions,
        gameOptions,
        weaponOptions,
        vehicleOptions,
        explosionOptions,
        networkOptions,
        blacklistedMenuWords,
        blacklistedProps,
        blacklistedVehicles,
        blacklistedPeds,
        whiteListPeds,
        blacklistedWeapons,
        blacklistedNames,
        blacklistedCommands,
        blacklistedTriggers,
        whitelistedTriggers,
        allowedResources,
        allowedVehicleSpawnResources,
        adminGroups,
        exemptGroups,
        fullWhitelistResources,
        blockedAnimations,
        blackListedVehiclePlates,
        inventoryAllowedJobs,
      };

      // Step 1: Save to Supabase server_settings
      const { error: settingsErr } = await supabase
        .from('server_settings')
        .upsert({
          server_id: targetServerId,
          settings: payload,
          anti_objects: blacklistedProps,
          anti_blackwords: blacklistedMenuWords,
          discord_webhook: logsBans,
        }, { onConflict: 'server_id' });

      if (settingsErr) throw settingsErr;

      // Step 2: Update servers table metadata in Supabase
      try {
        await supabase
          .from('servers')
          .update({
            display_name: serverName,
          })
          .eq('server_id', targetServerId);
      } catch (_) { }

      // Step 3: Push config to Express Backend API (queues update_settings in MySQL for FiveM)
      try {
        await ensureCsrfCookie();
        await fetch(apiUrl(`/api/servers/${targetServerId}/airshield-config`), {
          method: 'PUT',
          credentials: 'include',
          headers: apiMutationHeaders(),
          body: JSON.stringify(payload),
        });
      } catch (apiErr) {
        console.warn('[Settings] airshield-config API PUT notice:', apiErr);
      }

      // Step 4: Update sessionStorage
      try {
        const cs = sessionStorage.getItem('connected_server');
        if (cs) {
          const parsed = JSON.parse(cs);
          sessionStorage.setItem('connected_server', JSON.stringify({
            ...parsed,
            server_name: serverName,
            name: serverName,
            discord_invite: discordInvite,
          }));
        }
      } catch (_) { }

      // Step 5: Trigger server command sync
      try {
        await supabase.functions.invoke('server-command', {
          body: {
            server_id: targetServerId,
            command_type: 'update_settings',
            command_data: payload
          }
        });
      } catch (_) { }

      setPendingChanges(false);
      toast({
        title: "✓ Settings Saved",
        description: "All configuration settings were successfully saved to database and queued for FiveM server.",
      });
    } catch (err: any) {
      console.error('[Settings] Error saving settings:', err);
      toast({
        title: "Save Failed",
        description: err.message || "Could not save configuration settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Publish / Share Configuration to community library
  const handlePublishConfig = async () => {
    setIsPublishing(true);
    try {
      const codeToUse = shareCode || `AIR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const payloadData = {
        server_name: serverName || "VexShield Community Server",
        server_type: shareServerType,
        code: codeToUse,
        created_by: serverId || null,
        config_data: {
          author_name: serverName || "VexShield Admin",
          description: shareDescription || "Custom tuned VexShield anti-cheat configuration profile.",
          tags: shareTags.split(',').map(t => t.trim()).filter(Boolean),
          playerOptions,
          gameOptions,
          weaponOptions,
          vehicleOptions,
          explosionOptions,
          networkOptions,
          settings: {
            pureModeEnabled,
            pureLevel,
            maxArmour,
            maxTeleportDistance,
            maxAFKTime,
            maxTazeDistance,
            spoofEnabled,
            smartPropEnabled,
            autoInstallerEnabled,
          }
        }
      };

      const { error } = await (supabase as any)
        .from('shared_configs')
        .upsert(payloadData, { onConflict: 'code' });

      if (error) throw error;

      try {
        const saved = JSON.parse(localStorage.getItem('my_published_config_codes') || '[]');
        if (!saved.includes(codeToUse)) {
          saved.push(codeToUse);
          localStorage.setItem('my_published_config_codes', JSON.stringify(saved));
        }
      } catch { }

      await navigator.clipboard.writeText(codeToUse);
      setShareCode(codeToUse);
      toast({
        title: "Config Published & Shared!",
        description: `Share Code "${codeToUse}" was published to Community Library and copied to your clipboard!`,
      });
    } catch (err: any) {
      console.error("Publish config error:", err);
      toast({
        title: "Publish Failed",
        description: err.message || "Failed to publish shared config.",
        variant: "destructive"
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Import configuration by Share Code
  const handleImportSharedConfig = async () => {
    if (!importShareCode.trim()) {
      toast({ title: "Error", description: "Please enter a valid Share Code.", variant: "destructive" });
      return;
    }
    setIsImporting(true);
    try {
      const { data, error } = await (supabase as any)
        .from('shared_configs')
        .select('*')
        .eq('code', importShareCode.trim().toUpperCase())
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Not Found",
          description: `No shared configuration found for code "${importShareCode}".`,
          variant: "destructive"
        });
        return;
      }

      const cd = data.config_data || {};
      if (Array.isArray(cd.playerOptions)) setPlayerOptions(cd.playerOptions);
      if (Array.isArray(cd.gameOptions)) setGameOptions(cd.gameOptions);
      if (Array.isArray(cd.weaponOptions)) setWeaponOptions(cd.weaponOptions);
      if (Array.isArray(cd.vehicleOptions)) setVehicleOptions(cd.vehicleOptions);
      if (Array.isArray(cd.explosionOptions)) setExplosionOptions(cd.explosionOptions);
      if (Array.isArray(cd.networkOptions)) setNetworkOptions(cd.networkOptions);

      if (cd.settings) {
        if (cd.settings.pureModeEnabled !== undefined) setPureModeEnabled(cd.settings.pureModeEnabled);
        if (cd.settings.pureLevel !== undefined) setPureLevel(cd.settings.pureLevel);
        if (cd.settings.maxArmour !== undefined) setMaxArmour(cd.settings.maxArmour);
        if (cd.settings.maxTeleportDistance !== undefined) setMaxTeleportDistance(cd.settings.maxTeleportDistance);
        if (cd.settings.maxAFKTime !== undefined) setMaxAFKTime(cd.settings.maxAFKTime);
        if (cd.settings.maxTazeDistance !== undefined) setMaxTazeDistance(cd.settings.maxTazeDistance);
        if (cd.settings.spoofEnabled !== undefined) setSpoofEnabled(cd.settings.spoofEnabled);
        if (cd.settings.smartPropEnabled !== undefined) setSmartPropEnabled(cd.settings.smartPropEnabled);
        if (cd.settings.autoInstallerEnabled !== undefined) setAutoInstallerEnabled(cd.settings.autoInstallerEnabled);
      }

      markChanged();
      setIsShareOpen(false);
      toast({
        title: "Configuration Imported!",
        description: `Successfully loaded settings profile "${data.server_name}" (${data.code}). Click Save Changes to apply to your server.`,
      });
    } catch (err: any) {
      console.error("Import error:", err);
      toast({ title: "Import Failed", description: err.message || "Could not load shared config.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  // Open list editor
  const openListDialog = (title: string, key: string, data: string[]) => {
    setActiveModalList({ title, key });
    setModalTextContent(data.join('\n'));
  };

  const saveListDialog = () => {
    if (!activeModalList) return;
    const lines = modalTextContent.split('\n').map(l => l.trim()).filter(Boolean);
    const key = activeModalList.key;

    if (key === 'ignoredResources') setIgnoredResources(lines);
    else if (key === 'blacklistedMenuWords') setBlacklistedMenuWords(lines);
    else if (key === 'blacklistedProps') setBlacklistedProps(lines);
    else if (key === 'blacklistedVehicles') setBlacklistedVehicles(lines);
    else if (key === 'blacklistedPeds') setBlacklistedPeds(lines);
    else if (key === 'whiteListPeds') setWhiteListPeds(lines);
    else if (key === 'blacklistedWeapons') setBlacklistedWeapons(lines);
    else if (key === 'blacklistedNames') setBlacklistedNames(lines);
    else if (key === 'blacklistedCommands') setBlacklistedCommands(lines);
    else if (key === 'blacklistedTriggers') setBlacklistedTriggers(lines);
    else if (key === 'whitelistedTriggers') setWhitelistedTriggers(lines);
    else if (key === 'allowedResources') setAllowedResources(lines);
    else if (key === 'allowedVehicleSpawnResources') setAllowedVehicleSpawnResources(lines);
    else if (key === 'adminGroups') setAdminGroups(lines);
    else if (key === 'exemptGroups') setExemptGroups(lines);
    else if (key === 'fullWhitelistResources') setFullWhitelistResources(lines);
    else if (key === 'blockedAnimations') setBlockedAnimations(lines);
    else if (key === 'blackListedVehiclePlates') setBlackListedVehiclePlates(lines);
    else if (key === 'inventoryAllowedJobs') setInventoryAllowedJobs(lines);

    markChanged();
    setActiveModalList(null);
  };

  // Helper Component: Sub-group Card in WaveShield Style
  const renderConfigCard = (
    icon: any,
    title: string,
    description: string,
    children: React.ReactNode,
    extraHeader?: React.ReactNode
  ) => {
    const IconComponent = icon;
    return (
      <Card className="rounded-xl border border-white/10 bg-[#090e18] shadow-sm flex flex-col overflow-hidden transition-all duration-200 hover:border-white/20">
        <CardHeader className="pb-3 border-b border-white/5 px-4 pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
              <IconComponent className="h-4 w-4 text-blue-400 shrink-0" />
              <span className="truncate">{title}</span>
            </CardTitle>
            {extraHeader}
          </div>
          <CardDescription className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-1 divide-y divide-white/5">
          {children}
        </CardContent>
      </Card>
    );
  };

  // Helper Component: Option Row in WaveShield Style with Full Level System (L1, L2, L3, LOG)
  const renderOptionRow = (
    opt: AnticheatOption,
    setter: React.Dispatch<React.SetStateAction<AnticheatOption[]>>
  ) => {
    const tip = OPTION_TOOLTIPS[opt.id];
    const isL1Active = opt.l1 ?? true;
    const isL2Active = opt.l2 ?? true;
    const isL3Active = opt.l3 ?? true;
    const isLogActive = opt.action === 'logs' || Boolean(opt.log);

    return (
      <div
        key={opt.id}
        className={cn(
          "flex flex-col p-3 px-3.5 hover:bg-white/[0.02] transition-colors gap-2 border-b border-white/5 last:border-b-0",
          !opt.enabled && "opacity-60"
        )}
      >
        {/* Main Row: Title, Tooltip, Penalty Action Badge, Master Switch */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 pr-3">
            <span
              className={cn(
                "text-xs sm:text-sm font-semibold truncate transition-colors",
                opt.enabled ? "text-zinc-100" : "text-zinc-500"
              )}
            >
              {opt.name}
            </span>
            {tip && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-zinc-500 hover:text-blue-400 transition-colors shrink-0"
                      aria-label={`Info for ${opt.name}`}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs text-xs bg-[#0c1017] border border-blue-500/20 text-zinc-200 p-2.5 rounded-lg shadow-xl"
                  >
                    {tip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Penalty Action Cycle Button: BAN -> KICK -> LOGS */}
            <button
              type="button"
              disabled={!opt.enabled}
              onClick={() => {
                const nextAction =
                  opt.action === 'ban' ? 'kick' : opt.action === 'kick' ? 'logs' : 'ban';
                updateOption(setter, opt.id, {
                  action: nextAction,
                  log: nextAction === 'logs' || Boolean(opt.log),
                });
              }}
              title="Click to cycle penalty: BAN -> KICK -> LOGS"
              className={cn(
                "text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase border transition-all cursor-pointer",
                opt.enabled
                  ? opt.action === 'ban'
                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                    : opt.action === 'kick'
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                    : "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25"
                  : "bg-white/5 text-zinc-600 border-white/10 opacity-50 cursor-not-allowed"
              )}
            >
              {opt.action}
            </button>

            {/* Master Toggle Switch */}
            <Switch
              checked={opt.enabled}
              onCheckedChange={(checked) =>
                updateOption(setter, opt.id, {
                  enabled: checked,
                  l1: checked ? (opt.l1 ?? true) : false,
                  l2: checked ? (opt.l2 ?? true) : false,
                  l3: checked ? (opt.l3 ?? true) : false,
                })
              }
            />
          </div>
        </div>

        {/* Level System Bar: L1, L2, L3 Thresholds & Discord Log Toggle */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider mr-1">
              Levels:
            </span>

            {/* L1 Button */}
            <button
              type="button"
              disabled={!opt.enabled}
              onClick={() => updateOption(setter, opt.id, { l1: !isL1Active })}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all select-none cursor-pointer",
                opt.enabled && isL1Active
                  ? "bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600/30 shadow-sm shadow-blue-500/10"
                  : "bg-white/[0.02] text-zinc-600 border-white/5 hover:text-zinc-400"
              )}
              title="Toggle Level 1 Detection (Base Sensitivity)"
            >
              L1
            </button>

            {/* L2 Button */}
            <button
              type="button"
              disabled={!opt.enabled}
              onClick={() => updateOption(setter, opt.id, { l2: !isL2Active })}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all select-none cursor-pointer",
                opt.enabled && isL2Active
                  ? "bg-purple-600/20 text-purple-400 border-purple-500/40 hover:bg-purple-600/30 shadow-sm shadow-purple-500/10"
                  : "bg-white/[0.02] text-zinc-600 border-white/5 hover:text-zinc-400"
              )}
              title="Toggle Level 2 Detection (Advanced Heuristic)"
            >
              L2
            </button>

            {/* L3 Button */}
            <button
              type="button"
              disabled={!opt.enabled}
              onClick={() => updateOption(setter, opt.id, { l3: !isL3Active })}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all select-none cursor-pointer",
                opt.enabled && isL3Active
                  ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30 shadow-sm shadow-emerald-500/10"
                  : "bg-white/[0.02] text-zinc-600 border-white/5 hover:text-zinc-400"
              )}
              title="Toggle Level 3 Detection (Deep Matrix / Strict Scan)"
            >
              L3
            </button>
          </div>

          {/* Log Action Button */}
          <button
            type="button"
            disabled={!opt.enabled}
            onClick={() => updateOption(setter, opt.id, { log: !isLogActive })}
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all select-none cursor-pointer",
              opt.enabled && isLogActive
                ? "bg-cyan-600/20 text-cyan-400 border-cyan-500/40 hover:bg-cyan-600/30 shadow-sm shadow-cyan-500/10"
                : "bg-white/[0.02] text-zinc-600 border-white/5 hover:text-zinc-400"
            )}
            title="Toggle Audit Discord Log"
          >
            LOG
          </button>
        </div>
      </div>
    );
  };

  // Helper for quick batch controls per category tab
  const renderBatchBar = (
    setter: React.Dispatch<React.SetStateAction<AnticheatOption[]>>,
    label: string
  ) => {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 px-3.5 bg-[#090e18] border border-white/10 rounded-xl mb-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-300 font-medium">
          <Sliders className="h-3.5 w-3.5 text-blue-400" />
          <span>{label} Quick Controls:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => batchUpdate(setter, { enabled: true, l1: true, l2: true, l3: true })}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 border border-white/10 text-[10px] font-mono font-semibold text-zinc-300 transition-colors"
          >
            Enable All
          </button>
          <button
            type="button"
            onClick={() => batchUpdate(setter, { enabled: false, l1: false, l2: false, l3: false })}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 text-[10px] font-mono font-semibold text-zinc-300 transition-colors"
          >
            Disable All
          </button>
          <span className="text-zinc-600 px-0.5">|</span>
          <button
            type="button"
            onClick={() => batchUpdate(setter, { l1: true })}
            className="px-2 py-0.5 rounded bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-[10px] font-mono font-bold text-blue-400 transition-colors"
          >
            All L1
          </button>
          <button
            type="button"
            onClick={() => batchUpdate(setter, { l2: true })}
            className="px-2 py-0.5 rounded bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-[10px] font-mono font-bold text-purple-400 transition-colors"
          >
            All L2
          </button>
          <button
            type="button"
            onClick={() => batchUpdate(setter, { l3: true })}
            className="px-2 py-0.5 rounded bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400 transition-colors"
          >
            All L3
          </button>
          <span className="text-zinc-600 px-0.5">|</span>
          <button
            type="button"
            onClick={() => batchUpdate(setter, { action: 'ban', log: false })}
            className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[10px] font-mono font-bold text-rose-400 transition-colors"
          >
            All BAN
          </button>
          <button
            type="button"
            onClick={() => batchUpdate(setter, { action: 'kick', log: false })}
            className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-400 transition-colors"
          >
            All KICK
          </button>
          <button
            type="button"
            onClick={() => batchUpdate(setter, { action: 'logs', log: true })}
            className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-400 transition-colors"
          >
            All LOGS
          </button>
        </div>
      </div>
    );
  };

  // Helper for text / number inputs
  const renderInputRow = (
    label: string,
    value: string | number,
    onChange: (val: any) => void,
    type: "text" | "number" = "text",
    unit?: string,
    tooltip?: string
  ) => {
    return (
      <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02] transition-colors gap-3">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <span className="text-xs sm:text-sm font-medium text-zinc-300 truncate">
            {label}
          </span>
          {tooltip && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs bg-[#0c1017] border border-blue-500/20 text-zinc-200 p-2.5 rounded-lg shadow-xl">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Input
            type={type}
            value={value}
            onChange={(e) => {
              const v = type === "number" ? Number(e.target.value) : e.target.value;
              onChange(v);
              markChanged();
            }}
            className="h-8 w-28 sm:w-36 bg-[#060b14] border-white/10 text-xs font-mono text-zinc-200 text-right px-2"
          />
          {unit && <span className="text-xs text-zinc-500 font-mono">{unit}</span>}
        </div>
      </div>
    );
  };

  // Helper for List preview with "Manage List" button
  const renderListRow = (title: string, key: string, items: string[]) => {
    const safeItems = Array.isArray(items) ? items : [];
    return (
      <div className="flex flex-col gap-2 p-3 px-3.5 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-zinc-200">{title}</span>
            <Badge variant="outline" className="text-[10px] font-mono border-white/10 text-zinc-400">
              {safeItems.length} items
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openListDialog(title, key, safeItems)}
            className="h-7 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-md"
          >
            Manage List
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
          {safeItems.length === 0 ? (
            <span className="text-xs text-zinc-500 italic">No entries configured</span>
          ) : (
            safeItems.slice(0, 8).map((it, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px] font-mono bg-white/5 border border-white/10 text-zinc-300 px-1.5 py-0.5">
                {it}
              </Badge>
            ))
          )}
          {safeItems.length > 8 && (
            <span className="text-[10px] text-zinc-500 font-mono self-center">
              +{safeItems.length - 8} more
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-[#070b14] text-white p-4 md:p-6 lg:p-8 overflow-y-auto space-y-4 max-w-[1400px] mx-auto">
      {/* Top Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
          <span className="hover:text-white cursor-pointer font-medium">Dashboard</span>
          <span>&gt;</span>
          <span className="text-zinc-200 font-semibold">{serverName || "Demo Server"}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Configuration
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage your server's configuration
            </p>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Banner (WaveShield style) */}
      {pendingChanges && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 px-4 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-300 font-medium">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>You have unsaved changes. Make sure to save before leaving.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadSettings();
                setPendingChanges(false);
              }}
              className="h-7 text-xs border-amber-500/30 bg-transparent hover:bg-amber-500/20 text-amber-300 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-7 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black px-3 rounded-lg shadow-sm"
            >
              {isSaving ? (
                <RotateCcw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Action Toolbar Card (Exact WaveShield layout) */}
      <Card className="rounded-xl border border-white/10 bg-[#090e18] p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          {/* Full width search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search configuration options..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white/[0.03] border-white/10 text-xs text-white placeholder:text-zinc-500 rounded-lg focus-visible:ring-1 focus-visible:ring-blue-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Buttons: Left (Import, Share, Reset) & Right (Cancel, Save) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShareActiveTab("import");
                  setIsShareOpen(true);
                }}
                className="h-8 text-xs font-medium border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5 text-blue-400" /> Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShareActiveTab("publish");
                  setIsShareOpen(true);
                }}
                className="h-8 text-xs font-medium border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg"
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5 text-blue-400" /> Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                className="h-8 text-xs font-medium border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-zinc-400" /> Reset to Default
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  loadSettings();
                  setPendingChanges(false);
                }}
                disabled={!pendingChanges}
                className="h-8 text-xs font-medium text-zinc-400 hover:text-white disabled:opacity-40 rounded-lg"
              >
                <X className="h-3.5 w-3.5 mr-1.5" /> Cancel Changes
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !pendingChanges}
                className={cn(
                  "h-8 text-xs font-semibold px-4 rounded-lg transition-all",
                  pendingChanges
                    ? "bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30"
                    : "bg-blue-600/40 text-white/50 cursor-not-allowed"
                )}
              >
                {isSaving ? (
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* When Search Query is active: Cross-category matches */}
      {searchQueryTrimmed !== "" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 px-4 rounded-xl bg-[#090e18] border border-blue-500/30">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-400" />
              <span className="text-xs sm:text-sm font-semibold text-white">
                Search results for <span className="text-blue-400 font-mono">"{searchQuery}"</span>
              </span>
              <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/20">
                {searchResults.length} matches
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="h-7 text-xs border-white/10 bg-white/5 text-zinc-300 rounded-lg"
            >
              Clear Search
            </Button>
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {renderConfigCard(
                Search,
                "Matching Detections",
                `Found ${searchResults.length} options matching your filter.`,
                <>
                  {searchResults.map(({ opt, setter }) => renderOptionRow(opt, setter))}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 rounded-xl bg-[#090e18] border border-white/10 text-center">
              <Search className="h-8 w-8 text-zinc-600 mb-2" />
              <p className="text-sm font-semibold text-zinc-300">No configuration options match "{searchQuery}"</p>
              <p className="text-xs text-zinc-500 mt-1">Try another term or clear the search filter.</p>
            </div>
          )}
        </div>
      ) : (
        /* Normal Category Tabs View (Exact WaveShield Pill Style) */
        <Tabs defaultValue="main" className="w-full space-y-4">
          <TabsList className="inline-flex h-auto p-1 w-full justify-start overflow-x-auto bg-[#090e18] border border-white/10 rounded-xl gap-1 scrollbar-none">
            <TabsTrigger
              value="main"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 transition-all"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Main</span>
            </TabsTrigger>
            <TabsTrigger
              value="weapons"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 transition-all"
            >
              <Swords className="h-4 w-4" />
              <span>Weapons</span>
            </TabsTrigger>
            <TabsTrigger
              value="entities"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 transition-all"
            >
              <Car className="h-4 w-4" />
              <span>Entities</span>
            </TabsTrigger>
            <TabsTrigger
              value="explosions"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 transition-all"
            >
              <Bomb className="h-4 w-4" />
              <span>Explosions</span>
            </TabsTrigger>
            <TabsTrigger
              value="network"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 transition-all"
            >
              <Cpu className="h-4 w-4" />
              <span>Network & Injections</span>
            </TabsTrigger>
            <TabsTrigger
              value="lists"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 transition-all"
            >
              <Sliders className="h-4 w-4" />
              <span>Lists & Blacklists</span>
            </TabsTrigger>
            <TabsTrigger
              value="discord"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 transition-all"
            >
              <Webhook className="h-4 w-4" />
              <span>Discord Logs</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-zinc-400 transition-all"
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: MAIN (Player Movement, Combat, Camera) */}
          <TabsContent value="main" className="m-0 space-y-4">
            {renderBatchBar(setPlayerOptions, "Main & Player")}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {/* Card 1: Player Movement */}
              {renderConfigCard(
                ShieldCheck,
                "Movement Detections",
                "Detect and block noclip, speedhack, and teleport exploits",
                <>
                  {playerOptions
                    .filter((o) =>
                      [
                        'Anti Noclip', 'Anti Noclip2', 'Anti Noclip3', 'Anti Noclip4', 'Anti Noclip5',
                        'Anti Bebetter Noclip', 'Anti Parachute Noclip', 'Anti Force Fall',
                        'Anti Speedhack', 'Anti Fast Run', 'Anti SuperJump', 'Anti SuperJump2',
                        'Anti Teleport', 'Anti Teleport2', 'Anti Fling'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setPlayerOptions))}
                </>
              )}

              {/* Card 2: Camera & Client */}
              {renderConfigCard(
                Eye,
                "Client & Camera Detections",
                "Prevent freecam, spectator camera detachment, and invisibility",
                <>
                  {playerOptions
                    .filter((o) =>
                      [
                        'Anti Freecam', 'Anti Freecam2', 'Anti Freecam3', 'Anti Freecam #4',
                        'Anti Freecam #5', 'Anti Freecam #6', 'Anti Spectate', 'Anti Look Around',
                        'Anti Night/ThermalVision', 'Anti invisible', 'Anti invisible2',
                        'Anti OCR', 'Anti Spoof Name', 'Anti Player Blips', 'Anti Block Input', 'Anti LUA Input'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setPlayerOptions))}
                </>
              )}

              {/* Card 3: Health & Combat */}
              {renderConfigCard(
                Swords,
                "Health & Combat Detections",
                "Block godmode, infinite stamina, and health hacks",
                <>
                  {playerOptions
                    .filter((o) =>
                      ['Armour Detection', 'Anti Infinite Stamina'].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setPlayerOptions))}
                  {gameOptions
                    .filter((o) =>
                      [
                        'Anti Godmode', 'Anti Heal Spam', 'Anti Super Punch',
                        'Anti Infinite Roll', 'Anti Model Changer', 'Anti Ped Scale', 'Anti Ragdoll Abuse'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setGameOptions))}
                </>
              )}

              {/* Card 4: Abuse & Harassment */}
              {renderConfigCard(
                ShieldAlert,
                "Abuse & Trolling Detections",
                "Intercept forced animations, freeze commands, and player harassment",
                <>
                  {gameOptions
                    .filter((o) =>
                      [
                        'Anti Rape Player', 'Anti Player Harassment', 'Anti Freeze Player',
                        'Anti Player On Fire', 'Anti Lua Freeze', 'Anti Task Clear Loop',
                        'Anti Animation Injection', 'Anti Player Attach', 'Anti Player Collision Disable',
                        'Anti Clear Tasks', 'Anti Taze'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setGameOptions))}
                </>
              )}

              {/* Card 5: World & Lethal Protections */}
              {renderConfigCard(
                Bomb,
                "World & Lethal Protections",
                "Block mass server kills, crash vehicles, and entity creation spam",
                <>
                  {gameOptions
                    .filter((o) =>
                      [
                        'Anti Kill', 'Anti Kill2', 'Anti Kill All', 'Anti Crash',
                        'Anti Npc Hijack', 'Anti Solo Session', 'Anti Aggresive Peds',
                        'Blacklisted Particles', 'Anti Object Spawn', 'Anti Attach Object to Player',
                        'Anti Unauthorized Entity Spawn'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setGameOptions))}
                </>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: WEAPONS */}
          <TabsContent value="weapons" className="m-0 space-y-4">
            {renderBatchBar(setWeaponOptions, "Weapons & Ammo")}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {/* Card 1: Weapons Spawning */}
              {renderConfigCard(
                Swords,
                "Weapons Spawning & Inventory",
                "Block client-side weapon spawning and weapon injection",
                <>
                  {weaponOptions
                    .filter((o) =>
                      [
                        'Anti Spawn Weapon', 'Anti Spawn Weapon2', 'Anti Spawn Weapon3',
                        'Anti Blacklisted Weapon', 'Anti Weapon Damage Changer', 'Anti Damage Changer',
                        'Anti Spoofed Damage/Weapon', 'Anti Shoot Without Weapon'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setWeaponOptions))}
                </>
              )}

              {/* Card 2: Aim & Combat Cheats */}
              {renderConfigCard(
                Target,
                "Aim & Combat Cheats",
                "Counters automatic aimbot, silent aim, and cheat overlays",
                <>
                  {weaponOptions
                    .filter((o) =>
                      [
                        'Anti Aim Bot', 'Anti Silent Aim', 'Anti Overlay', 'Anti Cheat Overlay2',
                        'Anti Menu Texture', 'Anti Recoil Manip', 'Anti Hitbox Manip', 'Anti No Headshot'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setWeaponOptions))}
                </>
              )}

              {/* Card 3: Ammo & Bullet Exploits */}
              {renderConfigCard(
                Bomb,
                "Ammo & Bullet Exploits",
                "Prevent infinite ammunition, explosive bullets, and rapid fire",
                <>
                  {weaponOptions
                    .filter((o) =>
                      [
                        'Anti NoRecoil', 'Anti NoReload', 'Anti Explosion Bullet',
                        'Anti Explosion Bullet2', 'Anti Infinite Ammo', 'Anti Fast Shoot',
                        'Anti Give Money', 'Anti Kill Punch', 'Anti Pickup Collection'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setWeaponOptions))}
                </>
              )}

              {/* Card 4: Weapon Limits & Thresholds */}
              {renderConfigCard(
                Sliders,
                "Weapon Limits & Thresholds",
                "Numeric security boundaries for ammunition and armour",
                <>
                  {renderInputRow("Max Armour Stat", maxArmour, setMaxArmour, "number", "pts", "Maximum allowable armour before detection")}
                  {renderInputRow("Max Infinite Ammo Threshold", infiniteAmmoMax, setInfiniteAmmoMax, "number", "rnd", "Clip ceiling check")}
                  {renderInputRow("Min Ammo Threshold", infiniteAmmoMin, setInfiniteAmmoMin, "number", "rnd", "Clip floor check")}
                  {renderInputRow("Max Taze Distance", maxTazeDistance, setMaxTazeDistance, "number", "m", "Maximum stun gun distance allowed")}
                </>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: ENTITIES */}
          <TabsContent value="entities" className="m-0 space-y-4">
            {renderBatchBar(setVehicleOptions, "Entities & Vehicles")}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {/* Card 1: Vehicle Movement & Physics */}
              {renderConfigCard(
                Car,
                "Vehicle Movement & Physics",
                "Prevent vehicle throwing, airborne boost, and handling speedhacks",
                <>
                  {vehicleOptions
                    .filter((o) =>
                      [
                        'Anti Throw Vehicle', 'Anti Carry Vehicle', 'Anti Boost vehicle',
                        'Anti Launch/Fly Vehicle', 'Anti Car Speed Hack', 'Anti Bug Vehicle',
                        'Anti Entity Manipulation', 'Anti Clone Player'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setVehicleOptions))}
                </>
              )}

              {/* Card 2: Vehicle Management & Actions */}
              {renderConfigCard(
                Car,
                "Vehicle Actions & Integrity",
                "Block unauthorized repair, vehicle bring, delete, and plate changing",
                <>
                  {vehicleOptions
                    .filter((o) =>
                      [
                        'Anti Bring Vehicle', 'Anti Bring All Vehicles', 'Anti Repair Vehicle',
                        'Anti Delete Vehicle', 'Anti Vehicle Weapon', 'Anti Plate Changer',
                        'Anti Vehicle Mod Abuse'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setVehicleOptions))}
                </>
              )}

              {/* Card 3: Entity Spawning */}
              {renderConfigCard(
                Layers,
                "Entity & Ped Spawning",
                "Prevent mass spawning and unauthorized ped creation",
                <>
                  {vehicleOptions
                    .filter((o) =>
                      [
                        'Anti Vehicle Spam', 'Anti Spawn Vehicle/Entity', 'Anti Spawn Entity',
                        'Anti Spawn Ped', 'Anti Blacklisted Vehicle', 'Anti Blacklisted Ped'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setVehicleOptions))}
                </>
              )}

              {/* Card 4: Entity Limits (Config.MaxSpawn) */}
              {renderConfigCard(
                Sliders,
                "Spawn Limits (Config.MaxSpawn)",
                "Maximum entity limits enforced per player and globally",
                <>
                  {renderInputRow("Max Vehicles / Player", maxVehiclesPerPlayer, setMaxVehiclesPerPlayer, "number")}
                  {renderInputRow("Max Peds / Player", maxPedsPerPlayer, setMaxPedsPerPlayer, "number")}
                  {renderInputRow("Max Props / Player", maxPropsPerPlayer, setMaxPropsPerPlayer, "number")}
                  {renderInputRow("Global Vehicles Limit", maxVehiclesGlobal, setMaxVehiclesGlobal, "number")}
                  {renderInputRow("Global Peds Limit", maxPedsGlobal, setMaxPedsGlobal, "number")}
                  {renderInputRow("Global Props Limit", maxPropsGlobal, setMaxPropsGlobal, "number")}
                </>
              )}

              {/* Card 5: Smart Prop Delete (Config.SmartPropDelete) */}
              {renderConfigCard(
                ShieldCheck,
                "Smart Prop Delete Engine",
                "Automated detection and cleanup of giant / detached troll props",
                <>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Enable Smart Prop Delete</span>
                    <Switch checked={smartPropEnabled} onCheckedChange={(c) => { setSmartPropEnabled(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Auto Delete Offending Props</span>
                    <Switch checked={smartPropAutoDelete} onCheckedChange={(c) => { setSmartPropAutoDelete(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Ban Suspicious Prop Spawners</span>
                    <Switch checked={smartPropBanSuspicious} onCheckedChange={(c) => { setSmartPropBanSuspicious(c); markChanged(); }} />
                  </div>
                  {renderInputRow("Max Prop Size", smartPropMaxSize, setSmartPropMaxSize, "number", "m")}
                  {renderInputRow("Min Player Distance", smartPropMinDist, setSmartPropMinDist, "number", "m")}
                  {renderInputRow("Max Player Distance", smartPropMaxDist, setSmartPropMaxDist, "number", "m")}
                </>
              )}
            </div>
          </TabsContent>

          {/* TAB 4: EXPLOSIONS */}
          <TabsContent value="explosions" className="m-0 space-y-4">
            {renderBatchBar(setExplosionOptions, "Explosions")}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {/* Card 1: Explosion Detections */}
              {renderConfigCard(
                Bomb,
                "Explosion Detections",
                "Intercept and cancel malicious server/client explosion events",
                <>
                  {explosionOptions.map((opt) => renderOptionRow(opt, setExplosionOptions))}
                </>
              )}

              {/* Card 2: AntiCrash Engine (Config.AntiCrash) */}
              {renderConfigCard(
                ShieldCheck,
                "AntiCrash Engine (Config.AntiCrash)",
                "Heuristic entity, particle, and scenario crash protection",
                <>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">AntiCrash Active</span>
                    <Switch checked={antiCrashEnabled} onCheckedChange={(c) => { setAntiCrashEnabled(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Filter Crash Models</span>
                    <Switch checked={antiCrashModels} onCheckedChange={(c) => { setAntiCrashModels(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Filter Crash Explosions</span>
                    <Switch checked={antiCrashExplosions} onCheckedChange={(c) => { setAntiCrashExplosions(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Filter Crash Particles</span>
                    <Switch checked={antiCrashParticles} onCheckedChange={(c) => { setAntiCrashParticles(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Filter Invalid Scenarios</span>
                    <Switch checked={antiCrashScenarios} onCheckedChange={(c) => { setAntiCrashScenarios(c); markChanged(); }} />
                  </div>
                </>
              )}

              {/* Card 3: Explosion Radius Limit */}
              {renderConfigCard(
                Sliders,
                "Explosion Parameters",
                "Radius threshold bounds for allowable explosion blasts",
                <>
                  {renderInputRow("Max Explosion Radius", explosionDistance, setExplosionDistance, "number", "m", "Distance limit beyond which explosions are auto-cancelled")}
                </>
              )}
            </div>
          </TabsContent>

          {/* TAB 5: NETWORK & INJECTIONS */}
          <TabsContent value="network" className="m-0 space-y-4">
            {renderBatchBar(setNetworkOptions, "Network & Injections")}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {/* Card 1: Executors & Menus */}
              {renderConfigCard(
                Cpu,
                "Executors & Cheat Menus",
                "Detect active cheat executor signatures and menu frameworks",
                <>
                  {networkOptions
                    .filter((o) =>
                      [
                        'Anti Lua Menu', 'Anti Lua Executor', 'Anti Cheat Menu', 'Anti cheat Menu',
                        'Anti AC Scanner', 'Anti Bytecode Injection'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setNetworkOptions))}
                </>
              )}

              {/* Card 2: Advanced Hooks & Low-Level */}
              {renderConfigCard(
                ShieldAlert,
                "Advanced Hooks & Low-Level",
                "Prevent memory function hooking, export hijacking, and loadstring calls",
                <>
                  {networkOptions
                    .filter((o) =>
                      [
                        'Anti Global Function Hook', 'Anti Native Hook', 'Anti Loadstring',
                        'Anti Citizen.Invoke Abuse', 'Anti Export Hijack', 'Anti Shared Object Override',
                        'Anti Resource Rename Bypass'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setNetworkOptions))}
                </>
              )}

              {/* Card 3: Network & Event Protection */}
              {renderConfigCard(
                Network,
                "Network, Events & Triggers",
                "Filter remote event invocations, rate limits, and tokens",
                <>
                  {networkOptions
                    .filter((o) =>
                      [
                        'Anti Trigger Event', 'blacklisted Trigger', 'Anti Event Token Bypass',
                        'Anti Spam Trigger', 'Anti Resource Injection', 'Anti Stop Resource',
                        'Anti Unknown Resource', 'Anti Spoof', 'Anti Cipher', 'Anti Vpn',
                        'Anti Afk', 'Anti NUI Blocker', 'Anti DevTools', 'Anti Voice Exploits',
                        'Anti Global Voice', 'Anti Inventory Exploit', 'Cheat Ai Detection',
                        'Anti Unauthorized Admin'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setNetworkOptions))}
                </>
              )}

              {/* Card 4: Cheat Menu Functions Blocking */}
              {renderConfigCard(
                Shield,
                "Cheat Menu Functions Blocking",
                "Block specific internal functions utilized by cheat menus",
                <>
                  {networkOptions
                    .filter((o) =>
                      [
                        'Anti Cheat Menu Functions', 'Anti Cheat Spawn Functions',
                        'Anti Cheat Teleport Functions', 'Anti Cheat Weapon Functions',
                        'Anti Cheat Vehicle Functions', 'Anti Cheat Ped Functions',
                        'Anti Cheat Object Functions', 'Anti Cheat Explosion Functions',
                        'Anti Cheat Spectate', 'Anti Cheat Force Functions',
                        'Anti Cheat Clone Functions', 'Anti Cheat Cage Functions',
                        'Anti Cheat Inventory Exploit', 'Anti cheat Menu Functions',
                        'Anti cheat API Functions', 'Anti cheat Spectate', 'Anti cheat Bypass Functions'
                      ].includes(o.id)
                    )
                    .map((opt) => renderOptionRow(opt, setNetworkOptions))}
                </>
              )}

              {/* Card 5: Advanced Spoof Detection Engine */}
              {renderConfigCard(
                ShieldCheck,
                "Spoof Detection Engine (Config.SpoofDetection)",
                "Multi-layer token entropy, hardware signature, and IP verification",
                <>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Spoof Detection Active</span>
                    <Switch checked={spoofEnabled} onCheckedChange={(c) => { setSpoofEnabled(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Require License Identifier</span>
                    <Switch checked={spoofRequireLicense} onCheckedChange={(c) => { setSpoofRequireLicense(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Require Steam Identifier</span>
                    <Switch checked={spoofRequireSteam} onCheckedChange={(c) => { setSpoofRequireSteam(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Hardware Fingerprint Validation</span>
                    <Switch checked={spoofFingerprint} onCheckedChange={(c) => { setSpoofFingerprint(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Verify Network IP Address</span>
                    <Switch checked={spoofCheckIP} onCheckedChange={(c) => { setSpoofCheckIP(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Token Recycling Detection</span>
                    <Switch checked={spoofTokenRecycling} onCheckedChange={(c) => { setSpoofTokenRecycling(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Entropy Analysis</span>
                    <Switch checked={spoofEntropy} onCheckedChange={(c) => { setSpoofEntropy(c); markChanged(); }} />
                  </div>
                  {renderInputRow("Minimum Tokens Count", spoofMinTokens, setSpoofMinTokens, "number")}
                  {renderInputRow("Flags to Block Connection", spoofMinFlagsToBlock, setSpoofMinFlagsToBlock, "number")}
                  {renderInputRow("Flags to Issue Auto-Ban", spoofMinFlagsToBan, setSpoofMinFlagsToBan, "number")}
                </>
              )}
            </div>
          </TabsContent>

          {/* TAB 6: LISTS & BLACKLISTS */}
          <TabsContent value="lists" className="m-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {/* Card 1: Triggers & Server Events */}
              {renderConfigCard(
                Layers,
                "Trigger & Event Security",
                "Blacklisted and whitelisted server events and triggers",
                <>
                  {renderListRow("Blacklisted Triggers", "blacklistedTriggers", blacklistedTriggers)}
                  {renderListRow("Whitelisted Triggers", "whitelistedTriggers", whitelistedTriggers)}
                </>
              )}

              {/* Card 2: Resource Whitelists */}
              {renderConfigCard(
                Layers,
                "Resource Whitelists",
                "Permitted FiveM resource names for executions and spawning",
                <>
                  {renderListRow("Full Whitelist Resources", "fullWhitelistResources", fullWhitelistResources)}
                  {renderListRow("Allowed Resources", "allowedResources", allowedResources)}
                  {renderListRow("Allowed Vehicle Spawn Resources", "allowedVehicleSpawnResources", allowedVehicleSpawnResources)}
                </>
              )}

              {/* Card 3: Model & Entity Blacklists */}
              {renderConfigCard(
                Car,
                "Model & Weapon Blacklists",
                "Restricted vehicles, peds, weapons, and spawned props",
                <>
                  {renderListRow("Blacklisted Vehicles", "blacklistedVehicles", blacklistedVehicles)}
                  {renderListRow("Blacklisted Peds", "blacklistedPeds", blacklistedPeds)}
                  {renderListRow("Whitelisted Peds", "whiteListPeds", whiteListPeds)}
                  {renderListRow("Blacklisted Weapons", "blacklistedWeapons", blacklistedWeapons)}
                  {renderListRow("Blacklisted Props", "blacklistedProps", blacklistedProps)}
                </>
              )}

              {/* Card 4: Commands & Words */}
              {renderConfigCard(
                Sliders,
                "Commands, Words & Plates",
                "Restricted text patterns, console commands, and license plates",
                <>
                  {renderListRow("Blacklisted Menu Words", "blacklistedMenuWords", blacklistedMenuWords)}
                  {renderListRow("Blacklisted Commands", "blacklistedCommands", blacklistedCommands)}
                  {renderListRow("Blacklisted Names", "blacklistedNames", blacklistedNames)}
                  {renderListRow("Blacklisted Vehicle Plates", "blackListedVehiclePlates", blackListedVehiclePlates)}
                  {renderListRow("Blocked Animations", "blockedAnimations", blockedAnimations)}
                </>
              )}

              {/* Card 5: Admin & Job Roles */}
              {renderConfigCard(
                UserCheck,
                "Permissions & Exemptions",
                "Admin groups and staff roles exempted from anticheat checks",
                <>
                  {renderListRow("Admin Groups", "adminGroups", adminGroups)}
                  {renderListRow("Exempt Groups", "exemptGroups", exemptGroups)}
                  {renderListRow("Inventory Allowed Jobs", "inventoryAllowedJobs", inventoryAllowedJobs)}
                </>
              )}
            </div>
          </TabsContent>

          {/* TAB 7: DISCORD LOGS */}
          <TabsContent value="discord" className="m-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {/* Card 1: Webhook Channels */}
              {renderConfigCard(
                Webhook,
                "Webhook Channels",
                "Direct Discord channel webhook URLs for audit logging",
                <>
                  {renderInputRow("Bans Webhook URL", logsBans, setLogsBans, "text", "", "Destination for automated ban embed notifications")}
                  {renderInputRow("Connection Logs Webhook", logsConnection, setLogsConnection, "text", "", "Player join events")}
                  {renderInputRow("Leave Logs Webhook", logsLeave, setLogsLeave, "text", "", "Player disconnect events")}
                  {renderInputRow("General Anticheat Webhook", logsWebhook, setLogsWebhook, "text", "", "Generic violation alerts")}
                </>
              )}

              {/* Card 2: Ban Video Clip Capture */}
              {renderConfigCard(
                Eye,
                "Ban Video Clip Proof Engine",
                "Automated in-game video recording and clip upload for detections",
                <>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Enable Ban Video Clips</span>
                    <Switch checked={banClipEnabled} onCheckedChange={(c) => { setBanClipEnabled(c); markChanged(); }} />
                  </div>
                  {renderInputRow("Clip Duration", banClipDurationMs, setBanClipDurationMs, "number", "ms", "Buffer length of the recorded proof clip")}
                  {renderInputRow("Video Bitrate", banClipVideoBitsPerSecond, setBanClipVideoBitsPerSecond, "number", "bps", "Encoding bandwidth")}
                </>
              )}
            </div>
          </TabsContent>

          {/* TAB 8: SETTINGS (Server & Pure Mode) */}
          <TabsContent value="settings" className="m-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {/* Card 1: Server Identity */}
              {renderConfigCard(
                Globe,
                "Server Identity",
                "General FiveM server metadata and display settings",
                <>
                  {renderInputRow("Server Display Name", serverName, setServerName)}
                  {renderInputRow("Discord Invite Link", discordInvite, setDiscordInvite)}
                  {renderInputRow("Server Logo URL", serverLogo, setServerLogo)}
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Require Discord Linked</span>
                    <Switch checked={requireDiscord} onCheckedChange={(c) => { setRequireDiscord(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Show VexShield Banner</span>
                    <Switch checked={showAirBanner} onCheckedChange={(c) => { setShowAirBanner(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Framework</span>
                    <Select value={framework} onValueChange={(v) => { setFramework(v); markChanged(); }}>
                      <SelectTrigger className="w-32 h-8 text-xs bg-[#060b14] border-white/10 text-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto Detect</SelectItem>
                        <SelectItem value="esx">ESX Legacy</SelectItem>
                        <SelectItem value="qbcore">QBCore</SelectItem>
                        <SelectItem value="qbox">Qbox</SelectItem>
                        <SelectItem value="standalone">Standalone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Interface Language</span>
                    <Select value={language} onValueChange={(v) => { setLanguage(v); markChanged(); }}>
                      <SelectTrigger className="w-32 h-8 text-xs bg-[#060b14] border-white/10 text-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English (EN)</SelectItem>
                        <SelectItem value="fr">Français (FR)</SelectItem>
                        <SelectItem value="de">Deutsch (DE)</SelectItem>
                        <SelectItem value="es">Español (ES)</SelectItem>
                        <SelectItem value="ar">العربية (AR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Card 2: Pure Mode & FiveM Security */}
              {renderConfigCard(
                ShieldCheck,
                "Pure Mode & FiveM Security",
                "Enforce FiveM server pure mode and native engine validations",
                <>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Pure Mode Active</span>
                    <Switch checked={pureModeEnabled} onCheckedChange={(c) => { setPureModeEnabled(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Pure Mode Level</span>
                    <Select value={pureLevel} onValueChange={(v) => { setPureLevel(v); markChanged(); }}>
                      <SelectTrigger className="w-28 h-8 text-xs bg-[#060b14] border-white/10 text-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Level 1 (Basic)</SelectItem>
                        <SelectItem value="2">Level 2 (Strict)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">ScriptHook Allowed</span>
                    <Select value={scriptHookAllowed} onValueChange={(v) => { setScriptHookAllowed(v); markChanged(); }}>
                      <SelectTrigger className="w-28 h-8 text-xs bg-[#060b14] border-white/10 text-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 (Blocked)</SelectItem>
                        <SelectItem value="1">1 (Allowed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Require Steam Identifier</span>
                    <Switch checked={requireSteam} onCheckedChange={(c) => { setRequireSteam(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Log IP Information</span>
                    <Switch checked={logIPInformation} onCheckedChange={(c) => { setLogIPInformation(c); markChanged(); }} />
                  </div>
                  {renderInputRow("Min Online Seconds Before Ban", minOnlineSeconds, setMinOnlineSeconds, "number", "sec")}
                </>
              )}

              {/* Card 3: Auto Installer (Config.AutoInstaller) */}
              {renderConfigCard(
                Layers,
                "Auto Installer (Config.AutoInstaller)",
                "Automatic injection checker and resource scanner",
                <>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Auto Installer Active</span>
                    <Switch checked={autoInstallerEnabled} onCheckedChange={(c) => { setAutoInstallerEnabled(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Block Missing Injection</span>
                    <Switch checked={blockMissingInjection} onCheckedChange={(c) => { setBlockMissingInjection(c); markChanged(); }} />
                  </div>
                  <div className="flex items-center justify-between p-2.5 px-3.5 hover:bg-white/[0.02]">
                    <span className="text-xs sm:text-sm font-medium text-zinc-300">Auto Restart On Install</span>
                    <Switch checked={autoRestartOnInstall} onCheckedChange={(c) => { setAutoRestartOnInstall(c); markChanged(); }} />
                  </div>
                  {renderListRow("Ignored Resources", "ignoredResources", ignoredResources)}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Share / Community Profile Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="max-w-md bg-[#090e18] border-white/10 text-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-400" />
              <span>Share & Import Configuration</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Share your configuration profile with other servers or import a profile code.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={shareActiveTab} onValueChange={(v: any) => setShareActiveTab(v)} className="w-full mt-2">
            <TabsList className="grid grid-cols-2 bg-white/5 border border-white/10 rounded-lg p-1">
              <TabsTrigger value="publish" className="text-xs rounded-md">Publish & Share</TabsTrigger>
              <TabsTrigger value="import" className="text-xs rounded-md">Import Code</TabsTrigger>
            </TabsList>

            <TabsContent value="publish" className="space-y-3 mt-3">
              <div>
                <Label className="text-xs text-zinc-300">Server Profile Type</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={shareServerType === "rp" ? "default" : "outline"}
                    onClick={() => setShareServerType("rp")}
                    className={cn("flex-1 text-xs rounded-lg", shareServerType === "rp" ? "bg-blue-600" : "border-white/10")}
                  >
                    Roleplay (RP)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={shareServerType === "pvp" ? "default" : "outline"}
                    onClick={() => setShareServerType("pvp")}
                    className={cn("flex-1 text-xs rounded-lg", shareServerType === "pvp" ? "bg-blue-600" : "border-white/10")}
                  >
                    Competitive PvP
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-zinc-300">Description</Label>
                <Input
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  placeholder="e.g. Balanced RP settings with strict vehicle & weapon checks"
                  className="h-8 bg-white/5 border-white/10 text-xs mt-1"
                />
              </div>

              {shareCode && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <span className="text-[10px] text-blue-300 font-medium block">Your Share Code:</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono text-base font-bold text-white">{shareCode}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(shareCode);
                        toast({ title: "Copied Share Code!" });
                      }}
                      className="h-7 text-xs border-blue-500/40 text-blue-300"
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  </div>
                </div>
              )}

              <Button
                onClick={handlePublishConfig}
                disabled={isPublishing}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-9 rounded-lg mt-2"
              >
                {isPublishing ? "Publishing..." : "Generate & Copy Share Code"}
              </Button>
            </TabsContent>

            <TabsContent value="import" className="space-y-3 mt-3">
              <div>
                <Label className="text-xs text-zinc-300">Enter Share Code</Label>
                <Input
                  value={importShareCode}
                  onChange={(e) => setImportShareCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AIR-ABCD"
                  className="h-9 bg-white/5 border-white/10 text-sm font-mono mt-1 uppercase"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Importing will load the shared profile's options into your editor. You can review them before clicking Save.
              </p>
              <Button
                onClick={handleImportSharedConfig}
                disabled={isImporting || !importShareCode.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-9 rounded-lg mt-2"
              >
                {isImporting ? "Importing..." : "Load Profile Into Editor"}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* List Modal Dialog (Edit textarea for blacklists / whitelists) */}
      <Dialog open={!!activeModalList} onOpenChange={(open) => !open && setActiveModalList(null)}>
        <DialogContent className="max-w-lg bg-[#090e18] border-white/10 text-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sliders className="h-4 w-4 text-blue-400" />
              <span>Edit {activeModalList?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              One entry per line. Empty lines will be removed automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <Textarea
              value={modalTextContent}
              onChange={(e) => setModalTextContent(e.target.value)}
              className="min-h-[220px] font-mono text-xs bg-[#060b14] border-white/10 text-zinc-200 rounded-lg p-3 resize-y"
              spellCheck={false}
              placeholder="entry_one&#10;entry_two&#10;..."
            />

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-mono">
                {modalTextContent.split('\n').filter((l) => l.trim()).length} total entries
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveModalList(null)}
                className="h-8 text-xs text-zinc-400 hover:text-white rounded-lg"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveListDialog}
                className="h-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg px-4"
              >
                Apply Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
