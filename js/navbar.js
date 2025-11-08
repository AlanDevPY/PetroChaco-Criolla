// Inyecta el navbar parcial en páginas que incluyan #navbar-placeholder
export async function cargarNavbar() {
    const cont = document.getElementById('navbar-placeholder');
    if (!cont) return;
    try {
        const resp = await fetch('partials/navbar.html');
        const html = await resp.text();
        cont.innerHTML = html;
    } catch (e) {
        console.error('Error cargando navbar parcial:', e);
    }
}

window.addEventListener('DOMContentLoaded', cargarNavbar);
