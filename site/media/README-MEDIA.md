# Valheim Modding 101 (`v3.0`) — Media Drop-In Hub (`site/media/`)

Welcome to the **Media Drop-In Hub** for Step 0 (`0. Picture Overview`). This folder powers the visual storyboard panels, optional video overview player, and optional **Google NotebookLM Audio Overview** player at the top of the interactive guide.

---

## 1. Directory Layout & Zero-Server Auto-Detection (`file://` Ready)

```text
site/media/
├── README-MEDIA.md                           # This guide + copy-paste NotebookLM source script
├── panels/                                   # 4 visual storyboard panels rendered in Step 0
│   ├── panel-1-what-is-a-mod.png             # Panel 1: What a Mod Really Is (Add-on card mental model)
│   ├── panel-2-three-places-on-pc.png        # Panel 2: The 3 Places on Your PC (Save Vault separation)
│   ├── panel-3-mod-profiles.png              # Panel 3: Steam Folder vs. Mod Manager Profiles
│   └── panel-4-four-simple-tools.png         # Panel 4: The 4 Simple Tools (.NET, Valheim, BepInEx, Harmony)
├── video/
│   ├── overview-video.mp4                    # Live 3m 15s NotebookLM Video Overview (faststart H.264/AAC)
│   └── overview-poster.jpg                   # Poster frame (00:00:47 Viking longhouse cutaway schematic)
└── audio/
    └── notebooklm-audio-overview.mp3         # Extracted 3m 15s audio-only MP3 track (~2.0 MB)
```

### How Automatic Detection Works (Even Over `file://`)
`video/overview-video.mp4` (`3m 15s`, faststart-enabled) and `audio/notebooklm-audio-overview.mp3` ship pre-installed in `site/media/`, paired with `video/overview-poster.jpg`.

- **No Web Server Required:** Because browsers block `fetch()` / `HEAD` requests on local `file://` URLs, Step 0 (`0. Picture Overview`) uses native HTML5 `<video>` and `<audio>` media metadata probing (`loadedmetadata` and `duration > 0` vs. `error`/`emptied`).
- **When a slot is `0 bytes`:** Step 0 cleanly hides the empty media element and shows a friendly **"Drop-In Media Slot Ready"** card explaining where to drop your `.mp4`, `.mp3`, or `.wav` file and how to generate one in 60 seconds with NotebookLM.
- **As soon as you overwrite any placeholder with a real file:** Simply refresh `site/index.html` in your browser! Step 0 automatically detects the valid media stream and switches to the interactive HTML5 Video or Audio player with chapter markers.

---

## 2. How the 4 Visual Storyboard Panels Work (`site/media/panels/`)

Step 0 (`0. Picture Overview`) is built around a **4-Panel Visual Storyboard** designed so a complete beginner can grasp the entire Valheim modding architecture in 60 seconds before reading a single line of code:

1. **`panel-1-what-is-a-mod.png` — Panel 1: What a Mod Really Is**
   - Shows that a Valheim mod (`HelloValheim.dll`, ~10 KB) is like a **clip-on lens** or cartridge. It never edits or overwrites `valheim.exe`; BepInEx simply loads it into memory when the game boots, and removing the file returns your game to 100% vanilla in 1 second.
2. **`panel-2-three-places-on-pc.png` — Panel 2: The 3 Separate Places on Your PC**
   - Visualizing why **your characters and worlds are 100% safe**:
     - **Place 1 (Modding Folder):** `valheim-modding-101/starter-mod/` where you edit `HelloValheimPlugin.cs`.
     - **Place 2 (Game / Profile Plugins Folder):** `BepInEx/plugins/HelloValheim/` where the compiled `HelloValheim.dll` is copied.
     - **Place 3 (The Untouched Save Vault):** `AppData\LocalLow\IronGate\Valheim` (Windows) or `~/.config/unity3d/IronGate/Valheim` (Linux), where your characters (`.fch`) and worlds (`.db`/`.fwl`) live completely untouched by our build scripts.
3. **`panel-3-mod-profiles.png` — Panel 3: Direct Steam vs. Mod Manager Profiles**
   - Explains how mod managers (`Thunderstore Mod Manager`, `r2modman`, `Gale`) keep your Steam Valheim directory **100% clean vanilla** and store `BepInEx/plugins/` inside isolated profile folders—and how `./tools/doctor` and `./tools/build-and-deploy` automatically discover both multi-drive Steam libraries (`libraryfolders.vdf`) and all Mod Manager profiles.
4. **`panel-4-four-simple-tools.png` — Panel 4: The 4 Simple Tools**
   - Introduces the only four ingredients behind every Valheim 1.0 mod: **.NET 8 SDK** (turns `.cs` text into `.dll`), **Valheim 1.0 (`assembly_valheim.dll`)**, **BepInEx 5.4.2202** (the mod loader), and **Harmony 2** (Postfix/Prefix hooks that attach after vanilla methods run).

