# Ricochet Arcade - Android Edition

<img width="1276" height="721" alt="image" src="https://github.com/user-attachments/assets/ffe265ff-d74a-4352-a458-543b5c60cdc1" />

Welcome to **Ricochet Arcade HD** for Android! This is a mobile port of the classic 2D physics-based arcade puzzle game, completely rebuilt from the C++ (SFML) original using modern web technologies (HTML5 Canvas & JavaScript) and wrapped into a native Android application using Capacitor.

## Rules & Gameplay
The rules remain true to the classic arcade experience:
1. You control a paddle at the bottom of the screen.
2. Aim and bounce the ball to destroy the layout of targets (bricks) above.
3. The ball reflects off the walls, the ceiling, and your paddle based on the angle of incidence.
4. If the ball hits a target, the target is destroyed, increasing your score.
5. You must clear all targets on the screen to accomplish the mission and clear the stage.
6. If the ball falls past your paddle at the bottom of the screen, it's Game Over!

### Controls (Touch)
- **Left / Right Movement**: Tap and hold the on-screen `◀` and `▶` virtual buttons to move your paddle.
- **Menu Navigation**: Tap directly on the menu items (`PLAY`, `OPTIONS`, `EXIT`) to interact with them.

## Tech Stack
- **Game Engine**: Custom-built HTML5 Canvas Engine (Vanilla JavaScript).
- **Audio Engine**: Web Audio API (Procedural chiptune sound effects & BGM).
- **Native Wrapper**: Ionic Capacitor (Android Studio/Gradle integration).

## How to Build and Run for Android

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- [Android Studio](https://developer.android.com/studio) (with Android SDK & Emulators installed)
- Java Development Kit (JDK) 17+

### Installation & Build Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Esmocca/Ricochet-Android.git
   cd Ricochet-Android
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Sync the project with Capacitor:**
   This step copies all your web assets (HTML/JS/CSS) into the native Android folder.
   ```bash
   npx cap sync android
   ```

4. **Run the game on a connected Android device or Emulator:**
   You can either open Android Studio to build the app manually:
   ```bash
   npx cap open android
   ```
   *Or* run it directly via Capacitor CLI (ensure your emulator is running or phone is plugged in via USB Debugging):
   ```bash
   npx cap run android
   ```

## Development (Web Version)
If you want to test the game logic quickly in a browser without building the Android app:
- Simply open `index.html` (located in the root folder or `/dist`) in any modern web browser.
- Use `A`/`D` or `Left/Right Arrow Keys` to play on a keyboard.

## Credits
Game By: **Esmoocca**
