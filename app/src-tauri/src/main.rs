// Evita la ventana de consola extra en Windows (release). NO la quites.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ecoestadistica_lib::run()
}
