# Android Floating Student Assistant (Native Module)

This directory contains the Android-specific implementation of the **Floating Student Assistant** for **GLITCHERS**.

## Architecture & Capabilities

1. **WindowManager Overlay**:
   - `FloatingBubbleService.kt`: Draws a floating draggable bubble widget over other applications using `TYPE_APPLICATION_OVERLAY`.
   - Remembers screen coordinates and handles touch drag events.
2. **React Native Bridge**:
   - `FloatingOverlayModule.kt`: Provides JavaScript bindings to check permissions (`Settings.canDrawOverlays`), request overlay permissions, and toggle the system-wide bubble service.
3. **Permission Handling**:
   - Requires `android.permission.SYSTEM_ALERT_WINDOW`.
   - Prompts the student with explanation before opening the Android Settings screen.
