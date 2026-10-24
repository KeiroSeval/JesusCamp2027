const SUPABASE_URL = 'https://bpwsdgkafjnsgfilbfgg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwd3NkZ2thZmpuc2dmaWxiZmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxODM1NzUsImV4cCI6MjEwNzc1OTU3NX0.rnSg8vNFpAuwNfECYwfyynERKwv3CJ7CGZRhAKbyDDM';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioActual = null;
<<<<<<< HEAD
let modeloCartaUsuario = null;
const CLAVE_DESCARGA_CARTA_HABILITADA = 'carta_descarga_habilitada';
const CLAVES_ANUNCIO_REGLAMENTO = {
    titulo: 'anuncio_reglamento_titulo',
    descripcion: 'anuncio_reglamento_descripcion',
    archivo: 'anuncio_reglamento_archivo_url'
};
const CLAVE_ANUNCIOS_PUBLICADOS = 'anuncios_publicados';
let anunciosPortal = [];
=======
>>>>>>> parent of 70cd88c (Add letter module)
const CELULAS_PREDEFINIDAS = [
    'Alfa y Omega', 'Armadura de Dios', 'Beth Shalom', 'Ejercito de Dios', 'Gaditas',
    'Generación de Fuego', 'Getsemaní', 'Hijas del Rey', 'Talita Cumi', 'Segadores', 'Ninguna'
];
const TIPOS_ARCHIVO_ADMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function validarArchivo(file) {
    if (!file || !TIPOS_ARCHIVO_ADMITIDOS.includes(file.type)) {
        alert('Selecciona una imagen PNG, JPG, WebP o un documento PDF.');
        return false;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('El archivo supera el límite de 10 MB.');
        return false;
    }
    return true;
}

function nombreArchivoAleatorio(file) {
    const extensionPorTipo = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/pdf': 'pdf'
    };
    return `${crypto.randomUUID()}.${extensionPorTipo[file.type]}`;
}

function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

function urlArchivoSegura(valor) {
    try {
        const url = new URL(valor);
        return url.protocol === 'https:' && url.origin === new URL(SUPABASE_URL).origin
            ? url.href
            : '';
    } catch {
        return '';
    }
}

async function cargarAnuncioReglamento() {
    const { data, error } = await db.from('configuracion_sistema')
        .select('clave,valor')
        .in('clave', [CLAVE_ANUNCIOS_PUBLICADOS, ...Object.values(CLAVES_ANUNCIO_REGLAMENTO)]);
    if (error) {
        console.error('Error cargando anuncios del portal:', error);
        const seccion = document.getElementById('seccionAnuncios');
        const contenedor = document.getElementById('listaAnunciosUsuario');
        if (seccion && contenedor) {
            contenedor.textContent = 'No se pudieron cargar los anuncios. Intenta actualizar la página.';
            seccion.classList.remove('hidden');
        }
        return;
    }

    const configuracion = Object.fromEntries((data || []).map(item => [item.clave, item.valor]));
    const valorGuardado = configuracion[CLAVE_ANUNCIOS_PUBLICADOS];
    if (valorGuardado !== undefined && valorGuardado !== null) {
        try {
            anunciosPortal = Array.isArray(valorGuardado)
                ? valorGuardado
                : JSON.parse(valorGuardado || '[]');
            if (!Array.isArray(anunciosPortal)) anunciosPortal = [];
        } catch (parseError) {
            console.error('No se pudo interpretar la lista de anuncios:', parseError);
            anunciosPortal = [];
        }
    } else {
        const archivo = urlArchivoSegura(configuracion[CLAVES_ANUNCIO_REGLAMENTO.archivo]);
        anunciosPortal = archivo ? [{
            id: 'reglamento-legacy',
            tipo: 'reglamento',
            equipo: '',
            titulo: configuracion[CLAVES_ANUNCIO_REGLAMENTO.titulo] || 'Reglamento y recomendaciones',
            descripcion: configuracion[CLAVES_ANUNCIO_REGLAMENTO.descripcion] || 'Consulta el reglamento y las recomendaciones del campamento.',
            archivoUrl: archivo
        }] : [];
    }
    renderizarAnunciosUsuario();
}

