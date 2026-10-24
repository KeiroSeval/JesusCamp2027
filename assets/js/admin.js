const SUPABASE_URL = 'https://bpwsdgkafjnsgfilbfgg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwd3NkZ2thZmpuc2dmaWxiZmdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxODM1NzUsImV4cCI6MjEwNzc1OTU3NX0.rnSg8vNFpAuwNfECYwfyynERKwv3CJ7CGZRhAKbyDDM';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

function argumentoSeguroJs(valor) {
    return encodeURIComponent(String(valor ?? ''));
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

let adminSesion = null;
let permisosAdmin = {};
let listaAdminsGlobal = [];
let listaRolesGlobal = [];
let tiposInscripcionGlobal = [];
let listaInscritosGlobal = [];
let listaPagosGlobal = [];
let solicitudesEdicionGlobal = [];
let accionPendienteProtegida = null;
let instanciaGrafico = null;
let moduloAdminActivo = 'solicitudes';
let modelosCartaActuales = { adultos: null, menores: null };
const CLAVE_DESCARGA_CARTA_HABILITADA = 'carta_descarga_habilitada';
const CLAVES_MODELO_CARTA = {
    adultos: 'carta_modelo_mayores_url',
    menores: 'carta_modelo_menores_url'
};
const CAMPOS_REPORTE = [
    { id: 'nombre_completo', label: 'Nombre de persona' },
    { id: 'equipo', label: 'Equipo' },
    { id: 'celula', label: 'Célula' },
    { id: 'tipo_inscripcion', label: 'Tipo de inscripción' },
    { id: 'estado_carta', label: 'Estado de carta' },
    { id: 'talla_polera', label: 'Talla de polera' },
    { id: 'actividad_favorita', label: 'Actividad favorita' },
    { id: 'es_staff', label: 'Rol (staff / campamentista)' },
    { id: 'es_menor', label: 'Edad (menor / mayor)' },
    { id: 'rango_edad', label: 'Rango de edad' },
    { id: 'estado_financiero', label: 'Estado financiero' },
    { id: 'habilidad_especial', label: 'Habilidad / talento' }
];
const VALORES_REPORTE = [
    { id: 'personas', label: 'Cantidad de personas' },
    { id: 'nombres_personas', label: 'Lista de nombres de personas' },
    { id: 'monto_pagado', label: 'Total pagado (Bs)', financiero: true },
    { id: 'promedio_pagado', label: 'Promedio pagado por persona (Bs)', financiero: true },
    { id: 'precio_inscripcion', label: 'Total de inscripciones (Bs)', financiero: true },
    { id: 'promedio_inscripcion', label: 'Precio promedio de inscripción (Bs)', financiero: true },
    { id: 'saldo_pendiente', label: 'Saldo pendiente total (Bs)', financiero: true }
];
const CELULAS_PREDEFINIDAS = [
    'Alfa y Omega', 'Armadura de Dios', 'Beth Shalom', 'Ejercito de Dios', 'Gaditas',
    'Generación de Fuego', 'Getsemaní', 'Hijas del Rey', 'Talita Cumi', 'Segadores', 'Ninguna'
];
const TIPOS_ARCHIVO_ADMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function validarArchivo(file, soloImagen = false) {
    const tiposPermitidos = soloImagen
        ? TIPOS_ARCHIVO_ADMITIDOS.filter(tipo => tipo.startsWith('image/'))
        : TIPOS_ARCHIVO_ADMITIDOS;
    const limiteBytes = soloImagen ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!file || !tiposPermitidos.includes(file.type)) {
        alert(soloImagen
            ? 'Selecciona una imagen PNG, JPG o WebP.'
            : 'Selecciona una imagen PNG, JPG, WebP o un documento PDF.');
        return false;
    }
    if (file.size > limiteBytes) {
        alert(`El archivo supera el límite de ${soloImagen ? '5' : '10'} MB.`);
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
    document.querySelector(`label[for="${inputId}"]`)?.classList.toggle('hidden', !esOtra);
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

function calcularEdadDesdeFecha(inputId, targetTextId, secMenorId) {
    const val = document.getElementById(inputId).value;
    const fechaISO = convertirFechaNacimientoISO(val);
    if (!fechaISO) {
        document.getElementById(targetTextId).value = '';
        return;
    }

    const edad = calcularEdad(fechaISO);

    document.getElementById(targetTextId).value = `${edad} años`;

    const secMenor = document.getElementById(secMenorId);
    if (secMenor) {
        if (edad < 18) secMenor.classList.remove('hidden');
        else secMenor.classList.add('hidden');
    }
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

function toggleFormulario(idContainer) {
    const container = document.getElementById(idContainer);
    if (container) container.classList.toggle('hidden');
}

async function guardarQrSistema() {
    const fileInput = document.getElementById('inputQrAdmin');
    if (fileInput.files.length === 0) return alert('Selecciona una imagen de QR.');

    const archivoOriginal = fileInput.files[0];
    if (!validarArchivo(archivoOriginal, true)) return;
    let file = await optimizarYComprimirImagen(archivoOriginal);
    const fileName = `qr_oficial_${nombreArchivoAleatorio(file)}`;

    const { error: uploadErr } = await db.storage.from('comprobantes').upload(fileName, file);
    if (uploadErr) return alert('Error subiendo QR: ' + uploadErr.message);

    const { data: urlData } = db.storage.from('comprobantes').getPublicUrl(fileName);

    const { error: configError } = await db.from('configuracion_sistema')
        .upsert({ clave: 'qr_pago_url', valor: urlData.publicUrl }, { onConflict: 'clave' });
    if (configError) return alert('El archivo se subió, pero no se pudo guardar la configuración del QR: ' + configError.message);

    await registrarLogAuditoria('Actualización QR', 'Ingresos', 'Cambió la imagen del QR oficial de pago');
    await cargarQrActualAdmin();
    alert('Código QR actualizado correctamente.');
}

async function cargarQrActualAdmin() {
    const boton = document.getElementById('btnVerQrActualAdmin');
    const preview = document.getElementById('previewQrActualAdmin');
    const imagen = document.getElementById('imagenQrActualAdmin');
    if (!boton || !preview || !imagen) return;

    const { data, error } = await db.from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'qr_pago_url')
        .maybeSingle();
    if (error) {
        console.error('Error cargando el QR actual:', error);
        boton.disabled = true;
        return alert('No se pudo consultar el QR actual: ' + error.message);
    }

    const qrUrl = urlArchivoSegura(data?.valor);
    boton.disabled = !qrUrl;
    imagen.src = qrUrl || '';
    preview.classList.add('hidden');
}

function verQrActualAdmin() {
    const preview = document.getElementById('previewQrActualAdmin');
    const imagen = document.getElementById('imagenQrActualAdmin');
    if (!imagen?.src || imagen.src === window.location.href) {
        return alert('No hay un QR de pago configurado.');
    }
    preview.classList.toggle('hidden');
}

function edadInscrito(inscrito) {
    if (typeof inscrito.es_menor === 'boolean') return inscrito.es_menor ? 'Menor de 18' : '18 o más';
    if (inscrito.fecha_nacimiento) {
        const edad = calcularEdad(inscrito.fecha_nacimiento);
        if (Number.isFinite(edad)) return edad < 18 ? 'Menor de 18' : '18 o más';
    }
    return 'No determinada';
}

async function cargarModelosCarta() {
    const { data, error } = await db.from('configuracion_sistema')
        .select('clave,valor')
        .in('clave', Object.values(CLAVES_MODELO_CARTA));
    if (error) throw error;

    actualizarModelosCarta(data);
}

function actualizarModelosCarta(data) {
    modelosCartaActuales = { adultos: null, menores: null };
    (data || []).forEach(item => {
        const grupo = Object.keys(CLAVES_MODELO_CARTA)
            .find(key => CLAVES_MODELO_CARTA[key] === item.clave);
        if (grupo) modelosCartaActuales[grupo] = urlArchivoSegura(item.valor) || null;
    });
    document.getElementById('btnVerModeloAdultos').disabled = !modelosCartaActuales.adultos;
    document.getElementById('btnVerModeloMenores').disabled = !modelosCartaActuales.menores;
}

async function verModeloCarta(grupo) {
    try {
        if (!modelosCartaActuales[grupo]) await cargarModelosCarta();
        const url = modelosCartaActuales[grupo];
        if (!url) return alert('Todavía no hay un modelo cargado para este grupo de edad.');
        window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
        console.error('Error consultando el modelo de carta:', error);
        alert('No se pudo consultar el modelo actual: ' + error.message);
    }
}

async function guardarModeloCarta(grupo) {
    const input = document.getElementById(grupo === 'adultos' ? 'inputModeloCartaAdultos' : 'inputModeloCartaMenores');
    const file = input.files[0];
    if (!file) return alert('Selecciona primero el archivo del modelo.');
    if (!validarArchivo(file)) return;

    try {
        const optimizado = await optimizarYComprimirImagen(file);
        const nombre = `modelos/${grupo}_${nombreArchivoAleatorio(optimizado)}`;
        const { error: uploadError } = await db.storage.from('cartas')
            .upload(nombre, optimizado, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = db.storage.from('cartas').getPublicUrl(nombre);
        const { error: configError } = await db.from('configuracion_sistema').upsert({
            clave: CLAVES_MODELO_CARTA[grupo],
            valor: urlData.publicUrl
        }, { onConflict: 'clave' });
        if (configError) throw configError;

        await registrarLogAuditoria('Actualización modelo carta', 'Cartas', `Actualizó el modelo para ${grupo}.`);
        input.value = '';
        await cargarModelosCarta();
        alert('Modelo de carta actualizado correctamente.');
    } catch (error) {
        console.error('Error guardando el modelo de carta:', error);
        alert('No se pudo guardar el modelo: ' + error.message);
    }
}

async function cargarModuloCartas() {
    const tbody = document.getElementById('tblCartasAdmin');
    const mensaje = document.getElementById('msgCartasAdmin');
    const select = document.getElementById('selectCampamentistaCarta');
    mensaje.classList.add('hidden');
    tbody.innerHTML = '<tr><td colspan="8" class="p-4 text-center text-gray-500">Cargando cartas...</td></tr>';
    select.innerHTML = '<option value="">Cargando campamentistas...</option>';

    try {
        const [inscritosResult, modelosResult] = await Promise.all([
            db.from('inscritos')
                .select('id,nombre_completo,ci,celula,es_menor,fecha_nacimiento,estado_carta,carta_compromiso_url,created_at')
                .order('nombre_completo'),
            db.from('configuracion_sistema')
                .select('clave,valor')
                .in('clave', [...Object.values(CLAVES_MODELO_CARTA), CLAVE_DESCARGA_CARTA_HABILITADA])
        ]);
        if (inscritosResult.error) throw inscritosResult.error;

        const inscritos = inscritosResult.data || [];
        select.innerHTML = '<option value="">-- Seleccionar campamentista --</option>' +
            inscritos.map(item => `<option value="${escaparHtml(item.id)}">${escaparHtml(item.nombre_completo)} (C.I. ${escaparHtml(item.ci)})</option>`).join('');

        if (modelosResult.error) {
            console.error('Error cargando modelos de carta:', modelosResult.error);
            mensaje.textContent = `No se pudieron consultar los modelos actuales: ${modelosResult.error.message}`;
            mensaje.classList.remove('hidden');
            actualizarModelosCarta([]);
            const toggleDescarga = document.getElementById('toggleDescargaModeloCarta');
            toggleDescarga.checked = false;
            toggleDescarga.disabled = true;
        } else {
            actualizarModelosCarta(modelosResult.data);
            const descargaConfig = modelosResult.data?.find(item => item.clave === CLAVE_DESCARGA_CARTA_HABILITADA);
            const toggleDescarga = document.getElementById('toggleDescargaModeloCarta');
            toggleDescarga.checked =
                ['true', '1', 'si', 'sí'].includes(String(descargaConfig?.valor || '').toLowerCase());
            toggleDescarga.disabled = false;
        }
        const cartas = inscritos
            .filter(item => item.carta_compromiso_url)
            .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        tbody.innerHTML = '';
        if (!cartas.length) {
            mensaje.textContent += `${mensaje.textContent ? ' ' : ''}Aún no se han recibido cartas de compromiso.`;
            mensaje.classList.remove('hidden');
        }
        cartas.forEach(carta => {
            const fecha = carta.created_at;
            const fechaTexto = fecha
                ? new Date(fecha).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                : '-';
            const estado = carta.estado_carta || 'En Revisión';
            const colorEstado = estado === 'Aprobada' ? 'bg-green-100 text-green-700'
                : estado === 'Rechazada' ? 'bg-red-100 text-red-700'
                    : estado === 'Pendiente' ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700';
            const url = urlArchivoSegura(carta.carta_compromiso_url);
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td class="p-2 font-mono text-[10px] text-gray-500">${escaparHtml(fechaTexto)}</td>
                    <td class="p-2 font-bold">${escaparHtml(carta.ci)}</td>
                    <td class="p-2 font-semibold">${escaparHtml(carta.nombre_completo)}</td>
                    <td class="p-2">${escaparHtml(edadInscrito(carta))}</td>
                    <td class="p-2">${escaparHtml(carta.celula || '-')}</td>
                    <td class="p-2"><span class="rounded-full px-2 py-1 text-[10px] font-bold ${colorEstado}">${escaparHtml(estado)}</span></td>
                    <td class="p-2">${url ? `<a href="${escaparHtml(url)}" target="_blank" rel="noopener noreferrer" class="font-bold text-indigo-600 underline">Ver carta</a>` : 'Sin archivo'}</td>
                    <td class="p-2">
                        <div class="flex justify-center gap-1">
                            ${url && estado !== 'Aprobada' ? `<button type="button" onclick="procesarCarta(decodeURIComponent('${argumentoSeguroJs(carta.id)}'), 'Aprobada', decodeURIComponent('${argumentoSeguroJs(carta.nombre_completo)}'))" class="rounded bg-green-600 px-2 py-1 text-xs font-bold text-white">Aprobar</button>` : ''}
                            ${url && estado !== 'Rechazada' ? `<button type="button" onclick="procesarCarta(decodeURIComponent('${argumentoSeguroJs(carta.id)}'), 'Rechazada', decodeURIComponent('${argumentoSeguroJs(carta.nombre_completo)}'))" class="rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">Rechazar</button>` : ''}
                        </div>
                    </td>
                </tr>`);
        });
    } catch (error) {
        console.error('Error cargando el módulo de cartas:', error);
        tbody.innerHTML = '';
        mensaje.textContent = `No se pudieron cargar las cartas: ${error.message}`;
        mensaje.classList.remove('hidden');
        select.innerHTML = '<option value="">No se pudieron cargar los campamentistas</option>';
    }
}

async function actualizarDisponibilidadDescargaCarta(habilitada) {
    const toggle = document.getElementById('toggleDescargaModeloCarta');
    toggle.disabled = true;
    try {
        const { error } = await db.from('configuracion_sistema').upsert({
            clave: CLAVE_DESCARGA_CARTA_HABILITADA,
            valor: String(habilitada)
        }, { onConflict: 'clave' });
        if (error) throw error;

        await registrarLogAuditoria(
            'Cambio disponibilidad descarga de cartas',
            'Cartas',
            `La descarga del modelo quedó ${habilitada ? 'habilitada' : 'deshabilitada'} para los campamentistas.`
        );
    } catch (error) {
        console.error('Error actualizando la disponibilidad de descarga de cartas:', error);
        toggle.checked = !habilitada;
        alert('No se pudo actualizar la disponibilidad de descarga: ' + error.message);
    } finally {
        toggle.disabled = false;
    }
}

async function subirCartaPorAdmin(event) {
    event.preventDefault();
    const inscritoId = document.getElementById('selectCampamentistaCarta').value;
    const input = document.getElementById('inputCartaAdmin');
    const file = input.files[0];
    if (!inscritoId || !file) return alert('Selecciona un campamentista y el archivo de su carta.');
    if (!validarArchivo(file)) return;

    const boton = document.getElementById('btnSubirCartaAdmin');
    boton.disabled = true;
    boton.textContent = 'Subiendo...';
    try {
        const optimizado = await optimizarYComprimirImagen(file);
        const nombre = `administrativas/${nombreArchivoAleatorio(optimizado)}`;
        const { error: uploadError } = await db.storage.from('cartas').upload(nombre, optimizado);
        if (uploadError) throw uploadError;

        const { data: urlData } = db.storage.from('cartas').getPublicUrl(nombre);
        const { data, error: updateError } = await db.from('inscritos')
            .update({ carta_compromiso_url: urlData.publicUrl, estado_carta: 'En Revisión' })
            .eq('id', inscritoId)
            .select('id,nombre_completo')
            .single();
        if (updateError) throw updateError;
        if (!data) throw new Error('No se confirmó la actualización del campamentista.');

        await registrarLogAuditoria('Carga administrativa de carta', 'Cartas', `Subió una carta para ${data.nombre_completo}.`);
        event.target.reset();
        await cargarModuloCartas();
        alert('Carta subida y enviada a revisión correctamente.');
    } catch (error) {
        console.error('Error subiendo carta por administración:', error);
        alert('No se pudo subir la carta: ' + error.message);
    } finally {
        boton.disabled = false;
        boton.textContent = 'Subir carta';
    }
}

async function registrarLogAuditoria(accion, modulo, detalle) {
    try {
        await db.from('auditoria_logs').insert([{
            admin_nombre: adminSesion?.nombre || 'Administración',
            accion: accion,
            modulo: modulo,
            detalle: detalle
        }]);
    } catch (err) {
        console.error('Error registrando log:', err);
    }
}

async function cargarAuditoriaLogs() {
    const { data: logs, error } = await db.from('auditoria_logs')
        .select('created_at,admin_nombre,modulo,accion,detalle')
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) throw error;
    const tbody = document.getElementById('tblLogsAuditoria');
    if (!tbody) return;

    tbody.innerHTML = '';
    (logs || []).forEach(l => {
        const fechaFmt = l.created_at ? new Date(l.created_at).toLocaleString() : '-';
        tbody.innerHTML += `
            <tr>
                <td class="p-2 font-mono text-gray-500">${fechaFmt}</td>
                <td class="p-2 font-bold text-gray-800">${escaparHtml(l.admin_nombre || 'Sistema')}</td>
                <td class="p-2"><span class="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">${escaparHtml(l.modulo || 'General')}</span></td>
                <td class="p-2 font-semibold">${escaparHtml(l.accion)}</td>
                <td class="p-2 text-gray-600">${escaparHtml(l.detalle || '-')}</td>
            </tr>
        `;
    });
}

function verCambiosSolicitadosModal(idSol) {
    const sol = solicitudesEdicionGlobal.find(s => s.id === idSol);
    if (!sol) return;

    const ins = sol.inscritos || {};
    const cont = document.getElementById('contenidoComparativoCambios');
    cont.innerHTML = `
        <p class="font-bold text-gray-700 border-b pb-1">Campamentista: <span class="text-indigo-700">${escaparHtml(ins.nombre_completo)}</span> (C.I. ${escaparHtml(ins.ci)})</p>
        <div class="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border text-[11px]">
            <div class="font-bold text-gray-500 uppercase">Campo</div>
            <div class="grid grid-cols-2 gap-1 font-bold text-gray-500 uppercase">
                <span>Valor Actual</span>
                <span class="text-blue-600">Nuevo Solicitado</span>
            </div>
        </div>
    `;

    const mapaCampos = {
        nombre_completo: 'Nombre Completo',
        telefono: 'Teléfono',
        fecha_nacimiento: 'Fecha Nacimiento',
        celula: 'Célula',
        talla_polera: 'Talla Polera',
        actividad_favorita: 'Actividad',
        habilidad_especial: 'Habilidad / Talento',
        sabe_nadar: '¿Sabe nadar?',
        contacto_emergencia: 'Contacto Emergencia',
        alergias_medicina: 'Alergias',
        tutor_nombre: 'Nombre Tutor',
        tutor_telefono: 'Teléfono Tutor'
    };

    Object.keys(mapaCampos).forEach(key => {
        if (sol[key] !== undefined && sol[key] !== null && sol[key] !== ins[key]) {
            let valActual = key === 'fecha_nacimiento'
                ? formatearFechaLatina(ins[key])
                : key === 'sabe_nadar'
                    ? (ins[key] === true ? 'Sí' : ins[key] === false ? 'No' : '(Vacío)')
                    : (ins[key] || '(Vacío)');
            let valNuevo = key === 'fecha_nacimiento'
                ? formatearFechaLatina(sol[key])
                : key === 'sabe_nadar'
                    ? (sol[key] === true ? 'Sí' : 'No')
                    : sol[key];

            cont.innerHTML += `
                <div class="grid grid-cols-2 gap-2 p-2 border-b items-center">
                    <span class="font-bold text-gray-700">${mapaCampos[key]}:</span>
                    <div class="grid grid-cols-2 gap-1 font-semibold">
                        <span class="text-gray-500 line-through">${escaparHtml(valActual)}</span>
                        <span class="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">${escaparHtml(valNuevo)}</span>
                    </div>
                </div>
            `;
        }
    });

    document.getElementById('pieModalCambiosAcciones').innerHTML = `
        <button onclick="cerrarModalVerCambios()" class="bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl">Cancelar</button>
        <button onclick="procesarEdicion(decodeURIComponent('${argumentoSeguroJs(sol.id)}'), 'Rechazado')" class="bg-red-600 text-white font-bold px-4 py-2 rounded-xl shadow">Rechazar ✕</button>
        <button onclick="procesarEdicion(decodeURIComponent('${argumentoSeguroJs(sol.id)}'), 'Aprobado')" class="bg-green-600 text-white font-bold px-5 py-2 rounded-xl shadow">Aprobar Cambios ✓</button>
    `;

    document.getElementById('modalVerCambiosSolicitados').classList.remove('hidden');
}

function cerrarModalVerCambios() {
    document.getElementById('modalVerCambiosSolicitados').classList.add('hidden');
}

function crearNuevoCampoPersonalizado(e) {
    e.preventDefault();
    const sqlName = document.getElementById('campoSqlName').value.trim().toLowerCase().replace(/\s+/g, '_');
    const labelName = document.getElementById('campoLabelName').value.trim();
    const tipo = document.getElementById('campoTipo').value;
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(sqlName)) {
        alert('El nombre técnico debe iniciar con una letra y contener solo letras, números o guion bajo (máximo 63 caracteres).');
        return;
    }

    let tipoSql = 'TEXT';
    if (tipo === 'numeric') tipoSql = 'NUMERIC';
    else if (tipo === 'boolean') tipoSql = 'BOOLEAN DEFAULT FALSE';
    else if (tipo === 'date') tipoSql = 'DATE';

    const scriptSql = `-- Ejecutar este comando en Supabase -> SQL Editor:\nALTER TABLE inscritos ADD COLUMN IF NOT EXISTS ${sqlName} ${tipoSql};`;

    document.getElementById('codeSqlOutput').innerText = scriptSql;
    alert(`Campo "${labelName}" configurado. Copia y ejecuta el script generado en Supabase SQL Editor.`);
    e.target.reset();
}

function copiarScriptSql() {
    const code = document.getElementById('codeSqlOutput').innerText;
    navigator.clipboard.writeText(code);
    alert('Script SQL copiado al portapapeles.');
}

function verificarSaldoInscritoSelect(inscritoId) {
    if (!inscritoId) return;
    const ins = listaInscritosGlobal.find(i => i.id === inscritoId);
    if (!ins) return;

    let costo = ins.tipos_inscripcion?.es_manual ? (ins.precio_personalizado || 0) : (ins.tipos_inscripcion?.precio || 140);
    let misPagos = listaPagosGlobal.filter(p => p.inscrito_id === ins.id);
    let abonado = misPagos.reduce((s, p) => s + Number(p.monto), 0);
    let saldo = costo - abonado;

    const btnConfirmar = document.getElementById('btnConfirmarCobroDirecto');

    if (saldo <= 0) {
        alert(`⚠️ ATENCIÓN: ${ins.nombre_completo} ya tiene pagada completamente su inscripción.`);
        btnConfirmar.disabled = true;
        btnConfirmar.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        btnConfirmar.disabled = false;
        btnConfirmar.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

async function guardarCobroDirecto(e) {
    e.preventDefault();
    const editId = document.getElementById('pagoAdminIdEdit').value;
    const inscritoId = document.getElementById('pagoAdminInscrito').value;
    const monto = document.getElementById('pagoAdminMonto').value;
    const obs = document.getElementById('pagoAdminObs').value.trim();
    const fileInput = document.getElementById('pagoAdminFile');

    if (!inscritoId || !monto) return alert('Selecciona un campamentista e ingresa el monto.');

    let comprobanteUrl = null;

    if (fileInput.files.length > 0) {
        const archivoOriginal = fileInput.files[0];
        if (!validarArchivo(archivoOriginal)) return;
        let file = await optimizarYComprimirImagen(archivoOriginal);
        const fileName = `admin_cobro_${nombreArchivoAleatorio(file)}`;
        const { data: uploadData, error: uploadErr } = await db.storage.from('comprobantes').upload(fileName, file);
        if (uploadErr) return alert('Error al subir el comprobante: ' + uploadErr.message);

        const { data: urlData } = db.storage.from('comprobantes').getPublicUrl(fileName);
        comprobanteUrl = urlData.publicUrl;
    } else if (!editId) {
        return alert('⚠️ Es obligatorio adjuntar el comprobante.');
    }

    const payload = {
        inscrito_id: inscritoId,
        monto: monto,
        estado: 'Aprobado',
        observaciones: obs || `Cobro registrado por ${adminSesion.nombre}`
    };

    if (comprobanteUrl) payload.comprobante_url = comprobanteUrl;

    if (editId) {
        await db.from('pagos').update(payload).eq('id', editId);
        await registrarLogAuditoria('Edición Pago', 'Ingresos', `Actualizó pago ID: ${editId} a Bs ${monto}`);
    } else {
        await db.from('pagos').insert([payload]);
        await registrarLogAuditoria('Cobro Directo', 'Ingresos', `Registró pago de Bs ${monto}`);
    }

    e.target.reset();
    toggleFormulario('formContenedorPagoDirecto');
    cargarTodoElDashboard();
}

async function cargarPendientes() {
    const [pagosResult, edicionesResult] = await Promise.all([
        db.from('pagos')
            .select('id,monto,fecha,comprobante_url,inscritos(nombre_completo)')
            .eq('estado', 'Pendiente'),
        db.from('solicitudes_edicion')
            .select('id,fecha,inscrito_id,nombre_completo,telefono,fecha_nacimiento,celula,talla_polera,tipo_inscripcion_id,actividad_favorita,habilidad_especial,sabe_nadar,contacto_emergencia,alergias_medicina,tutor_nombre,tutor_telefono,inscritos(id,nombre_completo,ci,telefono,fecha_nacimiento,celula,talla_polera,tipo_inscripcion_id,actividad_favorita,habilidad_especial,sabe_nadar,contacto_emergencia,alergias_medicina,tutor_nombre,tutor_telefono)')
            .eq('estado', 'Pendiente')
    ]);
    const pagosPend = pagosResult.data;
    const pagosError = pagosResult.error;
    if (pagosError) throw pagosError;
    const tbodyP = document.getElementById('tblPagosPendientes');
    tbodyP.innerHTML = '';
    (pagosPend || []).forEach(p => {
        const fechaFmt = p.fecha
            ? new Date(p.fecha).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
            : '-';
        const nombreInscrito = p.inscritos?.nombre_completo || 'Usuario';
        const comprobanteUrl = urlArchivoSegura(p.comprobante_url);
        tbodyP.innerHTML += `
  <tr>
    <td class="p-2 font-mono text-[10px] text-gray-500">${escaparHtml(fechaFmt)}</td>
    <td class="p-2 font-semibold">${escaparHtml(nombreInscrito)}</td>
    <td class="p-2 font-bold text-green-600">Bs ${escaparHtml(p.monto)}</td>
    <td class="p-2">${comprobanteUrl ? `<a href="${escaparHtml(comprobanteUrl)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-bold">Ver Foto</a>` : 'Sin archivo'}</td>
    <td class="p-2 flex gap-1">
      <button onclick="procesarPago(decodeURIComponent('${argumentoSeguroJs(p.id)}'), 'Aprobado', decodeURIComponent('${argumentoSeguroJs(nombreInscrito)}'), decodeURIComponent('${argumentoSeguroJs(p.monto)}'))" class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-bold">✓</button>
      <button onclick="procesarPago(decodeURIComponent('${argumentoSeguroJs(p.id)}'), 'Rechazado', decodeURIComponent('${argumentoSeguroJs(nombreInscrito)}'), decodeURIComponent('${argumentoSeguroJs(p.monto)}'))" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-bold">✕</button>
    </td>
  </tr>`;
    });

    const edicPend = edicionesResult.data;
    const edicionesError = edicionesResult.error;
    if (edicionesError) throw edicionesError;
    solicitudesEdicionGlobal = edicPend || [];
    const tbodyE = document.getElementById('tblEdicionesPendientes');
    tbodyE.innerHTML = '';

    solicitudesEdicionGlobal.forEach(e => {
        const fechaFmt = e.fecha
            ? new Date(e.fecha).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
            : '-';
        tbodyE.innerHTML += `
  <tr>
    <td class="p-2 font-mono text-[10px] text-gray-500">${escaparHtml(fechaFmt)}</td>
    <td class="p-2 font-semibold">${escaparHtml(e.inscritos?.nombre_completo)}</td>
    <td class="p-2 text-xs text-indigo-900 font-semibold">
      <button onclick="verCambiosSolicitadosModal(decodeURIComponent('${argumentoSeguroJs(e.id)}'))" class="bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-2 py-1 rounded-lg border border-blue-300">
        👁️ Ver Cambios
      </button>
    </td>
    <td class="p-2 text-center flex justify-center gap-1">
      <button onclick="procesarEdicion(decodeURIComponent('${argumentoSeguroJs(e.id)}'), 'Aprobado')" class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-bold">Aprobar ✓</button>
      <button onclick="procesarEdicion(decodeURIComponent('${argumentoSeguroJs(e.id)}'), 'Rechazado')" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-bold">Rechazar ✕</button>
    </td>
  </tr>`;
    });

}

async function procesarEdicion(idSol, estado) {
    const { data: sol } = await db.from('solicitudes_edicion').select('*').eq('id', idSol).single();
    await db.from('solicitudes_edicion').update({ estado: estado }).eq('id', idSol);

    if (estado === 'Aprobado' && sol) {
        const updatePayload = {};
        if (sol.nombre_completo) updatePayload.nombre_completo = sol.nombre_completo;
        if (sol.telefono !== undefined) updatePayload.telefono = sol.telefono;
        if (sol.fecha_nacimiento !== undefined) {
            updatePayload.fecha_nacimiento = sol.fecha_nacimiento;
            updatePayload.es_menor = sol.fecha_nacimiento ? calcularEdad(sol.fecha_nacimiento) < 18 : false;
        }
        if (sol.celula !== undefined) updatePayload.celula = sol.celula;
        if (sol.talla_polera !== undefined) updatePayload.talla_polera = sol.talla_polera;
        if (sol.tipo_inscripcion_id !== undefined && sol.tipo_inscripcion_id !== null) updatePayload.tipo_inscripcion_id = sol.tipo_inscripcion_id;
        if (sol.actividad_favorita !== undefined) updatePayload.actividad_favorita = sol.actividad_favorita;
        if (sol.habilidad_especial !== undefined) updatePayload.habilidad_especial = sol.habilidad_especial;
        if (sol.sabe_nadar !== undefined) updatePayload.sabe_nadar = sol.sabe_nadar;
        if (sol.contacto_emergencia !== undefined) updatePayload.contacto_emergencia = sol.contacto_emergencia;
        if (sol.alergias_medicina !== undefined) updatePayload.alergias_medicina = sol.alergias_medicina;
        if (sol.tutor_nombre !== undefined) updatePayload.tutor_nombre = sol.tutor_nombre;
        if (sol.tutor_telefono !== undefined) updatePayload.tutor_telefono = sol.tutor_telefono;

        await db.from('inscritos').update(updatePayload).eq('id', sol.inscrito_id);
        await registrarLogAuditoria('Aprobación Cambios', 'Pendientes', `Aprobó cambios de datos para campamentista.`);
    }

    cerrarModalVerCambios();
    alert(`Solicitud ${estado}.`);
    cargarTodoElDashboard();
}

async function cambiarPestana(tab) {
    const pestanasPermitidas = ['solicitudes', 'cartas', 'inscritos', 'campos', 'categorias', 'ingresos', 'egresos', 'reportes', 'usuarios', 'roles', 'auditoria'];
    if (!pestanasPermitidas.includes(tab)) return;

    const sufijo = tab.charAt(0).toUpperCase() + tab.slice(1);
    const btnActivo = document.getElementById(`nav${sufijo}`);
    const contenidoActivo = document.getElementById(`tab${sufijo}`);
    if (!btnActivo || !contenidoActivo || getComputedStyle(btnActivo).display === 'none') return;
    moduloAdminActivo = tab;

    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('bg-gray-900', 'text-white');
        b.classList.add('bg-white', 'text-gray-600');
        b.removeAttribute('aria-current');
    });

    btnActivo.classList.remove('bg-white', 'text-gray-600');
    btnActivo.classList.add('bg-gray-900', 'text-white');
    btnActivo.setAttribute('aria-current', 'page');
    contenidoActivo.classList.remove('hidden');

    const titulos = {
        solicitudes: ['Pendientes', 'Revisa y gestiona las tareas que requieren atención.'],
        cartas: ['Cartas de compromiso', 'Administra las cartas recibidas y los modelos vigentes por edad.'],
        inscritos: ['Inscritos y staff', 'Consulta, organiza y administra los registros del campamento.'],
        campos: ['Campos y SQL', 'Configura los datos personalizados del formulario.'],
        categorias: ['Tipos de inscripción', 'Administra modalidades, precios y visibilidad.'],
        ingresos: ['Ingresos y QR', 'Registra pagos y consulta los ingresos del campamento.'],
        egresos: ['Egresos', 'Registra y revisa los gastos del campamento.'],
        reportes: ['Reportes avanzados', 'Explora y organiza los datos del campamento.'],
        usuarios: ['Administradores', 'Gestiona las cuentas de acceso al panel.'],
        roles: ['Permisos y roles', 'Configura el acceso de cada rol administrativo.'],
        auditoria: ['Auditoría y logs', 'Consulta las acciones registradas en el panel.']
    };
    document.getElementById('tituloModuloActivo').textContent = titulos[tab][0];
    document.getElementById('descripcionModuloActivo').textContent = titulos[tab][1];
    await cargarContenidoPestana(tab);
}

function toggleAdminSidebar() {
    const workspace = document.querySelector('.admin-workspace');
    const dashboard = document.getElementById('secDashboard');
    const boton = document.getElementById('btnToggleSidebar');
    const icono = document.getElementById('iconToggleSidebar');
    const oculto = workspace.classList.toggle('sidebar-collapsed');
    dashboard.classList.toggle('sidebar-collapsed', oculto);
    boton.setAttribute('aria-expanded', String(!oculto));
    boton.setAttribute('aria-label', oculto ? 'Mostrar menú' : 'Ocultar menú');
    icono.classList.toggle('fa-bars', !oculto);
    icono.classList.toggle('fa-xmark', oculto);
}

function cambiarPestanaModal(pestana) {
    document.getElementById('tabModalGen').classList.add('hidden');
    document.getElementById('tabModalAsig').classList.add('hidden');
    document.getElementById('tabModalSalud').classList.add('hidden');

    document.getElementById('btnTabModal1').className = "px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200";
    document.getElementById('btnTabModal2').className = "px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200";
    document.getElementById('btnTabModal3').className = "px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200";

    if (pestana === 'gen') {
        document.getElementById('tabModalGen').classList.remove('hidden');
        document.getElementById('btnTabModal1').className = "px-3 py-1.5 rounded-lg bg-gray-900 text-white";
    } else if (pestana === 'asig') {
        document.getElementById('tabModalAsig').classList.remove('hidden');
        document.getElementById('btnTabModal2').className = "px-3 py-1.5 rounded-lg bg-gray-900 text-white";
    } else if (pestana === 'salud') {
        document.getElementById('tabModalSalud').classList.remove('hidden');
        document.getElementById('btnTabModal3').className = "px-3 py-1.5 rounded-lg bg-gray-900 text-white";
    }
}

function prepararCrearCategoria() {
    document.getElementById('catIdEdit').value = '';
    document.getElementById('catNombre').value = '';
    document.getElementById('catPrecio').value = '';
    document.getElementById('catEsManual').checked = false;
    document.getElementById('catEsVisible').checked = true;
    document.getElementById('formContenedorCategoria').classList.remove('hidden');
}

function editarCategoria(id) {
    const cat = tiposInscripcionGlobal.find(t => t.id === id);
    if (!cat) return;

    document.getElementById('catIdEdit').value = cat.id;
    document.getElementById('catNombre').value = cat.nombre;
    document.getElementById('catPrecio').value = cat.precio;
    document.getElementById('catEsManual').checked = !!cat.es_manual;
    document.getElementById('catEsVisible').checked = !!cat.es_visible;
    document.getElementById('formContenedorCategoria').classList.remove('hidden');
}

async function guardarTipoInscripcion(e) {
    e.preventDefault();
    const id = document.getElementById('catIdEdit').value;
    const nombre = document.getElementById('catNombre').value.trim();
    const precio = parseFloat(document.getElementById('catPrecio').value) || 0;
    const esManual = document.getElementById('catEsManual').checked;
    const esVisible = document.getElementById('catEsVisible').checked;

    const payload = { nombre, precio, es_manual: esManual, es_visible: esVisible };

    if (id) {
        await db.from('tipos_inscripcion').update(payload).eq('id', id);
        await registrarLogAuditoria('Editar Categoría', 'Categorías', `Modificó categoría: ${nombre}`);
    } else {
        await db.from('tipos_inscripcion').insert([payload]);
        await registrarLogAuditoria('Nueva Categoría', 'Categorías', `Creó categoría: ${nombre}`);
    }

    alert('Tipo de inscripción guardado correctamente.');
    toggleFormulario('formContenedorCategoria');
    cargarTiposInscripcion();
}

async function cargarTiposInscripcion() {
    const { data, error } = await db.from('tipos_inscripcion')
        .select('id,nombre,precio,es_manual,es_visible')
        .order('precio', { ascending: false });
    if (error) throw error;
    tiposInscripcionGlobal = data || [];

    const selectNew = document.getElementById('newTipoInscripcion');
    const selectEdit = document.getElementById('editInsTipoInscripcion');

    selectNew.innerHTML = '<option value="">-- Seleccionar Tipo --</option>';
    selectEdit.innerHTML = '<option value="">-- Seleccionar Tipo --</option>';

    tiposInscripcionGlobal.forEach(t => {
        let visibTag = t.es_visible ? '' : ' (Oculto en portal)';
        let label = t.es_manual ? `${t.nombre} (Precio manual)${visibTag}` : `${t.nombre} (Bs ${t.precio})${visibTag}`;
        selectNew.innerHTML += `<option value="${escaparHtml(t.id)}">${escaparHtml(label)}</option>`;
        selectEdit.innerHTML += `<option value="${escaparHtml(t.id)}">${escaparHtml(label)}</option>`;
    });

    const tbody = document.getElementById('tblTiposInscripcion');
    if (tbody) {
        tbody.innerHTML = '';
        tiposInscripcionGlobal.forEach(t => {
            let badgeVisib = t.es_visible
                ? `<span class="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full text-[10px]">👁️ Visible Público</span>`
                : `<span class="bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-full text-[10px]">🔒 Solo Admin</span>`;

            tbody.innerHTML += `
    <tr>
      <td class="p-2 font-bold text-indigo-900">${escaparHtml(t.nombre)}</td>
      <td class="p-2 font-semibold">Bs ${escaparHtml(t.precio)}</td>
      <td class="p-2"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${t.es_manual ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}">${t.es_manual ? 'Precio Personalizado' : 'Fijo'}</span></td>
      <td class="p-2">${badgeVisib}</td>
      <td class="p-2 text-center flex justify-center gap-1">
        <button onclick="editarCategoria(decodeURIComponent('${argumentoSeguroJs(t.id)}'))" class="bg-amber-100 hover:bg-amber-200 text-amber-900 p-1.5 rounded-lg border border-amber-300">
          <i class="fa-solid fa-pencil text-xs"></i>
        </button>
        <button onclick="solicitarSeguridad('borrarCategoria', decodeURIComponent('${argumentoSeguroJs(t.id)}'))" class="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg border border-red-200">
          <i class="fa-solid fa-trash text-xs"></i>
        </button>
      </td>
    </tr>`;
        });
    }
}

function prepararCrearCobroDirecto() {
    document.getElementById('pagoAdminIdEdit').value = '';
    document.getElementById('lblTituloPagoForm').innerText = 'Registrar Pago Manual a Campamentista';
    document.getElementById('pagoAdminInscrito').value = '';
    document.getElementById('pagoAdminMonto').value = '';
    document.getElementById('pagoAdminObs').value = '';
    document.getElementById('pagoAdminFile').value = '';
    document.getElementById('formContenedorPagoDirecto').classList.remove('hidden');
}

function abrirModalEditarIngreso(pagoId) {
    const pago = listaPagosGlobal.find(p => p.id === pagoId);
    if (!pago) return;

    document.getElementById('pagoAdminIdEdit').value = pago.id;
    document.getElementById('lblTituloPagoForm').innerText = 'Editar Pago / Ingreso Registrado';
    document.getElementById('pagoAdminInscrito').value = pago.inscrito_id || '';
    document.getElementById('pagoAdminMonto').value = pago.monto;
    document.getElementById('pagoAdminObs').value = pago.observaciones || '';
    document.getElementById('formContenedorPagoDirecto').classList.remove('hidden');
}

function prepararCrearEgreso() {
    document.getElementById('egIdEdit').value = '';
    document.getElementById('egConcepto').value = '';
    document.getElementById('egCategoria').value = 'Alimentación';
    document.getElementById('egMonto').value = '';
    document.getElementById('formContenedorEgreso').classList.remove('hidden');
}

function abrirModalEditarEgreso(id, concepto, categoria, monto) {
    document.getElementById('egIdEdit').value = id;
    document.getElementById('egConcepto').value = concepto;
    document.getElementById('egCategoria').value = categoria;
    document.getElementById('egMonto').value = monto;
    document.getElementById('formContenedorEgreso').classList.remove('hidden');
}

async function registrarNuevoEgreso(e) {
    e.preventDefault();
    const id = document.getElementById('egIdEdit').value;
    const concepto = document.getElementById('egConcepto').value.trim();
    const categoria = document.getElementById('egCategoria').value;
    const monto = parseFloat(document.getElementById('egMonto').value) || 0;

    const payload = { concepto, categoria, monto, registrado_por: adminSesion?.nombre || 'Admin' };

    if (id) {
        await db.from('egresos').update(payload).eq('id', id);
        await registrarLogAuditoria('Editar Egreso', 'Egresos', `Modificó egreso: ${concepto}`);
    } else {
        await db.from('egresos').insert([payload]);
        await registrarLogAuditoria('Nuevo Egreso', 'Egresos', `Registró egreso por Bs ${monto}`);
    }

    alert('Egreso guardado correctamente.');
    toggleFormulario('formContenedorEgreso');
    cargarTodoElDashboard();
}

async function guardarAdmin(e) {
    e.preventDefault();
    const nombre = document.getElementById('adminNewNombre').value.trim();
    const user = document.getElementById('adminNewUser').value.trim();
    const pass = document.getElementById('adminNewPass').value;
    const tel = document.getElementById('adminNewTel').value.trim();
    const rolId = document.getElementById('adminRolSelect').value;

    if (pass.length < 12) return alert('La contraseña debe tener al menos 12 caracteres.');
    const hashHex = await calcularSHA256(pass);

    await db.from('administradores').insert([{ nombre, usuario: user, password_hash: hashHex, telefono: tel, rol_id: rolId || null }]);
    await registrarLogAuditoria('Nuevo Admin', 'Administradores', `Creó usuario admin: ${user}`);
    alert('Administrador / Encargado registrado.');
    e.target.reset();
    toggleFormulario('formContenedorAdmin');
    cargarRolesYAdmins();
}

function abrirModalEditarAdmin(adminId) {
    const admin = listaAdminsGlobal.find(a => a.id === adminId);
    if (!admin) return;

    document.getElementById('editAdminId').value = admin.id;
    document.getElementById('editAdminNombre').value = admin.nombre;
    document.getElementById('editAdminUser').value = admin.usuario;
    document.getElementById('editAdminTel').value = admin.telefono || '';
    document.getElementById('editAdminNewPass').value = '';

    const selectRol = document.getElementById('editAdminRolSelect');
    selectRol.innerHTML = '';
    listaRolesGlobal.forEach(r => {
        let sel = r.id === admin.rol_id ? 'selected' : '';
        selectRol.innerHTML += `<option value="${escaparHtml(r.id)}" ${sel}>${escaparHtml(r.nombre)}</option>`;
    });

    document.getElementById('modalEditAdmin').classList.remove('hidden');
}

function cerrarModalEditAdmin() {
    document.getElementById('modalEditAdmin').classList.add('hidden');
}

async function guardarEdicionAdmin(e) {
    e.preventDefault();
    const id = document.getElementById('editAdminId').value;
    const nombre = document.getElementById('editAdminNombre').value.trim();
    const usuario = document.getElementById('editAdminUser').value.trim();
    const telefono = document.getElementById('editAdminTel').value.trim();
    const rol_id = document.getElementById('editAdminRolSelect').value;
    const newPass = document.getElementById('editAdminNewPass').value;

    const payload = { nombre, usuario, telefono, rol_id };

    if (newPass) {
        if (newPass.length < 12) return alert('La contraseña debe tener al menos 12 caracteres.');
        payload.password_hash = await calcularSHA256(newPass);
    }

    await db.from('administradores').update(payload).eq('id', id);
    await registrarLogAuditoria('Edición Admin', 'Administradores', `Actualizó datos/contraseña de usuario: ${usuario}`);
    alert('Administrador actualizado con éxito.');
    cerrarModalEditAdmin();
    cargarRolesYAdmins();
}

function abrirModalPerfilAdmin() {
    if (!adminSesion?.id) {
        alert('Inicia sesión nuevamente para editar tu perfil.');
        return;
    }

    document.getElementById('perfilAdminNombre').value = adminSesion.nombre || '';
    document.getElementById('perfilAdminUsuario').value = adminSesion.usuario || '';
    document.getElementById('perfilAdminTelefono').value = adminSesion.telefono || '';
    document.getElementById('perfilAdminNuevaPass').value = '';
    document.getElementById('perfilAdminError').classList.add('hidden');
    document.getElementById('perfilAdminError').textContent = '';
    document.getElementById('modalPerfilAdmin').classList.remove('hidden');
}

function cerrarModalPerfilAdmin() {
    document.getElementById('modalPerfilAdmin').classList.add('hidden');
}

async function guardarPerfilAdmin(e) {
    e.preventDefault();
    if (!adminSesion?.id) {
        alert('Tu sesión no está disponible. Inicia sesión nuevamente.');
        return;
    }

    const boton = document.getElementById('btnGuardarPerfilAdmin');
    const mensajeError = document.getElementById('perfilAdminError');
    const nombre = document.getElementById('perfilAdminNombre').value.trim();
    const usuario = document.getElementById('perfilAdminUsuario').value.trim();
    const telefono = document.getElementById('perfilAdminTelefono').value.trim();
    const nuevaPass = document.getElementById('perfilAdminNuevaPass').value;
    const payload = { nombre, usuario, telefono };

    if (nuevaPass) {
        if (nuevaPass.length < 12) {
            mensajeError.textContent = 'La contraseña debe tener al menos 12 caracteres.';
            mensajeError.classList.remove('hidden');
            return;
        }
        payload.password_hash = await calcularSHA256(nuevaPass);
    }

    boton.disabled = true;
    boton.textContent = 'Guardando…';
    mensajeError.classList.add('hidden');
    mensajeError.textContent = '';

    try {
        const { data, error } = await db.from('administradores')
            .update(payload)
            .eq('id', adminSesion.id)
            .select('id, nombre, usuario, telefono')
            .single();

        if (error) throw error;
        if (!data) throw new Error('No se recibió confirmación del cambio.');

        const nombreAnterior = adminSesion.nombre;
        adminSesion = { ...adminSesion, ...data };
        document.getElementById('txtAdminInfo').innerText = data.nombre;
        await registrarLogAuditoria('Actualización de perfil', 'Mi Perfil', `Actualizó sus datos de acceso${nuevaPass ? ' y contraseña' : ''}.`);
        cerrarModalPerfilAdmin();
        alert('Tu perfil se actualizó correctamente.');
        if (nombreAnterior !== data.nombre) cargarAuditoriaLogs();
    } catch (error) {
        console.error('Error actualizando el perfil del administrador:', error);
        mensajeError.textContent = `No se pudo guardar el perfil: ${error.message || 'error de conexión'}`;
        mensajeError.classList.remove('hidden');
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar perfil';
    }
}

function prepararCrearRol() {
    document.getElementById('rolIdEdit').value = '';
    document.getElementById('rolNombre').value = '';
    document.querySelectorAll('#formContenedorRol input[type="checkbox"]').forEach(c => c.checked = false);
    document.getElementById('formContenedorRol').classList.remove('hidden');
}

async function guardarRol(e) {
    e.preventDefault();
    const id = document.getElementById('rolIdEdit').value;
    const nombre = document.getElementById('rolNombre').value.trim();

    const permisos = {
        verFinanzas: document.getElementById('permVerFinanzas').checked,
        solicitudes: document.getElementById('permSolicitudes').checked,
        cartas: document.getElementById('permCartas').checked,
        inscritosVer: document.getElementById('permInscritosVer').checked,
        inscritosCrear: document.getElementById('permInscritosCrear').checked,
        inscritosEditar: document.getElementById('permInscritosEditar').checked,
        inscritosEliminar: document.getElementById('permInscritosEliminar').checked,
        categorias: document.getElementById('permCategorias').checked,
        ingresosVer: document.getElementById('permIngresosVer').checked,
        ingresosEliminar: document.getElementById('permIngresosEliminar').checked,
        egresosVer: document.getElementById('permEgresosVer').checked,
        egresosCrear: document.getElementById('permEgresosCrear').checked,
        egresosEditar: document.getElementById('permEgresosEditar').checked,
        egresosEliminar: document.getElementById('permEgresosEliminar').checked,
        reportesVer: document.getElementById('permReportesVer').checked,
        reportesCrear: document.getElementById('permReportesCrear').checked,
        usuarios: document.getElementById('permUsuarios').checked,
        roles: document.getElementById('permRoles').checked
    };

    const payload = { nombre, permisos };

    if (id) {
        await db.from('roles').update(payload).eq('id', id);
        await registrarLogAuditoria('Editar Rol', 'Roles', `Actualizó permisos del rol: ${nombre}`);
    } else {
        await db.from('roles').insert([payload]);
        await registrarLogAuditoria('Nuevo Rol', 'Roles', `Creó rol: ${nombre}`);
    }

    alert('Rol guardado correctamente.');
    toggleFormulario('formContenedorRol');
    await cargarRolesYAdmins('roles');
}

function evaluarPrecioManual(tipoId, idDivTarget) {
    const tipo = tiposInscripcionGlobal.find(t => t.id === tipoId);
    const divTarget = document.getElementById(idDivTarget);
    if (tipo && tipo.es_manual) divTarget.classList.remove('hidden');
    else divTarget.classList.add('hidden');
}

async function iniciarSesionAdmin(e) {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;

    const hashHex = await calcularSHA256(pass);

    const { data: admin, error } = await db.from('administradores')
        .select('id, nombre, usuario, telefono, rol_id, roles(*)')
        .eq('usuario', user)
        .eq('password_hash', hashHex)
        .maybeSingle();

    if (error) {
        console.error('Error validando el acceso administrativo:', error);
        return alert('No se pudo validar el acceso. Revisa tu conexión e inténtalo nuevamente.');
    }
    if (!admin) return alert('Credenciales incorrectas');

    adminSesion = admin;
    permisosAdmin = admin.roles?.permisos || {};
    cargarColumnasInscritosPerfil();

    document.getElementById('secLogin').classList.add('hidden');
    document.getElementById('secDashboard').classList.remove('hidden');
    document.getElementById('btnToggleSidebar').classList.remove('hidden');
    document.getElementById('txtAdminInfo').innerText = `${admin.nombre}`;
    document.getElementById('btnPerfilAdmin').classList.remove('hidden');
    document.getElementById('btnCerrarSesion').classList.remove('hidden');

    aplicarPermisosVisuales();
    const primeraPestanaDisponible = Array.from(document.querySelectorAll('.tab-btn'))
        .find(boton => getComputedStyle(boton).display !== 'none');
    if (primeraPestanaDisponible) await cambiarPestana(primeraPestanaDisponible.id.replace(/^nav/, '').toLowerCase());
    await cargarResumenDashboard();
    await registrarLogAuditoria('Inicio de Sesión', 'Acceso', 'El administrador ingresó al sistema.');
}

async function calcularSHA256(texto) {
    const msgUint8 = new TextEncoder().encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function aplicarPermisosVisuales() {
    const esSuper = !adminSesion.rol_id || adminSesion.roles?.nombre === 'SuperAdmin';

    const puedeVerFinanzas = esSuper || permisosAdmin.verFinanzas;
    document.getElementById('contTarjetasFinanzas').style.display = puedeVerFinanzas ? 'grid' : 'none';

    document.getElementById('navSolicitudes').style.display = (esSuper || permisosAdmin.solicitudes) ? 'block' : 'none';
    document.getElementById('navCartas').style.display = (esSuper || permisosAdmin.cartas) ? 'block' : 'none';
    document.getElementById('navInscritos').style.display = (esSuper || permisosAdmin.inscritosVer) ? 'block' : 'none';
    document.getElementById('navCategorias').style.display = (esSuper || permisosAdmin.categorias) ? 'block' : 'none';
    document.getElementById('navIngresos').style.display = (esSuper || permisosAdmin.ingresosVer) ? 'block' : 'none';
    document.getElementById('navEgresos').style.display = (esSuper || permisosAdmin.egresosVer) ? 'block' : 'none';
    document.getElementById('navReportes').style.display = (esSuper || permisosAdmin.reportesVer) ? 'block' : 'none';
    document.getElementById('navUsuarios').style.display = (esSuper || permisosAdmin.usuarios) ? 'block' : 'none';
    document.getElementById('navRoles').style.display = (esSuper || permisosAdmin.roles) ? 'block' : 'none';
    document.getElementById('navAuditoria').style.display = esSuper ? 'block' : 'none';
}

async function cargarTodoElDashboard() {
    await cargarResumenDashboard();
    await cargarContenidoPestana(moduloAdminActivo);
}

async function cargarResumenDashboard() {
    try {
        const puedeVerFinanzas = !adminSesion?.rol_id ||
            adminSesion.roles?.nombre === 'SuperAdmin' || permisosAdmin.verFinanzas;
        const consultas = [
            db.from('inscritos').select('id', { count: 'exact', head: true }),
            db.from('inscritos').select('id', { count: 'exact', head: true }).eq('es_staff', true)
        ];
        if (puedeVerFinanzas) {
            consultas.push(
                db.from('pagos').select('monto').eq('estado', 'Aprobado'),
                db.from('egresos').select('monto')
            );
        }
        const resultados = await Promise.all(consultas);
        const [totalResult, staffResult, pagosResult, egresosResult] = resultados;
        if (totalResult.error) throw totalResult.error;
        if (staffResult.error) throw staffResult.error;

        const staff = staffResult.count || 0;
        const total = totalResult.count || 0;
        document.getElementById('stCampamentistas').innerText = total - staff;
        document.getElementById('stStaff').innerText = staff;
        document.getElementById('stTotalGeneral').innerText = total;

        if (puedeVerFinanzas) {
            if (pagosResult.error) throw pagosResult.error;
            if (egresosResult.error) throw egresosResult.error;
            const ingresos = (pagosResult.data || []).reduce((total, pago) => total + Number(pago.monto || 0), 0);
            const egresos = (egresosResult.data || []).reduce((total, egreso) => total + Number(egreso.monto || 0), 0);
            document.getElementById('stIngresos').innerText = `Bs ${ingresos}`;
            document.getElementById('stEgresos').innerText = `Bs ${egresos}`;
            document.getElementById('stBalance').innerText = `Bs ${ingresos - egresos}`;
        }

    } catch (error) {
        console.error('Error cargando el resumen del panel:', error);
        alert('No se pudo actualizar el resumen del panel: ' + error.message);
    }
}

async function cargarContenidoPestana(tab) {
    try {
        switch (tab) {
            case 'solicitudes':
                await cargarPendientes();
                break;
            case 'cartas':
                await cargarModuloCartas();
                break;
            case 'inscritos': {
                const [inscritosResult, pagosResult] = await Promise.all([
                    db.from('inscritos').select('*, tipos_inscripcion(*)'),
                    db.from('pagos').select('inscrito_id,monto,estado').eq('estado', 'Aprobado')
                ]);
                if (inscritosResult.error) throw inscritosResult.error;
                if (pagosResult.error) throw pagosResult.error;
                listaInscritosGlobal = inscritosResult.data || [];
                listaPagosGlobal = pagosResult.data || [];
                await cargarTiposInscripcion();
                renderizarTablaInscritos();
                break;
            }
            case 'campos':
                break;
            case 'categorias':
                await cargarTiposInscripcion();
                break;
            case 'ingresos': {
                const [pagosResult, inscritosResult] = await Promise.all([
                    db.from('pagos')
                        .select('id,monto,inscrito_id,fecha,observaciones,comprobante_url,inscritos(nombre_completo)')
                        .eq('estado', 'Aprobado'),
                    db.from('inscritos').select('id,nombre_completo,ci,precio_personalizado,tipo_inscripcion_id,tipos_inscripcion(precio,es_manual)')
                ]);
                if (pagosResult.error) throw pagosResult.error;
                if (inscritosResult.error) throw inscritosResult.error;
                listaPagosGlobal = pagosResult.data || [];
                listaInscritosGlobal = inscritosResult.data || [];
                await cargarTiposInscripcion();
                const selectPago = document.getElementById('pagoAdminInscrito');
                selectPago.innerHTML = '<option value="">-- Seleccionar Campamentista --</option>' +
                    listaInscritosGlobal.map(item => `<option value="${escaparHtml(item.id)}">${escaparHtml(item.nombre_completo)} (CI: ${escaparHtml(item.ci)})</option>`).join('');
                const tbody = document.getElementById('tblHistorialIngresos');
                tbody.innerHTML = (listaPagosGlobal || []).map(pago => {
                    const fecha = pago.fecha ? new Date(pago.fecha) : null;
                    const comprobante = urlArchivoSegura(pago.comprobante_url);
                    return `<tr>
                        <td class="p-2">${fecha ? `${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}</td>
                        <td class="p-2 font-semibold">${escaparHtml(pago.inscritos?.nombre_completo || 'Pago Directo')}</td>
                        <td class="p-2 font-bold text-green-600">Bs ${escaparHtml(pago.monto)}</td>
                        <td class="p-2">${escaparHtml(pago.observaciones || '-')}</td>
                        <td class="p-2">${comprobante ? `<a href="${escaparHtml(comprobante)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-bold">Ver Foto</a>` : 'Sin Foto'}</td>
                        <td class="p-2 text-center"><div class="flex justify-center gap-1">
                            <button onclick="abrirModalEditarIngreso(decodeURIComponent('${argumentoSeguroJs(pago.id)}'))" class="rounded-lg border border-amber-300 bg-amber-100 p-1.5 text-amber-900"><i class="fa-solid fa-pencil text-xs"></i></button>
                            <button onclick="solicitarSeguridad('borrarIngreso', decodeURIComponent('${argumentoSeguroJs(pago.id)}'))" class="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600"><i class="fa-solid fa-trash text-xs"></i></button>
                        </div></td>
                    </tr>`;
                }).join('');
                await cargarQrActualAdmin();
                break;
            }
            case 'egresos': {
                const { data, error } = await db.from('egresos').select('id,fecha,concepto,categoria,monto,registrado_por');
                if (error) throw error;
                document.getElementById('tblListaEgresos').innerHTML = (data || []).map(egreso => `
                    <tr>
                        <td class="p-2">${egreso.fecha ? new Date(egreso.fecha).toLocaleDateString() : '-'}</td>
                        <td class="p-2 font-semibold text-gray-800">${escaparHtml(egreso.concepto)}</td>
                        <td class="p-2"><span class="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">${escaparHtml(egreso.categoria)}</span></td>
                        <td class="p-2 font-bold text-red-600">Bs ${escaparHtml(egreso.monto)}</td>
                        <td class="p-2">${escaparHtml(egreso.registrado_por || 'Admin')}</td>
                        <td class="p-2 text-center"><div class="flex justify-center gap-1">
                            <button onclick="abrirModalEditarEgreso(decodeURIComponent('${argumentoSeguroJs(egreso.id)}'), decodeURIComponent('${argumentoSeguroJs(egreso.concepto)}'), decodeURIComponent('${argumentoSeguroJs(egreso.categoria)}'), decodeURIComponent('${argumentoSeguroJs(egreso.monto)}'))" class="rounded-lg border border-amber-300 bg-amber-100 p-1.5 text-amber-800"><i class="fa-solid fa-pencil text-xs"></i></button>
                            <button onclick="solicitarSeguridad('borrarEgreso', decodeURIComponent('${argumentoSeguroJs(egreso.id)}'))" class="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600"><i class="fa-solid fa-trash text-xs"></i></button>
                        </div></td>
                    </tr>`).join('');
                break;
            }
            case 'reportes': {
                const [inscritosResult, pagosResult] = await Promise.all([
                    db.from('inscritos').select('*, tipos_inscripcion(*)'),
                    db.from('pagos').select('id,inscrito_id,monto,estado').eq('estado', 'Aprobado')
                ]);
                if (inscritosResult.error) throw inscritosResult.error;
                if (pagosResult.error) throw pagosResult.error;
                listaInscritosGlobal = inscritosResult.data || [];
                listaPagosGlobal = pagosResult.data || [];
                inicializarCatalogoReportes();
                cargarPlantillasSelect();
                break;
            }
            case 'usuarios':
            case 'roles':
                await cargarRolesYAdmins(tab);
                break;
            case 'auditoria':
                await cargarAuditoriaLogs();
                break;
        }
    } catch (error) {
        console.error(`Error cargando el módulo ${tab}:`, error);
        alert(`No se pudo cargar el módulo: ${error.message}`);
    }
}

function claveColumnasInscritosPerfil() {
    const perfil = adminSesion?.id || adminSesion?.usuario;
    return perfil ? `jc2027_columnas_inscritos_${perfil}` : null;
}

function cargarColumnasInscritosPerfil() {
    const clave = claveColumnasInscritosPerfil();
    if (!clave) return;

    try {
        const guardado = localStorage.getItem(clave);
        if (!guardado) return;
        const configuracion = JSON.parse(guardado);
        if (!configuracion || typeof configuracion !== 'object' || Array.isArray(configuracion)) {
            throw new Error('La configuración de columnas guardada no tiene un formato válido.');
        }
        document.querySelectorAll('[data-columna-inscritos]').forEach(casilla => {
            if (typeof configuracion[casilla.id] === 'boolean') {
                casilla.checked = configuracion[casilla.id];
            }
        });
    } catch (error) {
        console.error('No se pudo cargar la configuración de columnas del perfil:', error);
        alert('No se pudo cargar la configuración guardada de columnas.');
    }
}

function actualizarColumnasInscritos() {
    const clave = claveColumnasInscritosPerfil();
    if (clave) {
        const configuracion = Object.fromEntries(
            Array.from(document.querySelectorAll('[data-columna-inscritos]'))
                .map(casilla => [casilla.id, casilla.checked])
        );
        try {
            localStorage.setItem(clave, JSON.stringify(configuracion));
        } catch (error) {
            console.error('No se pudo guardar la configuración de columnas del perfil:', error);
            alert('No se pudo guardar la configuración de columnas en este navegador.');
        }
    }
    renderizarTablaInscritos();
}

function renderizarTablaInscritos() {
    const showCi = document.getElementById('col_ci').checked;
    const showNombre = document.getElementById('col_nombre').checked;
    const showFecha = document.getElementById('col_fecha').checked;
    const showRol = document.getElementById('col_rol').checked;
    const showInscripcion = document.getElementById('col_inscripcion').checked;
    const showTel = document.getElementById('col_tel').checked;
    const showCelula = document.getElementById('col_celula').checked;
    const showTalla = document.getElementById('col_talla').checked;
    const showActividad = document.getElementById('col_actividad').checked;
    const showHabilidad = document.getElementById('col_habilidad').checked;
    const showSabeNadar = document.getElementById('col_nadar').checked;
    const showMenor = document.getElementById('col_menor').checked;
    const showEmergencia = document.getElementById('col_emergencia').checked;
    const showAlergias = document.getElementById('col_alergias').checked;
    const showTutor = document.getElementById('col_tutor').checked;
    const showCarta = document.getElementById('col_carta').checked;
    const campoOrden = document.getElementById('selOrdenInscritos').value;
    const showSaldo = document.getElementById('col_saldo').checked || campoOrden === 'saldo';
    const showEquipo = document.getElementById('col_equipo').checked;
    const busqueda = (document.getElementById('txtBuscarInscrito')?.value || '').toLowerCase().trim();

    const abonadoPorInscrito = new Map();
    listaPagosGlobal.forEach(p => {
        abonadoPorInscrito.set(
            p.inscrito_id,
            (abonadoPorInscrito.get(p.inscrito_id) || 0) + Number(p.monto || 0)
        );
    });
    const obtenerSaldo = inscrito => {
        const costo = inscrito.tipos_inscripcion?.es_manual
            ? Number(inscrito.precio_personalizado || 0)
            : Number(inscrito.tipos_inscripcion?.precio || 140);
        return Math.round((costo - (abonadoPorInscrito.get(inscrito.id) || 0)) * 100) / 100;
    };

    let listaFiltrada = listaInscritosGlobal.filter(i => {
        if (!busqueda) return true;
        return (i.nombre_completo || '').toLowerCase().includes(busqueda) ||
            (i.ci || '').toLowerCase().includes(busqueda) ||
            (i.celula || '').toLowerCase().includes(busqueda) ||
            (i.equipo || '').toLowerCase().includes(busqueda);
    });

    let listaOrdenada = [...listaFiltrada].sort((a, b) => {
        if (campoOrden === 'saldo') return obtenerSaldo(a) - obtenerSaldo(b);

        let valA = a[campoOrden] || '';
        let valB = b[campoOrden] || '';
        if (campoOrden === 'tipo_inscripcion') {
            valA = a.tipos_inscripcion?.nombre || '';
            valB = b.tipos_inscripcion?.nombre || '';
        }
        return valA.toString().localeCompare(valB.toString());
    });

    const thead = document.getElementById('theadInscritos');
    thead.innerHTML = `
    <tr>
        ${showCi ? '<th class="p-2">C.I.</th>' : ''}
        ${showNombre ? '<th class="p-2">Nombre Completo</th>' : ''}
        ${showFecha ? '<th class="p-2">Fecha Nac. (dd/mm/yyyy) / Edad</th>' : ''}
        ${showRol ? '<th class="p-2">Tipo / Rol</th>' : ''}
        ${showInscripcion ? '<th class="p-2">Inscripción</th>' : ''}
        ${showSaldo ? '<th class="p-2">Saldo</th>' : ''}
        ${showEquipo ? '<th class="p-2">Equipo</th>' : ''}
        ${showTel ? '<th class="p-2">Teléfono</th>' : ''}
        ${showCelula ? '<th class="p-2">Célula</th>' : ''}
        ${showTalla ? '<th class="p-2">Talla</th>' : ''}
        ${showActividad ? '<th class="p-2">Actividad</th>' : ''}
        ${showHabilidad ? '<th class="p-2">Habilidad / talento</th>' : ''}
        ${showSabeNadar ? '<th class="p-2">Sabe nadar</th>' : ''}
        ${showMenor ? '<th class="p-2">Edad</th>' : ''}
        ${showEmergencia ? '<th class="p-2">Contacto de emergencia</th>' : ''}
        ${showAlergias ? '<th class="p-2">Alergias</th>' : ''}
        ${showTutor ? '<th class="p-2">Tutor</th>' : ''}
        ${showCarta ? '<th class="p-2">Carta</th>' : ''}
        <th class="p-2 text-center">Acciones</th>
    </tr>`;

    const tbodyIns = document.getElementById('tblTodosInscritos');
    tbodyIns.innerHTML = '';

    listaOrdenada.forEach(i => {
        let estadoCarta = i.estado_carta || (i.carta_compromiso_url ? 'En Revisión' : 'Pendiente');
        let colorBadge = estadoCarta === 'Aprobada' ? 'bg-green-100 text-green-700' : (estadoCarta === 'En Revisión' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700');

        let badgeRol = i.es_staff
            ? `<span class="bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-full border border-purple-300">⭐ STAFF</span>`
            : `<span class="bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded-full">Campamentista</span>`;

        let edadTxt = '-';
        if (i.fecha_nacimiento) {
            const hoy = new Date();
            const nac = new Date(i.fecha_nacimiento);
            let ed = hoy.getFullYear() - nac.getFullYear();
            const m = hoy.getMonth() - nac.getMonth();
            if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) ed--;
            edadTxt = `${ed} años`;
        }

        const saldo = obtenerSaldo(i);
        const saldoColor = saldo > 0 ? 'text-red-700' : saldo === 0 ? 'text-green-700' : 'text-amber-700';
        const saldoFormateado = saldo.toLocaleString('es-BO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

        tbodyIns.innerHTML += `
  <tr>
    ${showCi ? `<td class="p-2 font-bold">${escaparHtml(i.ci)}</td>` : ''}
    ${showNombre ? `<td class="p-2 font-semibold text-gray-800">${escaparHtml(i.nombre_completo)}</td>` : ''}
    ${showFecha ? `<td class="p-2 font-mono text-[11px]">${escaparHtml(i.fecha_nacimiento ? `${formatearFechaLatina(i.fecha_nacimiento)} (${edadTxt})` : '-')}</td>` : ''}
    ${showRol ? `<td class="p-2">${badgeRol}</td>` : ''}
    ${showInscripcion ? `<td class="p-2 font-bold text-indigo-900">${escaparHtml(i.tipos_inscripcion?.nombre || 'Estándar')}</td>` : ''}
    ${showSaldo ? `<td class="p-2 font-bold ${saldoColor}">Bs ${saldoFormateado}</td>` : ''}
    ${showEquipo ? `<td class="p-2 font-bold text-indigo-700">${escaparHtml(i.equipo || 'Sin Asignar')}</td>` : ''}
    ${showTel ? `<td class="p-2">${escaparHtml(i.telefono || '-')}</td>` : ''}
    ${showCelula ? `<td class="p-2">${escaparHtml(i.celula || '-')}</td>` : ''}
    ${showTalla ? `<td class="p-2 font-bold">${escaparHtml(i.talla_polera || '-')}</td>` : ''}
    ${showActividad ? `<td class="p-2">${escaparHtml(i.actividad_favorita || '-')}</td>` : ''}
    ${showHabilidad ? `<td class="p-2">${escaparHtml(i.habilidad_especial || '-')}</td>` : ''}
    ${showSabeNadar ? `<td class="p-2">${i.sabe_nadar === true ? 'Sí' : i.sabe_nadar === false ? 'No' : '-'}</td>` : ''}
    ${showMenor ? `<td class="p-2">${i.es_menor ? 'Menor' : 'Mayor'}</td>` : ''}
    ${showEmergencia ? `<td class="p-2">${escaparHtml(i.contacto_emergencia || '-')}</td>` : ''}
    ${showAlergias ? `<td class="p-2 text-red-600 font-semibold">${escaparHtml(i.alergias_medicina || '-')}</td>` : ''}
    ${showTutor ? `<td class="p-2">${i.tutor_nombre ? `${escaparHtml(i.tutor_nombre)} (${escaparHtml(i.tutor_telefono || '')})` : '-'}</td>` : ''}
    ${showCarta ? `<td class="p-2"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${colorBadge}">${escaparHtml(estadoCarta)}</span></td>` : ''}
    <td class="p-2 text-center">
      <button onclick="abrirModalEditarCampamentista(decodeURIComponent('${argumentoSeguroJs(i.id)}'))" class="bg-amber-100 hover:bg-amber-200 text-amber-900 p-1.5 rounded-lg border border-amber-300 transition" title="Editar">
        <i class="fa-solid fa-pencil text-xs"></i>
      </button>
    </td>
  </tr>`;
    });
}

function guardarPlantillaReporte() {
    const nombre = document.getElementById('txtNombrePlantilla').value.trim();
    if (!nombre) return alert('Ingresa un nombre para identificar la plantilla.');

    const config = {
        fila: document.getElementById('repFilaSelect').value,
        subfila: document.getElementById('repSubfilaSelect').value,
        columna: document.getElementById('repColumnaSelect').value,
        valor: document.getElementById('repValorSelect').value,
        grafico: document.getElementById('repGraficoTipo').value,
        soloDeudores: document.getElementById('repSoloDeudores').checked
    };

    let plantillas = JSON.parse(localStorage.getItem('jc2027_plantillas_reportes') || '{}');
    plantillas[nombre] = config;
    localStorage.setItem('jc2027_plantillas_reportes', JSON.stringify(plantillas));

    alert(`Plantilla "${nombre}" guardada con éxito.`);
    document.getElementById('txtNombrePlantilla').value = '';
    cargarPlantillasSelect();
}

function cargarPlantillasSelect() {
    const select = document.getElementById('selReportePlantillas');
    if (!select) return;

    const plantillas = JSON.parse(localStorage.getItem('jc2027_plantillas_reportes') || '{}');
    select.innerHTML = '<option value="">-- Cargar Plantilla --</option>';

    Object.keys(plantillas).forEach(p => {
        select.innerHTML += `<option value="${escaparHtmlReporte(p)}">${escaparHtmlReporte(p)}</option>`;
    });
}

function cargarPlantillaReporte(nombre) {
    if (!nombre) return;
    const plantillas = JSON.parse(localStorage.getItem('jc2027_plantillas_reportes') || '{}');
    const c = plantillas[nombre];
    if (!c) return;

    document.getElementById('repFilaSelect').value = c.fila || c.variable || 'equipo';
    document.getElementById('repSubfilaSelect').value = c.subfila || '';
    document.getElementById('repColumnaSelect').value = c.columna || '';
    document.getElementById('repValorSelect').value = c.valor || 'personas';
    document.getElementById('repGraficoTipo').value = c.grafico || 'bar';
    document.getElementById('repSoloDeudores').checked = !!c.soloDeudores;
    normalizarDimensionesReporte('plantilla');

    generarReporteGrafico();
}

function escaparHtmlReporte(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

function inicializarCatalogoReportes() {
    const puedeVerFinanzas = !adminSesion?.rol_id || adminSesion.roles?.nombre === 'SuperAdmin' || permisosAdmin.verFinanzas;
    const campos = CAMPOS_REPORTE.map(campo =>
        `<option value="${campo.id}">${campo.label}</option>`
    ).join('');

    document.getElementById('repFilaSelect').innerHTML = campos;
    document.getElementById('repSubfilaSelect').innerHTML = `<option value="">Sin subfilas</option>${campos}`;
    document.getElementById('repColumnaSelect').innerHTML = `<option value="">Sin columnas</option>${campos}`;
    document.getElementById('repValorSelect').innerHTML = VALORES_REPORTE
        .filter(valor => puedeVerFinanzas || !valor.financiero)
        .map(valor => `<option value="${valor.id}">${valor.label}</option>`)
        .join('');

    document.getElementById('repFilaSelect').value = 'equipo';
    document.getElementById('repSubfilaSelect').value = '';
    document.getElementById('repFiltroDeudores').classList.toggle('hidden', !puedeVerFinanzas);
    document.getElementById('repValorSelect').value = 'personas';
}

function normalizarDimensionesReporte(origen) {
    const dimensiones = [
        ['fila', document.getElementById('repFilaSelect')],
        ['subfila', document.getElementById('repSubfilaSelect')],
        ['columna', document.getElementById('repColumnaSelect')]
    ];
    const elegidas = new Set();
    dimensiones.forEach(([id, select]) => {
        if (!select.value) return;
        if (elegidas.has(select.value)) {
            if (id === origen) select.value = '';
            else {
                const alternativa = [...select.options].find(option => option.value && !elegidas.has(option.value));
                select.value = alternativa?.value || '';
            }
        }
        if (select.value) elegidas.add(select.value);
    });
}

function obtenerCostoInscripcionReporte(inscrito) {
    return Number(inscrito.tipos_inscripcion?.es_manual
        ? inscrito.precio_personalizado || 0
        : inscrito.tipos_inscripcion?.precio || 140);
}

function obtenerValorCampoReporte(inscrito, campo, pagosPorInscrito) {
    const pagos = pagosPorInscrito.get(inscrito.id) || [];
    const pagado = pagos.reduce((total, pago) => total + (Number(pago.monto) || 0), 0);
    const costo = obtenerCostoInscripcionReporte(inscrito);

    switch (campo) {
        case 'tipo_inscripcion': return inscrito.tipos_inscripcion?.nombre || 'Estándar';
        case 'es_staff': return inscrito.es_staff ? 'Staff' : 'Campamentista';
        case 'es_menor': return inscrito.es_menor ? 'Menor de edad' : 'Mayor de edad';
        case 'rango_edad': {
            const edad = inscrito.fecha_nacimiento ? calcularEdad(inscrito.fecha_nacimiento) : null;
            if (edad === null || Number.isNaN(edad)) return 'Sin fecha registrada';
            if (edad <= 12) return '12 años o menos';
            if (edad <= 17) return '13 a 17 años';
            if (edad <= 25) return '18 a 25 años';
            return '26 años o más';
        }
        case 'estado_carta': return inscrito.estado_carta || (inscrito.carta_compromiso_url ? 'En Revisión' : 'Pendiente');
        case 'estado_financiero':
            if (pagado >= costo) return 'Totalmente pagado';
            if (pagado > 0) return 'Abono parcial';
            return 'Sin abonos (pendiente)';
        default: return inscrito[campo] || 'Sin especificar / vacío';
    }
}

function obtenerValorMetricaReporte(inscrito, metrica, pagosPorInscrito) {
    const pagado = (pagosPorInscrito.get(inscrito.id) || [])
        .reduce((total, pago) => total + (Number(pago.monto) || 0), 0);
    const costo = obtenerCostoInscripcionReporte(inscrito);

    switch (metrica) {
        case 'monto_pagado': return pagado;
        case 'promedio_pagado': return pagado;
        case 'precio_inscripcion': return costo;
        case 'promedio_inscripcion': return costo;
        case 'saldo_pendiente': return Math.max(0, costo - pagado);
        default: return 1;
    }
}

function resumirGrupoReporte(registros, metrica, pagosPorInscrito) {
    if (metrica === 'nombres_personas') {
        return registros.map(inscrito => inscrito.nombre_completo || 'Sin nombre registrado')
            .sort((a, b) => a.localeCompare(b, 'es'))
            .join(', ');
    }
    const total = registros.reduce((suma, inscrito) =>
        suma + obtenerValorMetricaReporte(inscrito, metrica, pagosPorInscrito), 0);
    return metrica === 'promedio_pagado' || metrica === 'promedio_inscripcion'
        ? (registros.length ? total / registros.length : 0)
        : total;
}

function formatearMetricaReporte(valor, metrica) {
    if (metrica === 'nombres_personas') return escaparHtmlReporte(valor || '—');
    const numero = Number(valor) || 0;
    return metrica === 'personas'
        ? numero.toLocaleString('es-BO')
        : `Bs ${numero.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function generarReporteGrafico() {
    const fila = document.getElementById('repFilaSelect').value;
    const subfila = document.getElementById('repSubfilaSelect').value;
    const columna = document.getElementById('repColumnaSelect').value;
    const metrica = document.getElementById('repValorSelect').value;
    const tipoGrafico = document.getElementById('repGraficoTipo').value;
    const soloDeudores = document.getElementById('repSoloDeudores').checked;
    const divResumen = document.getElementById('contenedorResumenVariables');
    const puedeVerFinanzas = !adminSesion?.rol_id || adminSesion.roles?.nombre === 'SuperAdmin' || permisosAdmin.verFinanzas;
    const valorConfigurado = VALORES_REPORTE.find(valor => valor.id === metrica);

    if (!valorConfigurado || (valorConfigurado.financiero && !puedeVerFinanzas) || (soloDeudores && !puedeVerFinanzas)) {
        alert('No tienes permiso para consultar métricas financieras.');
        return;
    }

    divResumen.innerHTML = '<p class="text-gray-500 italic">Procesando reporte…</p>';
    try {
        const { data: inscritos, error: errorInscritos } = await db.from('inscritos').select('*, tipos_inscripcion(*)');
        if (errorInscritos) throw errorInscritos;
        let pagos = [];
        if (valorConfigurado.financiero || fila === 'estado_financiero' || subfila === 'estado_financiero' ||
            columna === 'estado_financiero' || soloDeudores) {
            const resultadoPagos = await db.from('pagos').select('inscrito_id, monto').eq('estado', 'Aprobado');
            if (resultadoPagos.error) throw resultadoPagos.error;
            pagos = resultadoPagos.data || [];
        }

        const pagosPorInscrito = new Map();
        (pagos || []).forEach(pago => {
            if (!pagosPorInscrito.has(pago.inscrito_id)) pagosPorInscrito.set(pago.inscrito_id, []);
            pagosPorInscrito.get(pago.inscrito_id).push(pago);
        });

        const grupos = new Map();
        const columnas = new Set();
        const inscritosFiltrados = (inscritos || []).filter(inscrito => {
            if (!soloDeudores) return true;
            const abonado = (pagosPorInscrito.get(inscrito.id) || [])
                .reduce((total, pago) => total + (Number(pago.monto) || 0), 0);
            return obtenerCostoInscripcionReporte(inscrito) - abonado > 0;
        });
        inscritosFiltrados.forEach(inscrito => {
            const nombreFila = obtenerValorCampoReporte(inscrito, fila, pagosPorInscrito);
            const nombreSubfila = subfila
                ? obtenerValorCampoReporte(inscrito, subfila, pagosPorInscrito)
                : '';
            const nombreColumna = columna
                ? obtenerValorCampoReporte(inscrito, columna, pagosPorInscrito)
                : 'Total';
            const claveFila = JSON.stringify([nombreFila, nombreSubfila]);
            columnas.add(nombreColumna);
            if (!grupos.has(claveFila)) grupos.set(claveFila, {
                principal: nombreFila,
                secundaria: nombreSubfila,
                registros: [],
                columnas: new Map()
            });
            const gruposFila = grupos.get(claveFila);
            gruposFila.registros.push(inscrito);
            const celdasFila = gruposFila.columnas;
            if (!celdasFila.has(nombreColumna)) celdasFila.set(nombreColumna, []);
            celdasFila.get(nombreColumna).push(inscrito);
        });

        const filasOrdenadas = [...grupos.entries()].sort(([, a], [, b]) =>
            a.principal.localeCompare(b.principal, 'es') ||
            a.secundaria.localeCompare(b.secundaria, 'es')
        );
        const columnasOrdenadas = [...columnas].sort((a, b) => a.localeCompare(b, 'es'));
        const registrosPorColumna = new Map(columnasOrdenadas.map(nombre => [nombre, []]));
        const filasPorGrupoPrincipal = new Map();
        const resumenPorFila = new Map();
        const matriz = new Map();
        filasOrdenadas.forEach(([claveFila, grupo]) => {
            const valoresFila = new Map();
            columnasOrdenadas.forEach(nombreColumna => {
                const registros = grupo.columnas.get(nombreColumna) || [];
                const valor = resumirGrupoReporte(registros, metrica, pagosPorInscrito);
                valoresFila.set(nombreColumna, valor);
                registrosPorColumna.get(nombreColumna).push(...registros);
            });
            matriz.set(claveFila, valoresFila);
            resumenPorFila.set(claveFila, resumirGrupoReporte(grupo.registros, metrica, pagosPorInscrito));
            if (!filasPorGrupoPrincipal.has(grupo.principal)) filasPorGrupoPrincipal.set(grupo.principal, []);
            filasPorGrupoPrincipal.get(grupo.principal).push(grupo);
        });

        const totalPorColumna = new Map(columnasOrdenadas.map(nombre => [
            nombre,
            resumirGrupoReporte(registrosPorColumna.get(nombre), metrica, pagosPorInscrito)
        ]));
        const totalGeneral = resumirGrupoReporte(inscritosFiltrados, metrica, pagosPorInscrito);
        const nombreFila = CAMPOS_REPORTE.find(campo => campo.id === fila)?.label || 'Filas';
        const nombreSubfila = CAMPOS_REPORTE.find(campo => campo.id === subfila)?.label || 'Subfilas';
        const nombreColumna = CAMPOS_REPORTE.find(campo => campo.id === columna)?.label || 'Total';
        let html = `<table class="w-full text-left border-collapse my-2 min-w-max">
            <thead class="bg-gray-100 text-gray-700"><tr>
                <th class="p-2 border">${escaparHtmlReporte(nombreFila)}</th>
                ${subfila ? `<th class="p-2 border">${escaparHtmlReporte(nombreSubfila)}</th>` : ''}
                ${columnasOrdenadas.map(nombre => `<th class="p-2 border text-right">${escaparHtmlReporte(nombre)}</th>`).join('')}
                <th class="p-2 border text-right bg-indigo-50">Total</th>
            </tr></thead><tbody>`;

        const principalesVistos = new Set();
        filasOrdenadas.forEach(([claveFila, grupo]) => {
            const esNuevaPrincipal = !principalesVistos.has(grupo.principal);
            principalesVistos.add(grupo.principal);
            html += `<tr><th class="p-2 border text-left font-bold text-indigo-950">${esNuevaPrincipal ? escaparHtmlReporte(grupo.principal) : ''}</th>`;
            if (subfila) {
                html += `<td class="p-2 border ${grupo.secundaria ? 'pl-6 text-gray-700' : 'font-semibold'}">${escaparHtmlReporte(grupo.secundaria || 'Sin especificar / vacío')}</td>`;
            }
            columnasOrdenadas.forEach(columnaActual => {
                html += `<td class="p-2 border ${metrica === 'nombres_personas' ? 'text-left whitespace-normal min-w-[14rem]' : 'text-right'}">${formatearMetricaReporte(matriz.get(claveFila).get(columnaActual), metrica)}</td>`;
            });
            html += `<td class="p-2 border ${metrica === 'nombres_personas' ? 'text-left whitespace-normal min-w-[14rem]' : 'text-right'} font-bold bg-indigo-50">${formatearMetricaReporte(resumenPorFila.get(claveFila), metrica)}</td></tr>`;
            const gruposPrincipal = filasPorGrupoPrincipal.get(grupo.principal);
            const indiceGrupo = gruposPrincipal.indexOf(grupo);
            if (subfila && indiceGrupo === gruposPrincipal.length - 1) {
                html += `<tr class="bg-indigo-50/50 font-bold"><td class="p-2 border text-right" colspan="2">Total ${escaparHtmlReporte(grupo.principal)}</td>`;
                columnasOrdenadas.forEach(nombreColumnaActual => {
                    const registros = gruposPrincipal.flatMap(item => item.columnas.get(nombreColumnaActual) || []);
                    html += `<td class="p-2 border ${metrica === 'nombres_personas' ? 'text-left whitespace-normal min-w-[14rem]' : 'text-right'}">${formatearMetricaReporte(resumirGrupoReporte(registros, metrica, pagosPorInscrito), metrica)}</td>`;
                });
                const registrosPrincipal = gruposPrincipal.flatMap(item => item.registros);
                html += `<td class="p-2 border ${metrica === 'nombres_personas' ? 'text-left whitespace-normal min-w-[14rem]' : 'text-right'}">${formatearMetricaReporte(resumirGrupoReporte(registrosPrincipal, metrica, pagosPorInscrito), metrica)}</td></tr>`;
            }
        });

        html += `<tr class="bg-gray-100 font-extrabold"><th class="p-2 border text-left">Total general</th>`;
        if (subfila) html += '<th class="p-2 border"></th>';
        columnasOrdenadas.forEach(columnaActual => {
            html += `<td class="p-2 border ${metrica === 'nombres_personas' ? 'text-left whitespace-normal min-w-[14rem]' : 'text-right'}">${formatearMetricaReporte(totalPorColumna.get(columnaActual), metrica)}</td>`;
        });
        html += `<td class="p-2 border ${metrica === 'nombres_personas' ? 'text-left whitespace-normal min-w-[14rem]' : 'text-right'} text-indigo-800">${formatearMetricaReporte(totalGeneral, metrica)}</td></tr></tbody></table>`;
        html += `<p class="text-[11px] text-gray-500 mt-2">${inscritosFiltrados.length} personas${soloDeudores ? ' con saldo pendiente' : ''} · ${filasOrdenadas.length} grupos en filas${subfila ? ` · subfilas: ${escaparHtmlReporte(nombreSubfila)}` : ''}${columna ? ` · columnas: ${escaparHtmlReporte(nombreColumna)}` : ''} · ${escaparHtmlReporte(valorConfigurado.label)}</p>`;
        divResumen.innerHTML = html;

        if (instanciaGrafico) instanciaGrafico.destroy();
        const colores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#64748b'];
        const etiquetasGrafico = filasOrdenadas.map(([, grupo]) =>
            subfila ? `${grupo.principal} / ${grupo.secundaria || 'Sin especificar'}` : grupo.principal
        );
        const datasets = tipoGrafico === 'pie' || tipoGrafico === 'doughnut'
            ? [{
                label: valorConfigurado.label,
                data: filasOrdenadas.map(([clave]) => metrica === 'nombres_personas'
                    ? grupos.get(clave).registros.length
                    : resumenPorFila.get(clave)),
                backgroundColor: filasOrdenadas.map((_, indice) => colores[indice % colores.length])
            }]
            : columnasOrdenadas.map((nombre, indice) => ({
                label: nombre,
                data: filasOrdenadas.map(([clave]) => metrica === 'nombres_personas'
                    ? (grupos.get(clave).columnas.get(nombre) || []).length
                    : matriz.get(clave).get(nombre)),
                backgroundColor: colores[indice % colores.length],
                borderColor: colores[indice % colores.length],
                borderWidth: tipoGrafico === 'line' ? 2 : 0,
                fill: false
            }));

        instanciaGrafico = new Chart(document.getElementById('canvasGraficoReporte').getContext('2d'), {
            type: tipoGrafico,
            data: { labels: etiquetasGrafico, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: tipoGrafico === 'bar' || tipoGrafico === 'line'
                    ? { y: { beginAtZero: true } }
                    : {},
                plugins: { legend: { position: 'bottom' } }
            }
        });
    } catch (error) {
        console.error('Error generando reporte:', error);
        divResumen.innerHTML = '<p class="text-red-600 font-semibold">No se pudo generar el reporte. Revisa la conexión y vuelve a intentarlo.</p>';
        alert(`No se pudo generar el reporte: ${error.message || 'error de conexión o consulta'}`);
    }
}

async function abrirModalEditarCampamentista(id) {
    const { data: i } = await db.from('inscritos').select('*').eq('id', id).single();
    if (!i) return;

    document.getElementById('editInsId').value = i.id;
    document.getElementById('editInsCi').value = i.ci;
    document.getElementById('editInsNombre').value = i.nombre_completo;
    document.getElementById('editInsFechaNac').value = i.fecha_nacimiento ? formatearFechaLatina(i.fecha_nacimiento) : '';
    if (i.fecha_nacimiento) {
        calcularEdadDesdeFecha('editInsFechaNac', 'editInsEdadVal', 'editSecTutor');
    } else {
        document.getElementById('editInsEdadVal').value = '';
    }

    document.getElementById('editInsTel').value = i.telefono || '';
    asignarCelula('editInsCelula', 'editInsCelulaOtra', i.celula);
    document.getElementById('editInsEquipo').value = i.equipo || 'Sin Asignar';
    document.getElementById('editInsTalla').value = i.talla_polera || '';
    document.getElementById('editInsTipoInscripcion').value = i.tipo_inscripcion_id || '';
    document.getElementById('editInsPrecioManual').value = i.precio_personalizado || '';
    document.getElementById('editInsEsStaff').checked = !!i.es_staff;
    document.getElementById('editInsActividad').value = i.actividad_favorita || '';
    document.getElementById('editInsHabilidad').value = i.habilidad_especial || '';
    document.getElementById('editInsSabeNadar').value = typeof i.sabe_nadar === 'boolean'
        ? String(i.sabe_nadar)
        : '';
    document.getElementById('editInsEstadoCarta').value = i.estado_carta || 'Pendiente';
    document.getElementById('editInsEmergencia').value = i.contacto_emergencia || '';
    document.getElementById('editInsAlergias').value = i.alergias_medicina || '';
    document.getElementById('editInsTutorNom').value = i.tutor_nombre || '';
    document.getElementById('editInsTutorTel').value = i.tutor_telefono || '';

    evaluarPrecioManual(i.tipo_inscripcion_id, 'editDivPrecioManual');
    cambiarPestanaModal('gen');
    document.getElementById('modalEditCampamentista').classList.remove('hidden');
}

function cerrarModalCampamentista() {
    document.getElementById('modalEditCampamentista').classList.add('hidden');
}

function confirmarYGuardarInscrito(e) {
    e.preventDefault();
    const sabeNadarVal = document.getElementById('editInsSabeNadar').value;
    if (sabeNadarVal !== 'true' && sabeNadarVal !== 'false') {
        cambiarPestanaModal('salud');
        document.getElementById('editInsSabeNadar').focus();
        alert('Indica si sabe nadar.');
        return;
    }
    const fechaIngresada = document.getElementById('editInsFechaNac').value.trim();
    if (fechaIngresada && !convertirFechaNacimientoISO(fechaIngresada)) {
        alert('Ingresa una fecha válida con formato dd/mm/yyyy.');
        return;
    }
    solicitarSeguridad('guardarEdicionCompletaInscrito');
}

function solicitarSeguridad(tipoAccion, idParam = null) {
    accionPendienteProtegida = { tipo: tipoAccion, id: idParam };
    document.getElementById('inputPassConfirm').value = '';
    document.getElementById('modalConfirmPass').classList.remove('hidden');
}

function cancelarVerificacionSeguridad() {
    accionPendienteProtegida = null;
    document.getElementById('modalConfirmPass').classList.add('hidden');
}

async function ejecutarAcciónProtegida() {
    const passIngresada = document.getElementById('inputPassConfirm').value;
    const hashIngresado = await calcularSHA256(passIngresada);

    const { data: administradorConfirmado, error: errorConfirmacion } = await db
        .from('administradores')
        .select('id')
        .eq('id', adminSesion.id)
        .eq('password_hash', hashIngresado)
        .maybeSingle();
    if (errorConfirmacion) {
        console.error('Error confirmando la contraseña administrativa:', errorConfirmacion);
        return alert('No se pudo confirmar la contraseña. Inténtalo nuevamente.');
    }
    if (!administradorConfirmado) return alert('Contraseña incorrecta.');

    document.getElementById('modalConfirmPass').classList.add('hidden');

    if (accionPendienteProtegida.tipo === 'guardarEdicionCompletaInscrito') {
        const id = document.getElementById('editInsId').value;
        const nom = document.getElementById('editInsNombre').value;

        const fechaNacVal = convertirFechaNacimientoISO(document.getElementById('editInsFechaNac').value.trim());
        const esMenorVal = fechaNacVal ? calcularEdad(fechaNacVal) < 18 : false;

        await db.from('inscritos').update({
            ci: document.getElementById('editInsCi').value,
            nombre_completo: nom,
            fecha_nacimiento: fechaNacVal,
            es_menor: esMenorVal,
            telefono: document.getElementById('editInsTel').value,
            celula: obtenerCelula('editInsCelula', 'editInsCelulaOtra') || null,
            equipo: document.getElementById('editInsEquipo').value,
            talla_polera: document.getElementById('editInsTalla').value,
            tipo_inscripcion_id: document.getElementById('editInsTipoInscripcion').value,
            precio_personalizado: document.getElementById('editInsPrecioManual').value || null,
            es_staff: document.getElementById('editInsEsStaff').checked,
            actividad_favorita: document.getElementById('editInsActividad').value,
            habilidad_especial: document.getElementById('editInsHabilidad').value,
            sabe_nadar: document.getElementById('editInsSabeNadar').value === 'true',
            estado_carta: document.getElementById('editInsEstadoCarta').value,
            contacto_emergencia: document.getElementById('editInsEmergencia').value,
            alergias_medicina: document.getElementById('editInsAlergias').value,
            tutor_nombre: document.getElementById('editInsTutorNom').value,
            tutor_telefono: document.getElementById('editInsTutorTel').value
        }).eq('id', id);

        await registrarLogAuditoria('Edición Completa', 'Inscritos', `Actualizó datos personales de: ${nom}`);
        cerrarModalCampamentista();
        alert('Campamentista / Staff actualizado con éxito.');
    } else if (accionPendienteProtegida.tipo === 'borrarCampamentista') {
        await db.from('inscritos').delete().eq('id', accionPendienteProtegida.id);
        await registrarLogAuditoria('Eliminación', 'Inscritos', `Eliminó el registro ID: ${accionPendienteProtegida.id}`);
        cerrarModalCampamentista();
        alert('Registro eliminado.');
    } else if (accionPendienteProtegida.tipo === 'borrarIngreso') {
        await db.from('pagos').delete().eq('id', accionPendienteProtegida.id);
        await registrarLogAuditoria('Borrar Ingreso', 'Ingresos', `Eliminó pago ID: ${accionPendienteProtegida.id}`);
        alert('Ingreso eliminado.');
    } else if (accionPendienteProtegida.tipo === 'borrarEgreso') {
        await db.from('egresos').delete().eq('id', accionPendienteProtegida.id);
        await registrarLogAuditoria('Borrar Egreso', 'Egresos', `Eliminó egreso ID: ${accionPendienteProtegida.id}`);
        alert('Egreso eliminado.');
    } else if (accionPendienteProtegida.tipo === 'borrarAdmin') {
        await db.from('administradores').delete().eq('id', accionPendienteProtegida.id);
        await registrarLogAuditoria('Eliminar Admin', 'Administradores', `Eliminó admin ID: ${accionPendienteProtegida.id}`);
        alert('Administrador eliminado.');
    } else if (accionPendienteProtegida.tipo === 'borrarRol') {
        await db.from('roles').delete().eq('id', accionPendienteProtegida.id);
        await registrarLogAuditoria('Eliminar Rol', 'Roles', `Eliminó rol ID: ${accionPendienteProtegida.id}`);
        alert('Rol eliminado.');
    } else if (accionPendienteProtegida.tipo === 'borrarCategoria') {
        await db.from('tipos_inscripcion').delete().eq('id', accionPendienteProtegida.id);
        await registrarLogAuditoria('Eliminar Tipo Inscripción', 'Categorías', `Eliminó tipo ID: ${accionPendienteProtegida.id}`);
        alert('Categoría eliminada.');
        cargarTiposInscripcion();
    }

    accionPendienteProtegida = null;
    cargarTodoElDashboard();
}

async function crearNuevoCampamentista(e) {
    e.preventDefault();
    const nom = document.getElementById('newNombre').value.trim();
    const celula = obtenerCelula('newCelula', 'newCelulaOtra');
    const fechaNacimientoEntrada = document.getElementById('newFechaNac').value.trim();
    const fechaNacVal = convertirFechaNacimientoISO(fechaNacimientoEntrada);
    if (fechaNacimientoEntrada && !fechaNacVal) {
        alert('Ingresa una fecha válida con formato dd/mm/yyyy.');
        return;
    }
    const esMenorVal = fechaNacVal
        ? calcularEdad(fechaNacVal) < 18
        : document.getElementById('newEsMenor').checked;

    await db.from('inscritos').insert([{
        ci: document.getElementById('newCi').value.trim(),
        nombre_completo: nom,
        fecha_nacimiento: fechaNacVal,
        es_menor: esMenorVal,
        telefono: document.getElementById('newTel').value.trim(),
        celula: celula || null,
        equipo: document.getElementById('newEquipo').value,
        talla_polera: document.getElementById('newTalla').value,
        tipo_inscripcion_id: document.getElementById('newTipoInscripcion').value || null,
        precio_personalizado: document.getElementById('newPrecioManual').value || null,
        es_staff: document.getElementById('newEsStaff').checked,
        actividad_favorita: document.getElementById('newActividad').value,
        habilidad_especial: document.getElementById('newHabilidad').value.trim(),
        sabe_nadar: document.getElementById('newSabeNadar').value === 'true',
        tutor_nombre: document.getElementById('newTutorNombre').value.trim(),
        tutor_telefono: document.getElementById('newTutorTel').value.trim(),
        contacto_emergencia: document.getElementById('newEmergencia').value.trim(),
        alergias_medicina: document.getElementById('newAlergias').value.trim(),
        estado_carta: 'Pendiente'
    }]);

    await registrarLogAuditoria('Nuevo Registro', 'Inscritos', `Inscribió a: ${nom}`);
    alert('Registro guardado exitosamente.');
    e.target.reset();
    actualizarCampoOtraCelula(document.getElementById('newCelula'), 'newCelulaOtra');
    toggleFormulario('formContenedorCampamentista');
    cargarTodoElDashboard();
}

async function cargarRolesYAdmins(tab = 'usuarios') {
    const { data: roles, error: rolesError } = await db.from('roles')
        .select(tab === 'roles' ? 'id,nombre,permisos' : 'id,nombre');
    if (rolesError) throw rolesError;
    listaRolesGlobal = roles || [];

    const selectRol = document.getElementById('adminRolSelect');
    if (selectRol) {
        selectRol.innerHTML = '';
        listaRolesGlobal.forEach(r => selectRol.innerHTML += `<option value="${escaparHtml(r.id)}">${escaparHtml(r.nombre)}</option>`);
    }

    if (tab === 'usuarios') {
    const { data: admins, error: adminsError } = await db.from('administradores')
        .select('id,nombre,usuario,telefono,rol_id,roles(nombre)');
    if (adminsError) throw adminsError;
    listaAdminsGlobal = admins || [];

    const tbodyA = document.getElementById('tblListaAdmins');
    if (tbodyA) {
        tbodyA.innerHTML = '';
        listaAdminsGlobal.forEach(a => {
            tbodyA.innerHTML += `
      <tr>
        <td class="p-2 font-semibold">${escaparHtml(a.nombre)}</td>
        <td class="p-2 font-mono text-gray-500">${escaparHtml(a.usuario)}</td>
        <td class="p-2 font-bold text-emerald-700">${escaparHtml(a.telefono || '-')}</td>
        <td class="p-2 font-bold text-indigo-700">${escaparHtml(a.roles?.nombre || 'SuperAdmin')}</td>
        <td class="p-2 text-center flex justify-center gap-1">
          <button onclick="abrirModalEditarAdmin(decodeURIComponent('${argumentoSeguroJs(a.id)}'))" class="bg-amber-100 hover:bg-amber-200 text-amber-900 p-1.5 rounded-lg border border-amber-300" title="Editar Admin / Contraseña">
            <i class="fa-solid fa-pencil text-xs"></i>
          </button>
          <button onclick="solicitarSeguridad('borrarAdmin', decodeURIComponent('${argumentoSeguroJs(a.id)}'))" class="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg border border-red-200" title="Eliminar">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </td>
      </tr>`;
        });
    }
        return;
    }

    const tbodyR = document.getElementById('tblListaRolesExistentes');
    if (tbodyR) {
        tbodyR.innerHTML = '';
        (roles || []).forEach(r => {
            let permisosTxt = Object.keys(r.permisos || {}).filter(k => r.permisos[k]).join(', ');
            const permisosEncoded = encodeURIComponent(JSON.stringify(r.permisos || {}));

            tbodyR.innerHTML += `
      <tr>
        <td class="p-2 font-bold text-indigo-900">${escaparHtml(r.nombre)}</td>
        <td class="p-2 text-[10px] text-gray-500">${escaparHtml(permisosTxt || 'Sin permisos')}</td>
        <td class="p-2 text-center flex justify-center gap-1">
          <button onclick="cargarRolParaEditar(decodeURIComponent('${argumentoSeguroJs(r.id)}'), decodeURIComponent('${argumentoSeguroJs(r.nombre)}'), '${permisosEncoded}')" class="bg-amber-100 hover:bg-amber-200 text-amber-900 p-1.5 rounded-lg border border-amber-300">
            <i class="fa-solid fa-pencil text-xs"></i>
          </button>
          <button onclick="solicitarSeguridad('borrarRol', decodeURIComponent('${argumentoSeguroJs(r.id)}'))" class="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg border border-red-200">
            <i class="fa-solid fa-trash text-xs"></i>
          </button>
        </td>
      </tr>`;
        });
    }
}

function cargarRolParaEditar(id, nombre, permisosEncoded) {
    document.getElementById('rolIdEdit').value = id;
    document.getElementById('rolNombre').value = nombre;

    let permisos = {};
    try { permisos = JSON.parse(decodeURIComponent(permisosEncoded)); } catch (e) { }

    document.getElementById('permVerFinanzas').checked = !!permisos.verFinanzas;
    document.getElementById('permSolicitudes').checked = !!permisos.solicitudes;
    document.getElementById('permCartas').checked = !!permisos.cartas;
    document.getElementById('permInscritosVer').checked = !!permisos.inscritosVer;
    document.getElementById('permInscritosCrear').checked = !!permisos.inscritosCrear;
    document.getElementById('permInscritosEditar').checked = !!permisos.inscritosEditar;
    document.getElementById('permInscritosEliminar').checked = !!permisos.inscritosEliminar;
    document.getElementById('permCategorias').checked = !!permisos.categorias;
    document.getElementById('permIngresosVer').checked = !!permisos.ingresosVer;
    document.getElementById('permIngresosEliminar').checked = !!permisos.ingresosEliminar;
    document.getElementById('permEgresosVer').checked = !!permisos.egresosVer;
    document.getElementById('permEgresosCrear').checked = !!permisos.egresosCrear;
    document.getElementById('permEgresosEditar').checked = !!permisos.egresosEditar;
    document.getElementById('permEgresosEliminar').checked = !!permisos.egresosEliminar;
    document.getElementById('permReportesVer').checked = !!permisos.reportesVer;
    document.getElementById('permReportesCrear').checked = !!permisos.reportesCrear;
    document.getElementById('permUsuarios').checked = !!permisos.usuarios;
    document.getElementById('permRoles').checked = !!permisos.roles;

    document.getElementById('formContenedorRol').classList.remove('hidden');
}

async function procesarCarta(id, nuevoEstado, nombre) {
    const { error } = await db.from('inscritos').update({ estado_carta: nuevoEstado }).eq('id', id);
    if (error) {
        console.error('Error actualizando el estado de la carta:', error);
        return alert('No se pudo actualizar el estado de la carta: ' + error.message);
    }
    await registrarLogAuditoria('Revisión Carta', 'Cartas', `Marcó la carta de ${nombre} como: ${nuevoEstado}`);
    alert(`Carta marcada como: ${nuevoEstado}`);
    await cargarModuloCartas();
}

async function procesarPago(id, estado, nombre, monto) {
    await db.from('pagos').update({ estado: estado }).eq('id', id);
    await registrarLogAuditoria('Revisión Pago', 'Pendientes', `Marcó abono de Bs ${monto} de ${nombre} como: ${estado}`);
    cargarTodoElDashboard();
}

function cerrarSesion() { location.reload(); }
