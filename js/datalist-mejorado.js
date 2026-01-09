/**
 * Mejora visual del datalist con autocompletado personalizado
 * Convierte datalists en dropdowns estilizados
 */

// Cache para evitar múltiples inicializaciones
const datalistInitialized = new Set();

export function mejorarDatalist(inputId, datalistId) {
    const input = document.getElementById(inputId);
    const datalist = document.getElementById(datalistId);

    if (!input || !datalist) {
        console.warn('Input o datalist no encontrado:', inputId, datalistId);
        return;
    }

    // Crear contenedor para el dropdown personalizado (si no existe ya)
    let wrapper = input.closest('.position-relative');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.className = 'position-relative';
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
    }

    // Verificar si ya está inicializado para evitar duplicados
    const cacheKey = `${inputId}-${datalistId}`;
    let dropdown = wrapper.querySelector('.datalist-dropdown');
    
    // Si ya existe el dropdown y ya está inicializado, solo actualizar las opciones
    if (dropdown && datalistInitialized.has(cacheKey)) {
        // Ya está inicializado, no hacer nada más (evita duplicar listeners)
        return;
    }

    // Si no existe, crear dropdown
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'datalist-dropdown';
        wrapper.appendChild(dropdown);
    }
    
    // Marcar como inicializado
    datalistInitialized.add(cacheKey);

    // Función para obtener opciones del datalist (sin duplicados)
    function getOptions() {
        const options = Array.from(datalist.options).map(opt => opt.value);
        // Eliminar duplicados
        return [...new Set(options)];
    }

    // Función para mostrar opciones
    function mostrarOpciones(filtro = '') {
        const options = getOptions();

        if (filtro.trim() === '') {
            dropdown.style.display = 'none';
            return;
        }

        const filtradas = options.filter(option =>
            option.toLowerCase().includes(filtro.toLowerCase())
        );

        if (filtradas.length === 0) {
            dropdown.innerHTML = `
        <div class="datalist-item datalist-empty">
          <i class="bi bi-search me-2"></i>
          No se encontraron productos
        </div>
      `;
            dropdown.style.display = 'block';
            return;
        }

        dropdown.innerHTML = filtradas.slice(0, 10).map(option => `
      <div class="datalist-item" data-value="${option}">
        <i class="bi bi-box-seam me-2"></i>
        <span>${option}</span>
      </div>
    `).join('');

        dropdown.style.display = 'block';

        // Agregar eventos a los items
        dropdown.querySelectorAll('.datalist-item:not(.datalist-empty)').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.value;
                dropdown.style.display = 'none';
                input.focus();

                // Disparar evento change para que otros listeners lo detecten
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });
    }

    // Eventos del input
    input.addEventListener('input', (e) => {
        mostrarOpciones(e.target.value);
    });

    input.addEventListener('focus', (e) => {
        if (e.target.value.trim() !== '') {
            mostrarOpciones(e.target.value);
        }
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Navegación con teclado
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.datalist-item:not(.datalist-empty)');
        let activeItem = dropdown.querySelector('.datalist-item.active');
        let currentIndex = Array.from(items).indexOf(activeItem);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (dropdown.style.display === 'none' && input.value.trim() !== '') {
                mostrarOpciones(input.value);
                currentIndex = 0;
            } else {
                currentIndex = (currentIndex + 1) % items.length;
            }
            items.forEach((item, i) => {
                item.classList.toggle('active', i === currentIndex);
            });
            if (items[currentIndex]) {
                items[currentIndex].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            items.forEach((item, i) => {
                item.classList.toggle('active', i === currentIndex);
            });
            if (items[currentIndex]) {
                items[currentIndex].scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter' && activeItem) {
            e.preventDefault();
            input.value = activeItem.dataset.value;
            dropdown.style.display = 'none';

            // Disparar eventos
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });

    // console.log('✅ Datalist mejorado inicializado para:', inputId);
}