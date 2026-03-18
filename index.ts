// Register background notification handler BEFORE expo-router loads.
// This must be at the top-level so the task is defined when Android
// broadcasts a notification action while the app is closed.
import "./src/background";

import "expo-router/entry";