You can replace any of the 4 PNGs in `site/media/panels/` with custom high-resolution illustrations or screenshots at any time—just keep the same filenames (`panel-1-what-is-a-mod.png` through `panel-4-four-simple-tools.png`).

---

## 3. Generate a 90-Second Google NotebookLM Audio Overview (or Video)

Want a warm, 90-second podcast-style **Audio Overview** (or video narration) walking through the 4 panels while you look at Step 0? You can generate one for free in **Google NotebookLM**:

### Quick Steps
1. Open [Google NotebookLM](https://notebooklm.google.com/) and click **+ New Notebook**.
2. In the **Add Sources** dialog, choose **Copied text**, paste the **NotebookLM Source Document** below, and click **Insert**.
3. In the **Audio Overview** panel on the right, click **Customize** (next to *Generate*) and paste the **Host Prompt** below so the hosts keep it crisp, beginner-friendly, and around 90 seconds.
4. Once generated, click the **three dots (`⋮`) → Download** on the audio player.
5. Save the downloaded file as:
   - `site/media/audio/notebooklm-audio-overview.wav` (or `.mp3`), **or**
   - If you record/export an MP4 video walkthrough, save it as `site/media/video/overview-video.mp4`.
6. Refresh `site/index.html`—the player in Step 0 (`0. Picture Overview`) will light up automatically!

---

### Copy-Paste #1: NotebookLM "Customize" Host Prompt

```text
Create a warm, upbeat, jargon-free 90-second beginner orientation for someone opening "Valheim Modding 101 (v3.0)" for the very first time.
Walk the listener through the 4 Picture Overview panels in order:
1. What a mod actually is (a tiny 10 KB HelloValheim.dll clip-on file—never overwriting valheim.exe).
2. The 3 separate places on your PC, reassuring them that their Valheim characters and worlds live in a separate IronGate Save Vault that our scripts never touch.
3. How Mod Manager profiles (r2modman, Thunderstore, Gale) keep the Steam folder clean while our doctor and build-and-deploy scripts auto-find both multi-drive Steam folders and Mod Manager profiles.
4. How the 4 simple tools (.NET SDK, Valheim, BepInEx, Harmony) work together so they can run doctor, run build-and-deploy, press F5 in Valheim, type "vikingping", and get +150 carry weight in 15 minutes—with a 1-second "--reset" undo button anytime.
```

---

### Copy-Paste #2: Complete NotebookLM Source Document & Script

```markdown
# Valheim 1.0 Modding 101 (v3.0) — Picture Overview Source Brief

## Target Audience & Goal
This briefing accompanies Step 0 ("0. Picture Overview") of Valheim Modding 101. The listener is a Valheim player who wants to create or customize their first C# mod for Valheim 1.0.21 (Deep North), without risking their existing characters, worlds, or mod profiles. In 15 minutes, they will compile a real working mod (`HelloValheim.dll`) that adds +150 carry weight, supports live config reloading while the game is running, and adds two F5 console commands (`vikingping` and `vikinginspect`).

---

## Panel 1: What a Mod Really Is (The Clip-On Cartridge Model)
- **The Big Misconception:** Many beginners worry that "modding" means hacking or permanently editing `valheim.exe`. It does not!
- **How It Actually Works:** A Valheim mod is just a tiny, standalone `.dll` file (`HelloValheim.dll`, roughly 10 KB) compiled from a single readable C# text file (`HelloValheimPlugin.cs`).
- **Clip On, Clip Off:** When Valheim starts, a helper loader called **BepInEx** wakes up and checks the `BepInEx/plugins/` folder. If `HelloValheim.dll` is sitting there, BepInEx loads it into memory alongside the game. If you delete `HelloValheim.dll` (or run our 1-second `--reset` command), Valheim boots 100% vanilla as if the mod was never there.

---

## Panel 2: The 3 Separate Places on Your PC (Why Your Saves Are 100% Safe)
Beginners often ask: *"Where do files go on my computer, and could a bug hurt my 300-hour Viking world?"*
There are **3 completely separate folders** on your PC:

1. **Place #1 — Your Workshop (`valheim-modding-101/starter-mod/`):**
   - This is where you read and edit `HelloValheimPlugin.cs` and where the compiler outputs `starter-mod/bin/Release/HelloValheim.dll`.
   - You can experiment freely here without touching the game at all (`--dry-run` mode).

2. **Place #2 — Your Game & Mod Folder (`Valheim/BepInEx/plugins/` or Mod Profile):**
   - This is where Steam stores Valheim (`steamapps/common/Valheim`) and where BepInEx looks for `BepInEx/plugins/HelloValheim/HelloValheim.dll` and its config file `BepInEx/config/com.example.hellovalheim.cfg`.
   - Not sure where Steam installed Valheim? Run `./tools/doctor.ps1 -Open` (Windows) or `bash ./tools/doctor.sh --open` (Linux) and it will find the folder across all your drives (`C:\`, `D:\`, `E:\`, `/mnt/...`) and open it right on your screen!

3. **Place #3 — Your Untouched Save Vault (`IronGate/Valheim`):**
   - Valheim stores all of your characters (`.fch`) and worlds (`.db` / `.fwl`) in a completely separate operating-system folder:
     - **Windows:** `%USERPROFILE%\AppData\LocalLow\IronGate\Valheim`
     - **Linux:** `~/.config/unity3d/IronGate/Valheim`
   - None of the scripts in this course (`doctor`, `build-and-deploy`, or `--reset`) ever write to or delete anything in your Save Vault. Even better, `HelloValheim` only hooks in-memory math (`Player.GetMaxCarryWeight`) and console commands—it never alters your save file format.

---

## Panel 3: Direct Steam Folder vs. Mod Manager Profiles (r2modman, Thunderstore, Gale)
Wait—what if you use a Mod Manager like **Thunderstore Mod Manager**, **r2modman**, or **Gale**?
- **How Mod Managers Work:** When you use a Mod Manager, it deliberately leaves your Steam `steamapps/common/Valheim` folder **100% clean vanilla** (no `BepInEx` folder inside Steam!). Instead, the Mod Manager creates separate **Profile folders** inside your user `AppData` or `.config` directory (for example, `Default`, `Coop-Friends`, or `Mod-Testing`), each with its own `BepInEx/core/`, `BepInEx/plugins/`, and `BepInEx/config/`.
- **Why Older Tutorials Failed:** Traditional tutorials assumed `BepInEx` was always sitting directly inside `C:\Program Files (x86)\Steam\steamapps\common\Valheim`. If you had Valheim on `D:\SteamLibrary` or used `r2modman` / `Gale`, their scripts broke immediately.
- **How v3.0 Solves This Automatically:**
  1. `doctor` parses Steam's `libraryfolders.vdf` across all drives (`C:\`, `D:\`, `E:\`, `/mnt/...`) to find your exact `Valheim` install.
  2. `doctor` also scans `r2modman`, `Thunderstore Mod Manager`, and `Gale` profile directories, telling you clearly whether your Steam folder is **MODDED (Direct BepInEx)** or **CLEAN VANILLA (Safe for Mod Manager Profiles)** and listing every profile on your machine.
  3. `build-and-deploy` automatically compiles against your profile's `BepInEx/core` if Steam is vanilla, deploys `HelloValheim.dll` to your active profile(s) (or a specific profile via `-Profile <Name>` / `--profile <Name>`), and prints every exact destination path so you never have to guess where your mod went.

---

## Panel 4: The 4 Simple Tools & Your 15-Minute First Win
Every Valheim C# mod relies on just four building blocks working together:
1. **.NET 8 SDK (`dotnet build`):** The compiler that translates human-readable C# (`HelloValheimPlugin.cs`) into `HelloValheim.dll`.
2. **Valheim 1.0 (`assembly_valheim.dll`):** The game's own code library (`Player`, `Terminal`, `ZNet`, `EnvMan`) that we reference (with `<Private>false</Private>` so we never copy duplicate engine DLLs).
3. **BepInEx 5.4.2202:** The open-source Unity mod loader that boots with Valheim, creates `BepInEx/LogOutput.log`, and manages `BepInEx/config/` files.
4. **Harmony 2 (`[HarmonyPostfix]`):** The patching library that lets our code politely run *after* a vanilla Valheim method finishes—like adding `+150` to `Player.GetMaxCarryWeight` without replacing Iron Gate's original method.

### Your 3-Step Launch Checklist
- **Step 1 (Safety Check):** Run `.\tools\doctor.ps1` (Windows) or `bash ./tools/doctor.sh` (Linux) to verify all 4 checks pass (`--open` / `-Open` opens your plugins folder).
- **Step 2 (Build & Deploy):** Run `.\tools\build-and-deploy.ps1 -Deploy` or `bash ./tools/build-and-deploy.sh --deploy` to compile and install `HelloValheim.dll`.
- **Step 3 (Prove It In-Game & 1-Second Undo):** Launch Valheim with `-console`, press `F5` at the main menu, and type `vikingping` or `vikinginspect`. Want to remove the mod and its `.cfg` file completely? Run `--reset` / `-Reset` and you are back to 100% vanilla in one second!
```
