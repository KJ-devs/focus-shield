#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Focus Shield is ready.", name)
}
