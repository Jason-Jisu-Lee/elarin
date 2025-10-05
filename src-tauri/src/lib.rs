use tauri::{Manager, PhysicalPosition, PhysicalSize, Size, WindowEvent};

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let win = app.get_webview_window("main").expect("main window");

            // Fit to monitor
            if let Ok(Some(monitor)) = win.current_monitor() {
                let sz = monitor.size();
                let pos = monitor.position();
                let _ = win.set_size(Size::Physical(PhysicalSize::new(sz.width, sz.height)));
                let _ = win.set_position(PhysicalPosition::new(pos.x, pos.y));
            }

            // --- Windows-specific click-through ---
            #[cfg(target_os = "windows")]
            {
                use raw_window_handle::{HasWindowHandle, RawWindowHandle};
                use windows::Win32::Foundation::HWND;
                use windows::Win32::UI::WindowsAndMessaging::{
                    FindWindowExW, GetWindowLongW, SetWindowLongW, GWL_EXSTYLE, WS_EX_LAYERED,
                    WS_EX_TRANSPARENT,
                };

                // Get HWND safely via raw-window-handle
                let hwnd = match win.window_handle() {
                    Ok(handle) => match handle.as_raw() {
                        RawWindowHandle::Win32(h) => HWND(h.hwnd.get() as isize),
                        _ => panic!("Not a Win32 window"),
                    },
                    Err(_) => panic!("Failed to obtain window handle"),
                };

                unsafe {
                    let ex = GetWindowLongW(hwnd, GWL_EXSTYLE);
                    let new_ex = ex | WS_EX_LAYERED.0 as i32 | WS_EX_TRANSPARENT.0 as i32;
                    SetWindowLongW(hwnd, GWL_EXSTYLE, new_ex);

                    // Apply to WebView2 children
                    let mut child = FindWindowExW(hwnd, HWND(0), None, None);
                    while child.0 != 0 {
                        let ex_c = GetWindowLongW(child, GWL_EXSTYLE);
                        let new_ex_c = ex_c | WS_EX_LAYERED.0 as i32 | WS_EX_TRANSPARENT.0 as i32;
                        SetWindowLongW(child, GWL_EXSTYLE, new_ex_c);
                        child = FindWindowExW(hwnd, child, None, None);
                    }
                }
            }

            Ok(())
        })
        .on_window_event(|_, event| {
            // Immediately drop focus
            if let WindowEvent::Focused(true) = event {
                #[cfg(target_os = "windows")]
                unsafe {
                    use windows::Win32::UI::Input::KeyboardAndMouse::SetFocus;
                    SetFocus(None);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error running elarin");
}