function normalizarEquipoAnuncio(equipo) {
    return String(equipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function renderizarAnunciosUsuario(equipoUsuario = usuarioActual?.equipo || '') {
    const seccion = document.getElementById('seccionAnuncios');
    const contenedor = document.getElementById('listaAnunciosUsuario');
    if (!seccion || !contenedor) return;
    contenedor.replaceChildren();

    const equipoNormalizado = normalizarEquipoAnuncio(equipoUsuario);
    const visibles = anunciosPortal.filter(anuncio => {
        const equipoAnuncio = normalizarEquipoAnuncio(anuncio.equipo);
        return !equipoAnuncio || (equipoNormalizado && equipoAnuncio === equipoNormalizado);
    });
    seccion.classList.toggle('hidden', visibles.length === 0);

    visibles.forEach(anuncio => {
        const archivoUrl = urlArchivoSegura(anuncio.archivoUrl);
        const tipo = ({ reglamento: 'Reglamento', futbol: 'Fútbol', voley: 'Vóley' })[anuncio.tipo] || 'Anuncio';
        const icono = ({ reglamento: 'fa-book-open', futbol: 'fa-futbol', voley: 'fa-volleyball' })[anuncio.tipo] || 'fa-bullhorn';
        const articulo = document.createElement('article');
        articulo.className = 'overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-xl';
        articulo.innerHTML = `
            <div class="bg-gradient-to-r from-indigo-950 via-indigo-800 to-blue-700 p-5 text-white sm:p-7">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex min-w-0 items-start gap-4">
                        <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-2xl text-indigo-950 shadow-lg">
                            <i class="fa-solid ${icono}"></i>
                        </span>
                        <div class="min-w-0">
                            <div class="flex flex-wrap gap-2">
                                <span class="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-950">
                                    <i class="fa-solid fa-star"></i> ${escaparHtml(tipo)}
                                </span>
                                ${anuncio.equipo ? `<span class="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white">${escaparHtml(anuncio.equipo)}</span>` : ''}
                            </div>
                            <h2 class="mt-2 break-words text-xl font-black sm:text-2xl">${escaparHtml(anuncio.titulo || tipo)}</h2>
                            <p class="mt-2 max-w-2xl whitespace-pre-line break-words text-sm leading-relaxed text-indigo-100">${escaparHtml(anuncio.descripcion || '')}</p>
                        </div>
                    </div>
                    ${archivoUrl ? `<div class="flex shrink-0 flex-wrap gap-2 sm:pl-4">
                        <button type="button" data-action="view" class="rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20">
                            <i class="fa-solid fa-eye mr-1"></i> Ver archivo
                        </button>
                        <button type="button" data-action="download" class="rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-indigo-950 shadow transition hover:bg-amber-300">
                            <i class="fa-solid fa-download mr-1"></i> Descargar
                        </button>
                    </div>` : ''}
                </div>
            </div>`;
        articulo.querySelector('[data-action="view"]')?.addEventListener('click', () => {
            window.open(archivoUrl, '_blank', 'noopener,noreferrer');
        });
        articulo.querySelector('[data-action="download"]')?.addEventListener('click', () => {
            descargarArchivoAnuncio(archivoUrl, anuncio.titulo || tipo);
        });
        contenedor.appendChild(articulo);
    });
}

async function descargarArchivoAnuncio(url, nombre) {
    if (!url) return;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${response.status}).`);
        const archivo = await response.blob();
        const extensionPorTipo = {
            'application/pdf': 'pdf',
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp'
        };
        const extension = extensionPorTipo[archivo.type]
            || url.split('?')[0].split('.').pop().toLowerCase()
            || 'pdf';
        const enlaceTemporal = document.createElement('a');
        enlaceTemporal.href = URL.createObjectURL(archivo);
        const nombreSeguro = String(nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'anuncio';
        enlaceTemporal.download = `${nombreSeguro}.${extension}`;
        document.body.appendChild(enlaceTemporal);
        enlaceTemporal.click();
        enlaceTemporal.remove();
        setTimeout(() => URL.revokeObjectURL(enlaceTemporal.href), 1000);
    } catch (error) {
        console.error('Error descargando el archivo del anuncio:', error);
        alert('No se pudo descargar el archivo. Inténtalo nuevamente más tarde.');
    }
}

function inicializarSelectoresCelula() {
    const opciones = CELULAS_PREDEFINIDAS.map(celula => `<option value="${celula}">${celula}</option>`).join('');
    document.querySelectorAll('.select-celula').forEach(select => {
        select.innerHTML = `<option value="">-- Seleccione Célula --</option>${opciones}<option value="Otra">Otra</option>`;
    });
}

function actualizarCampoOtraCelula(select, inputId) {
    const input = document.getElementById(inputId);
    const esOtra = select.value === 'Otra';
    input.classList.toggle('hidden', !esOtra);
    input.required = esOtra;
}

function asignarCelula(selectId, inputId, valor) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    const celula = valor || '';
    const esPredefinida = CELULAS_PREDEFINIDAS.includes(celula);

    select.value = esPredefinida ? celula : (celula ? 'Otra' : '');
    input.value = esPredefinida ? '' : celula;
    actualizarCampoOtraCelula(select, inputId);
}

function obtenerCelula(selectId, inputId) {
    const select = document.getElementById(selectId);
    return select.value === 'Otra'
        ? document.getElementById(inputId).value.trim()
        : select.value;
}

inicializarSelectoresCelula();
cargarAnuncioReglamento();
let tiposInscripcionVisibles = [];

function formatearFechaLatina(fechaStr) {
    if (!fechaStr) return '-';
    const partes = fechaStr.split('T')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return fechaStr;
}

function convertirFechaNacimientoISO(valor) {
    if (!valor) return null;
    const coincidencia = valor.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!coincidencia) return null;

    const [, diaTexto, mesTexto, anioTexto] = coincidencia;
    const dia = Number(diaTexto);
    const mes = Number(mesTexto);
    const anio = Number(anioTexto);
    const fecha = new Date(anio, mes - 1, dia);
    if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;

    return `${anioTexto}-${mesTexto}-${diaTexto}`;
}

function calcularEdad(fechaISO) {
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const hoy = new Date();
    let edad = hoy.getFullYear() - anio;
    if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) edad--;
    return edad;
}

function actualizarVistaFechaNacimiento() {
    const rawVal = document.getElementById('usrFechaNac').value.trim();
    const edadInput = document.getElementById('usrEdadText');
    const secMenor = document.getElementById('secMenorEdad');
    const fechaISO = convertirFechaNacimientoISO(rawVal);

    if (!rawVal) {
        edadInput.value = '';
        return;
    }
    if (!fechaISO) {
        edadInput.value = 'Usa dd/mm/yyyy';
        return;
    }

    const edad = calcularEdad(fechaISO);
    edadInput.value = `${edad} años`;
    if (edad < 18) secMenor.classList.remove('hidden');
    else secMenor.classList.add('hidden');
}

async function optimizarYComprimirImagen(archivo, maxDimension = 1600, calidad = 0.8) {
    if (!archivo.type.startsWith('image/')) return archivo;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(archivo);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) return resolve(archivo);
                    const compressedFile = new File([blob], archivo.name.replace(/\.[^/.]+$/, ".jpg"), {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', calidad);
            };
            img.onerror = () => resolve(archivo);
        };
        reader.onerror = () => resolve(archivo);
    });
}

async function cargarTiposInscripcionPublicos() {
    const { data } = await db.from('tipos_inscripcion')
        .select('*')
        .eq('es_visible', true)
        .order('precio', { ascending: false });

    tiposInscripcionVisibles = data || [];

    const selectUser = document.getElementById('usrTipoInscripcion');
    if (selectUser) {
        selectUser.innerHTML = '<option value="">-- Seleccionar --</option>';
        tiposInscripcionVisibles.forEach(t => {
            let label = t.es_manual ? `${t.nombre} (Precio personalizado)` : `${t.nombre} (Bs ${t.precio})`;
            selectUser.innerHTML += `<option value="${escaparHtml(t.id)}">${escaparHtml(label)}</option>`;
        });
    }
}

function cambiarPestanaPerfil(tab) {
    document.querySelectorAll('.tab-usr-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tab-usr-btn').forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white', 'shadow');
        b.classList.add('bg-white', 'text-gray-600');
    });

    const btn = document.getElementById(`btnTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (btn) {
        btn.classList.remove('bg-white', 'text-gray-600');
        btn.classList.add('bg-blue-600', 'text-white', 'shadow');
    }

    document.getElementById(`tabUsr${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.remove('hidden');
}

function regresarInicio() {
    usuarioActual = null;
    renderizarAnunciosUsuario('');
    document.getElementById('inputCI').value = '';
    document.getElementById('secPerfil').classList.add('hidden');
    document.getElementById('secBusqueda').classList.remove('hidden');
    document.getElementById('btnNavAdmin').classList.remove('hidden');
    document.getElementById('btnNavInicio').classList.add('hidden');
}

async function buscarCampamentista() {
    const ciInput = document.getElementById('inputCI').value.trim();
    const mensaje = document.getElementById('msgBusqueda');
    if (!/^[a-zA-Z0-9.-]{4,24}$/.test(ciInput)) {
        mensaje.textContent = 'Ingresa un C.I. válido de 4 a 24 caracteres.';
        mensaje.classList.remove('hidden');
        return;
    }

    await cargarTiposInscripcionPublicos();

    const { data: inscrito, error } = await db
        .from('inscritos')
        .select('*, tipos_inscripcion(*)')
        .eq('ci', ciInput)
        .maybeSingle();

    if (error) {
        console.error('Error consultando el perfil del campamentista:', error);
        mensaje.textContent = 'No se pudo consultar el registro. Revisa tu conexión e inténtalo nuevamente.';
        mensaje.classList.remove('hidden');
        return;
    }
    if (!inscrito) {
        mensaje.textContent = 'No se encontró ningún campamentista registrado con ese C.I.';
        mensaje.classList.remove('hidden');
        return;
    }

    mensaje.classList.add('hidden');
    usuarioActual = inscrito;
    cargarPerfil();
}

async function cargarPerfil() {
    renderizarAnunciosUsuario(usuarioActual?.equipo || '');
    document.getElementById('secBusqueda').classList.add('hidden');
    document.getElementById('secPerfil').classList.remove('hidden');

    document.getElementById('btnNavAdmin').classList.add('hidden');
    document.getElementById('btnNavInicio').classList.remove('hidden');

    const incompleto = !usuarioActual.telefono || !usuarioActual.fecha_nacimiento || !usuarioActual.talla_polera ||
        !usuarioActual.contacto_emergencia || typeof usuarioActual.sabe_nadar !== 'boolean';
    if (incompleto) {
        document.getElementById('alertaPerfilIncompleto').classList.remove('hidden');
    } else {
        document.getElementById('alertaPerfilIncompleto').classList.add('hidden');
    }

    document.getElementById('usrNombre').value = usuarioActual.nombre_completo || '';
    document.getElementById('usrTelefono').value = usuarioActual.telefono || '';
    document.getElementById('usrFechaNac').value = usuarioActual.fecha_nacimiento
        ? formatearFechaLatina(usuarioActual.fecha_nacimiento)
        : '';
    actualizarVistaFechaNacimiento();

    asignarCelula('usrCelula', 'usrCelulaOtra', usuarioActual.celula);
    document.getElementById('usrTalla').value = usuarioActual.talla_polera || '';

    const selectUser = document.getElementById('usrTipoInscripcion');
    if (usuarioActual.tipo_inscripcion_id) {
        let existeEnSelect = Array.from(selectUser.options).some(opt => opt.value === usuarioActual.tipo_inscripcion_id);
        if (!existeEnSelect && usuarioActual.tipos_inscripcion) {
            const t = usuarioActual.tipos_inscripcion;
            let label = t.es_manual ? `${t.nombre} (Asignado Admin)` : `${t.nombre} (Bs ${t.precio})`;
            selectUser.innerHTML += `<option value="${escaparHtml(t.id)}" selected>${escaparHtml(label)}</option>`;
        }
    }
    selectUser.value = usuarioActual.tipo_inscripcion_id || '';

    document.getElementById('usrActividad').value = usuarioActual.actividad_favorita || '';
    document.getElementById('usrHabilidad').value = usuarioActual.habilidad_especial || '';
    document.getElementById('usrSabeNadar').value = typeof usuarioActual.sabe_nadar === 'boolean'
        ? String(usuarioActual.sabe_nadar)
        : '';
    document.getElementById('usrEmergencia').value = usuarioActual.contacto_emergencia || '';
    document.getElementById('usrAlergias').value = usuarioActual.alergias_medicina || '';

    document.getElementById('lblEquipo').innerText = usuarioActual.equipo || 'Sin Asignar';

    if (usuarioActual.es_menor) {
        document.getElementById('secMenorEdad').classList.remove('hidden');
        document.getElementById('usrTutorNombre').value = usuarioActual.tutor_nombre || '';
        document.getElementById('usrTutorTel').value = usuarioActual.tutor_telefono || '';
    }

    const contAlerta = document.getElementById('alertaCartaContenedor');
    const iconoAlerta = document.getElementById('iconoAlertaCarta');
    const tituloAlerta = document.getElementById('tituloAlertaCarta');
    const descAlerta = document.getElementById('descAlertaCarta');
    const txtEstado = document.getElementById('txtEstadoCarta');

    contAlerta.classList.remove('hidden', 'bg-amber-50', 'border-amber-500', 'bg-blue-50', 'border-blue-500', 'bg-green-50', 'border-green-500', 'bg-red-50', 'border-red-500');

    const estado = usuarioActual.estado_carta || (usuarioActual.carta_compromiso_url ? 'En Revisión' : 'Pendiente');

    if (estado === 'Aprobada') {
        const cartaUrl = urlArchivoSegura(usuarioActual.carta_compromiso_url);
        contAlerta.classList.add('bg-green-50', 'border-green-500');
        iconoAlerta.className = 'fa-solid fa-circle-check text-green-600 text-2xl';
        tituloAlerta.className = 'font-bold text-sm text-green-900';
        tituloAlerta.innerText = 'Carta de Compromiso Aprobada';
        descAlerta.className = 'text-xs text-green-700';
        descAlerta.innerText = 'Tu carta de compromiso ha sido verificada y aprobada.';
        txtEstado.innerHTML = `<span class="text-green-600 flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> Carta Aprobada: ${cartaUrl ? `<a href="${escaparHtml(cartaUrl)}" target="_blank" rel="noopener noreferrer" class="underline text-blue-600 font-bold">Ver Documento</a>` : 'Documento no disponible'}</span>`;
        document.getElementById('btnSubirCarta').disabled = false;
    } else if (estado === 'En Revisión') {
        const cartaUrl = urlArchivoSegura(usuarioActual.carta_compromiso_url);
        contAlerta.classList.add('bg-blue-50', 'border-blue-500');
        iconoAlerta.className = 'fa-solid fa-clock-rotate-left text-blue-600 text-2xl';
        tituloAlerta.className = 'font-bold text-sm text-blue-900';
        tituloAlerta.innerText = 'Carta en Revisión';
        descAlerta.className = 'text-xs text-blue-700';
        descAlerta.innerText = 'Tu carta fue subida y está siendo revisada por un administrador.';
        txtEstado.innerHTML = `<span class="text-blue-600 flex items-center gap-1"><i class="fa-solid fa-spinner fa-spin"></i> Carta en Revisión: ${cartaUrl ? `<a href="${escaparHtml(cartaUrl)}" target="_blank" rel="noopener noreferrer" class="underline font-bold">Ver Documento Enviado</a>` : 'Documento no disponible'}</span>`;
        document.getElementById('btnSubirCarta').disabled = true;
        document.getElementById('btnSubirCarta').title = "Tienes una carta pendiente de revisión.";
    } else if (estado === 'Rechazada') {
        contAlerta.classList.add('bg-red-50', 'border-red-500');
        iconoAlerta.className = 'fa-solid fa-triangle-exclamation text-red-600 text-2xl';
        tituloAlerta.className = 'font-bold text-sm text-red-900';
        tituloAlerta.innerText = 'Carta Observada / Rechazada';
        descAlerta.className = 'text-xs text-red-700';
        descAlerta.innerText = 'Por favor vuelve a subir tu carta de compromiso con la firma legible.';
        txtEstado.innerHTML = `<span class="text-red-600 flex items-center gap-1"><i class="fa-solid fa-circle-xmark"></i> Documento Rechazado. Sube una nueva foto.</span>`;
        document.getElementById('btnSubirCarta').disabled = false;
    } else {
        contAlerta.classList.add('bg-amber-50', 'border-amber-500');
        iconoAlerta.className = 'fa-solid fa-file-contract text-amber-600 text-2xl';
        tituloAlerta.className = 'font-bold text-sm text-amber-900';
        tituloAlerta.innerText = 'Carta de Compromiso Requerida';
        descAlerta.className = 'text-xs text-amber-700';
        descAlerta.innerText = 'Para completar tu inscripción debes adjuntar tu carta firmada.';
        txtEstado.innerHTML = `<span class="text-red-500 flex items-center gap-1"><i class="fa-solid fa-circle-xmark"></i> Carta no adjuntada.</span>`;
        document.getElementById('btnSubirCarta').disabled = false;
    }

    const { data: pagos } = await db.from('pagos').select('*').eq('inscrito_id', usuarioActual.id);

    let totalAprobado = 0;
    let tienePagoPendiente = false;

    const tbody = document.getElementById('tblHistorialPagos');
    tbody.innerHTML = '';

    (pagos || []).forEach(p => {
        if (p.estado === 'Aprobado') totalAprobado += Number(p.monto);
        if (p.estado === 'Pendiente') tienePagoPendiente = true;

        let colorEstado = p.estado === 'Aprobado' ? 'bg-green-100 text-green-700' : (p.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700');
        const comprobanteUrl = urlArchivoSegura(p.comprobante_url);
        tbody.innerHTML += `
  <tr>
    <td class="p-2">${new Date(p.created_at || p.fecha).toLocaleDateString()} ${new Date(p.created_at || p.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
    <td class="p-2 font-bold">Bs ${escaparHtml(p.monto)}</td>
    <td class="p-2">${comprobanteUrl ? `<a href="${escaparHtml(comprobanteUrl)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-bold">Ver Foto</a>` : 'Sin archivo'}</td>
    <td class="p-2"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${colorEstado}">${escaparHtml(p.estado)}</span></td>
  </tr>`;
    });

    const btnEnviarComprobante = document.getElementById('btnEnviarComprobante');
    const msgPagoBloqueado = document.getElementById('msgPagoBloqueado');

    if (tienePagoPendiente) {
        btnEnviarComprobante.disabled = true;
        btnEnviarComprobante.classList.add('opacity-50', 'cursor-not-allowed');
        msgPagoBloqueado.classList.remove('hidden');
    } else {
        btnEnviarComprobante.disabled = false;
        btnEnviarComprobante.classList.remove('opacity-50', 'cursor-not-allowed');
        msgPagoBloqueado.classList.add('hidden');
    }

    let costoTotal = 140;
    if (usuarioActual.tipos_inscripcion) {
        if (usuarioActual.tipos_inscripcion.es_manual) {
            costoTotal = usuarioActual.precio_personalizado || 0;
        } else {
            costoTotal = usuarioActual.tipos_inscripcion.precio || 0;
        }
    }

    document.getElementById('lblCosto').innerText = `Bs ${costoTotal}`;
    document.getElementById('lblAbonado').innerText = `Bs ${totalAprobado}`;
    document.getElementById('lblSaldo').innerText = `Bs ${costoTotal - totalAprobado}`;

    // CONTROL DE BLOQUEO DE EDICIÓN DE DATOS
    const { data: edicion } = await db.from('solicitudes_edicion').select('*').eq('inscrito_id', usuarioActual.id).eq('estado', 'Pendiente').maybeSingle();
    const btnEdit = document.getElementById('btnHabilitarEdicion');
    const badgeEdic = document.getElementById('badgeEdicion');

    if (edicion) {
        badgeEdic.classList.remove('hidden');
        btnEdit.disabled = true;
        btnEdit.classList.add('opacity-50', 'cursor-not-allowed');
        btnEdit.title = 'Ya tienes una solicitud de modificación en revisión por los administradores.';
        mostrarCambiosPendientes(edicion);
        deshabilitarFormularioPerfil();
    } else {
        badgeEdic.classList.add('hidden');
        btnEdit.disabled = false;
        btnEdit.classList.remove('opacity-50', 'cursor-not-allowed');
        document.getElementById('panelCambioPendiente').classList.add('hidden');
    }
}

function mostrarCambiosPendientes(edicion) {
    const panel = document.getElementById('panelCambioPendiente');
    const lista = document.getElementById('listaCambiosPendientes');
    const campos = [
        ['nombre_completo', 'Nombre completo'], ['telefono', 'Teléfono'],
        ['fecha_nacimiento', 'Fecha de nacimiento'], ['celula', 'Célula'],
        ['talla_polera', 'Talla de polera'], ['tipo_inscripcion_id', 'Tipo de inscripción'],
        ['actividad_favorita', 'Actividad favorita'], ['habilidad_especial', 'Habilidad o talento'],
        ['sabe_nadar', '¿Sabe nadar?'],
        ['contacto_emergencia', 'Contacto de emergencia'], ['alergias_medicina', 'Alergias o medicamentos'],
        ['tutor_nombre', 'Nombre del tutor'], ['tutor_telefono', 'Teléfono del tutor']
    ];
    const selectorTipo = document.getElementById('usrTipoInscripcion');
    lista.replaceChildren();

    campos.forEach(([campo, etiqueta]) => {
        const actual = usuarioActual[campo] ?? '';
        const propuesto = edicion[campo] ?? '';
        if (String(actual) === String(propuesto)) return;

        const mostrarValor = (valor) => {
            if (campo === 'sabe_nadar') return valor === true ? 'Sí' : valor === false ? 'No' : 'Sin registrar';
            if (!valor) return 'Sin registrar';
            if (campo === 'fecha_nacimiento') return formatearFechaLatina(valor);
            if (campo === 'tipo_inscripcion_id') {
                const opcion = Array.from(selectorTipo.options).find(item => item.value === valor);
                return opcion?.textContent || valor;
            }
            return valor;
        };

        const fila = document.createElement('div');
        fila.className = 'rounded-lg border border-amber-200 bg-white p-3';
        const titulo = document.createElement('p');
        titulo.className = 'text-xs font-bold text-gray-700 mb-2';
        titulo.textContent = etiqueta;
        const valores = document.createElement('div');
        valores.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs';

        const valorActual = document.createElement('p');
        valorActual.className = 'text-gray-500';
        valorActual.textContent = `Actual: ${mostrarValor(actual)}`;
        const valorPropuesto = document.createElement('p');
        valorPropuesto.className = 'font-bold text-amber-800 bg-amber-100 rounded px-2 py-1';
        valorPropuesto.textContent = `Si se aprueba: ${mostrarValor(propuesto)}`;

        valores.append(valorActual, valorPropuesto);
        fila.append(titulo, valores);
        lista.append(fila);
    });

    if (!lista.childElementCount) {
        const mensaje = document.createElement('p');
        mensaje.className = 'text-xs text-amber-800';
        mensaje.textContent = 'La solicitud no contiene cambios visibles en estos datos.';
        lista.append(mensaje);
    }
    panel.classList.remove('hidden');
}

function deshabilitarFormularioPerfil() {
    document.querySelectorAll('.usr-input').forEach(i => {
        i.disabled = true;
        i.classList.add('bg-gray-50');
        i.classList.remove('bg-white', 'border-amber-400');
    });
    document.getElementById('secBotonGuardar').classList.add('hidden');
}

function habilitarEdicion() {
    document.querySelectorAll('.usr-input').forEach(i => {
        i.disabled = false;
        i.classList.remove('bg-gray-50');
        i.classList.add('bg-white', 'border-amber-400');
    });
    document.getElementById('secBotonGuardar').classList.remove('hidden');
}

async function solicitarCambioDatos() {
    const tipoInscripcionVal = document.getElementById('usrTipoInscripcion').value;
    const fechaNacEntrada = document.getElementById('usrFechaNac').value.trim();
    const fechaNacimientoISO = convertirFechaNacimientoISO(fechaNacEntrada);
    if (fechaNacEntrada && !fechaNacimientoISO) {
        alert('Ingresa una fecha válida con formato dd/mm/yyyy.');
        return;
    }
    const celula = obtenerCelula('usrCelula', 'usrCelulaOtra');
    if (document.getElementById('usrCelula').value === 'Otra' && !celula) {
        alert('Escribe el nombre de la célula seleccionada como "Otra".');
        return;
    }
    const sabeNadarVal = document.getElementById('usrSabeNadar').value;
    if (sabeNadarVal !== 'true' && sabeNadarVal !== 'false') {
        alert('Indica si sabes nadar.');
        document.getElementById('usrSabeNadar').focus();
        return;
    }

    const datos = {
        inscrito_id: usuarioActual.id,
        nombre_completo: document.getElementById('usrNombre').value.trim() || null,
        telefono: document.getElementById('usrTelefono').value.trim() || null,
        fecha_nacimiento: fechaNacimientoISO,
        celula: celula || null,
        talla_polera: document.getElementById('usrTalla').value || null,
        tipo_inscripcion_id: tipoInscripcionVal ? tipoInscripcionVal : null,
        actividad_favorita: document.getElementById('usrActividad').value || null,
        habilidad_especial: document.getElementById('usrHabilidad').value.trim() || null,
        sabe_nadar: sabeNadarVal === 'true',
        contacto_emergencia: document.getElementById('usrEmergencia').value.trim() || null,
        alergias_medicina: document.getElementById('usrAlergias').value.trim() || null,
        tutor_nombre: document.getElementById('usrTutorNombre').value.trim() || null,
        tutor_telefono: document.getElementById('usrTutorTel').value.trim() || null
    };

    const camposEditables = Object.keys(datos).filter(campo => campo !== 'inscrito_id');
    const hayCambios = camposEditables.some(campo => {
        const valorActual = usuarioActual[campo] ?? '';
        const valorPropuesto = datos[campo] ?? '';
        if (campo === 'fecha_nacimiento') {
            return String(valorActual).split('T')[0] !== String(valorPropuesto).split('T')[0];
        }
        return String(valorActual).trim() !== String(valorPropuesto).trim();
    });

    if (!hayCambios) {
        alert('No se detectaron cambios en tus datos. No se envió ninguna solicitud.');
        return;
    }

    const { data, error } = await db.from('solicitudes_edicion').insert([datos]);

    if (error) {
        alert('Error al enviar la solicitud: ' + error.message);
        return;
    }

    alert('Tu solicitud de actualización ha sido enviada con éxito para revisión del Administrador.');
    cargarPerfil();
}

async function subirCartaCompromiso() {
    const fileInput = document.getElementById('cartaArchivo');
    if (fileInput.files.length === 0) return alert('Por favor selecciona la foto o PDF de tu carta.');

    const archivoOriginal = fileInput.files[0];
    if (!validarArchivo(archivoOriginal)) return;
    let file = await optimizarYComprimirImagen(archivoOriginal);
    const fileName = `carta_${nombreArchivoAleatorio(file)}`;

    const { data: uploadData, error: uploadErr } = await db.storage.from('cartas').upload(fileName, file);
    if (uploadErr) return alert('Error al subir carta: ' + uploadErr.message);

    const { data: urlData } = db.storage.from('cartas').getPublicUrl(fileName);

    await db.from('inscritos').update({
        carta_compromiso_url: urlData.publicUrl,
        estado_carta: 'En Revisión'
    }).eq('id', usuarioActual.id);

    usuarioActual.carta_compromiso_url = urlData.publicUrl;
    usuarioActual.estado_carta = 'En Revisión';

    alert('Carta de compromiso subida. Ha quedado en revisión.');
    cargarPerfil();
}

async function subirComprobante() {
    const monto = document.getElementById('pagoMonto').value;
    const fileInput = document.getElementById('pagoArchivo');

    if (!monto || fileInput.files.length === 0) {
        return alert('⚠️ Por favor ingresa el monto y adjunta OBLIGATORIAMENTE la foto o recibo del comprobante.');
    }

    const archivoOriginal = fileInput.files[0];
    if (!validarArchivo(archivoOriginal)) return;
    let file = await optimizarYComprimirImagen(archivoOriginal);
    const fileName = `pago_${nombreArchivoAleatorio(file)}`;

    const { data: uploadData, error: uploadErr } = await db.storage.from('comprobantes').upload(fileName, file);
    if (uploadErr) return alert('Error al subir comprobante: ' + uploadErr.message);

    const { data: urlData } = db.storage.from('comprobantes').getPublicUrl(fileName);

    await db.from('pagos').insert([{
        inscrito_id: usuarioActual.id,
        monto: monto,
        comprobante_url: urlData.publicUrl,
        observaciones: document.getElementById('pagoObs').value
    }]);

    alert('Comprobante enviado exitosamente a Tesorería para verificación.');
    cargarPerfil();
}

async function abrirModalAyuda() {
    const { data: admins } = await db.from('administradores').select('nombre, telefono, roles(nombre)');
    const cont = document.getElementById('listaAdminsAyuda');
    cont.innerHTML = '';

    (admins || []).forEach(a => {
        let telClean = (a.telefono || '').replace(/\D/g, '');
                        let btnWp = telClean
                                ? `<a href="https://wa.me/${telClean}" target="_blank" rel="noopener noreferrer" class="inline-flex shrink-0 items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-white font-bold text-xs px-3 py-2 rounded-lg shadow-sm transition whitespace-nowrap">
                                         <i class="fa-brands fa-whatsapp text-base"></i> WhatsApp
               </a>`
            : `<span class="text-[10px] text-gray-400 font-semibold italic">Sin número</span>`;

        cont.innerHTML += `
            <div class="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <h5 class="font-bold text-sm leading-snug text-indigo-950 break-words">${escaparHtml(a.nombre)}</h5>
                    <span class="text-[9px] text-indigo-600 font-semibold uppercase">${escaparHtml(a.roles?.nombre || 'Encargado de Campamento')}</span>
                </div>
                ${btnWp}
            </div>
        `;
    });

    document.getElementById('modalAyudaConsultas').classList.remove('hidden');
}

function cerrarModalAyuda() {
    document.getElementById('modalAyudaConsultas').classList.add('hidden');
}

async function verQrPagoModal() {
    document.getElementById('modalVerQr').classList.remove('hidden');
    const { data } = await db.from('configuracion_sistema').select('valor').eq('clave', 'qr_pago_url').maybeSingle();
    const cont = document.getElementById('contImagenQr');
    const btnDesc = document.getElementById('btnDescargarQr');

    if (data && data.valor && urlArchivoSegura(data.valor)) {
        const qrUrl = urlArchivoSegura(data.valor);
        cont.innerHTML = `<img src="${escaparHtml(qrUrl)}" alt="Código QR de pago" class="max-h-72 object-contain rounded-lg shadow-sm">`;
        btnDesc.href = qrUrl;
        btnDesc.rel = 'noopener noreferrer';
        btnDesc.classList.remove('hidden');
    } else {
        cont.innerHTML = `<p class="text-xs text-amber-700 font-semibold p-4">No se ha subido ningún código QR aún. Por favor consulta con un encargado.</p>`;
        btnDesc.classList.add('hidden');
    }
}

function cerrarModalQr() {
    document.getElementById('modalVerQr').classList.add('hidden');
}
