// ════════════════════════════════════════
//  CONFIGURACIÓN
// ════════════════════════════════════════
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx4HxTPJH5D6RDvZklYuCWXN6XFrJzj40KPc8HLZvVVjgUhWTSC31ATlpQuyJY4gzPz/exec";

// ════════════════════════════════════════
//  CACHÉ LOCAL — todos los estudiantes
// ════════════════════════════════════════
let CACHE = {};          // { "123456": { nombre, dni, ciclo, numCana, tipoCana, bailarina } }
let cacheReady = false;

// ════════════════════════════════════════
//  ESTADO SESIÓN
// ════════════════════════════════════════
let musicoActual = null;
let chicaActual  = null;

// ════════════════════════════════════════
//  HELPERS UI
// ════════════════════════════════════════
const $ = id => document.getElementById(id);
const mostrar  = id => $(id).classList.remove("hidden");
const ocultar  = id => $(id).classList.add("hidden");
const setError = (id, msg) => $(id).textContent = msg;
const clearErr = id  => $(id).textContent = "";

function mostrarLoading(txt = "Cargando...") { mostrar("loadingOverlay"); $("loadingText").textContent = txt; }
function ocultarLoading() { ocultar("loadingOverlay"); }

// ════════════════════════════════════════
//  CARGA INICIAL — todos los datos
// ════════════════════════════════════════
async function cargarTodos() {
  const el = $("cargaEstado");
  const tx = $("cargaTexto");

  try {
    const url  = `${SCRIPT_URL}?action=todos`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Error de red");

    const data = await resp.json();
    if (data.error) throw new Error(data.error);

    // Indexar por código para búsqueda O(1)
    CACHE = {};
    data.estudiantes.forEach(e => {
      CACHE[String(e.codigo).trim()] = e;
    });

    cacheReady = true;

    // Actualizar estado de carga
    el.classList.add("listo");
    tx.textContent = `✓ ${data.estudiantes.length} registros cargados`;

    // Renderizar resúmenes
    renderResumenes();

  } catch (err) {
    console.error(err);
    el.classList.add("error-carga");
    tx.textContent = "⚠ No se pudo cargar. Recarga la página.";
  }
}

// ════════════════════════════════════════
//  RENDER RESÚMENES EN HOME
// ════════════════════════════════════════
function renderResumenes() {
  const todos = Object.values(CACHE);

  // ── MÚSICOS ──
  const musicos = todos.filter(e =>
    e.numCana && String(e.numCana).trim() !== "" &&
    String(e.numCana).trim() !== "0"
  );

  const totalMusicos = musicos.length;
  $("conteoMusicos").textContent = `${totalMusicos} registrado${totalMusicos !== 1 ? "s" : ""}`;

  // Stats por caña y tipo
  const porCana  = { seis: 0, siete: 0 };
  const porTipo  = { Sanja: 0, Malta: 0, Contra: 0 };
  musicos.forEach(m => {
    if (String(m.numCana) === "1") porCana.seis++;
    if (String(m.numCana) === "2") porCana.siete++;
    if (m.tipoCana) porTipo[m.tipoCana] = (porTipo[m.tipoCana] || 0) + 1;
  });

  const statsEl = $("statsMusicos");
  statsEl.innerHTML = "";
  if (totalMusicos > 0) {
    [
      { label: "Seis",   val: porCana.seis  },
      { label: "Siete",  val: porCana.siete },
      { label: "Sanja",  val: porTipo.Sanja  || 0 },
      { label: "Malta",  val: porTipo.Malta  || 0 },
      { label: "Contra", val: porTipo.Contra || 0 },
    ].forEach(({ label, val }) => {
      if (val > 0) {
        const chip = document.createElement("span");
        chip.className = "stat-chip";
        chip.innerHTML = `<span>${val}</span>${label}`;
        statsEl.appendChild(chip);
      }
    });
  }

  // Tabla de músicos
  const tbody = $("tbodyMusicos");
  tbody.innerHTML = "";
  if (totalMusicos === 0) {
    mostrar("vacioMusicos");
  } else {
    ocultar("vacioMusicos");
    musicos
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .forEach(m => {
        const canaLabel = String(m.numCana) === "1" ? "Seis" : "Siete";
        const canaClass = String(m.numCana) === "1" ? "tb-seis" : "tb-siete";
        const tipoClass = m.tipoCana ? `tb-${m.tipoCana.toLowerCase()}` : "";
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${m.nombre}</td>
          <td><span class="tb-badge ${canaClass}">${canaLabel}</span></td>
          <td><span class="tb-badge ${tipoClass}">${m.tipoCana || "—"}</span></td>
        `;
        tbody.appendChild(tr);
      });
  }

  mostrar("resumenMusicos");

  // ── CHICAS ──
  const chicas = todos.filter(e => String(e.bailarina).trim() === "1");
  const totalChicas = chicas.length;
  $("conteoChicas").textContent = `${totalChicas} seleccionada${totalChicas !== 1 ? "s" : ""}`;

  const tbodyC = $("tbodyChicas");
  tbodyC.innerHTML = "";
  if (totalChicas === 0) {
    mostrar("vacioChicas");
  } else {
    ocultar("vacioChicas");
    chicas
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${c.nombre}</td>
          <td>${c.ciclo || "—"}</td>
          <td style="font-family:'DM Mono',monospace;font-size:.75rem">${c.dni || "—"}</td>
        `;
        tbodyC.appendChild(tr);
      });
  }

  mostrar("resumenChicas");
}

// ════════════════════════════════════════
//  BÚSQUEDA LOCAL (instantánea)
// ════════════════════════════════════════
function buscarEnCache(codigo) {
  return CACHE[codigo] || null;
}

// ════════════════════════════════════════
//  NAVEGACIÓN
// ════════════════════════════════════════
function irA(seccion) {
  ocultar("pantallaInicio");
  ocultar("pantallaChicas");
  ocultar("pantallaChicos");
  if (seccion === "chicas") mostrar("pantallaChicas");
  if (seccion === "chicos") mostrar("pantallaChicos");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function volverInicio() {
  resetChicas();
  resetChicos();
  ocultar("pantallaChicas");
  ocultar("pantallaChicos");
  mostrar("pantallaInicio");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ════════════════════════════════════════
//  ██████  CHICAS
// ════════════════════════════════════════
function buscarChica() {
  clearErr("errorChica");

  const codigo = $("inputCodigoChica").value.trim();
  if (!/^\d{6}$/.test(codigo)) {
    setError("errorChica", "⚠ El código debe tener exactamente 6 dígitos.");
    return;
  }

  // Búsqueda instantánea desde caché
  const data = buscarEnCache(codigo);
  if (!data) {
    setError("errorChica", "⚠ Código no encontrado: " + codigo);
    ocultar("chicaSinSeleccion");
    ocultar("chicaSeleccionada");
    return;
  }

  chicaActual = { codigo, ...data };

  ocultar("chicaSinSeleccion");
  ocultar("chicaSeleccionada");

  if (String(data.bailarina).trim() === "1") {
    $("chicaGreenNombre").textContent = data.nombre || "—";
    $("chicaGreenDNI").textContent    = data.dni    || "—";
    $("chicaGreenCiclo").textContent  = data.ciclo  || "—";
    mostrar("chicaSeleccionada");
  } else {
    $("chicaCyanNombre").textContent = data.nombre || "—";
    $("chicaCyanDNI").textContent    = data.dni    || "—";
    $("chicaCyanCiclo").textContent  = data.ciclo  || "—";
    clearErr("errorSeleccion");
    mostrar("chicaSinSeleccion");
  }

  setTimeout(() => {
    const id = String(data.bailarina) === "1" ? "chicaSeleccionada" : "chicaSinSeleccion";
    $(id).scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
}

async function seleccionarChica() {
  clearErr("errorSeleccion");
  if (!chicaActual) return;

  mostrarLoading("Guardando selección...");

  try {
    const params = new URLSearchParams({ action: "seleccionarBailarina", codigo: chicaActual.codigo });
    const resp   = await fetch(`${SCRIPT_URL}?${params}`, { redirect: "follow" });
    const data   = await resp.json();

    if (data.error) { setError("errorSeleccion", "⚠ " + data.error); return; }

    // Actualizar caché local
    CACHE[chicaActual.codigo].bailarina = "1";

    $("chicaGreenNombre").textContent = chicaActual.nombre || "—";
    $("chicaGreenDNI").textContent    = chicaActual.dni    || "—";
    $("chicaGreenCiclo").textContent  = chicaActual.ciclo  || "—";
    ocultar("chicaSinSeleccion");
    mostrar("chicaSeleccionada");
    $("chicaSeleccionada").scrollIntoView({ behavior: "smooth", block: "start" });

    // Refrescar resumen del home en segundo plano
    renderResumenes();

  } catch (err) {
    console.error(err);
    setError("errorSeleccion", "⚠ Error al guardar. Intenta nuevamente.");
  } finally {
    ocultarLoading();
  }
}

function resetChicas() {
  chicaActual = null;
  $("inputCodigoChica").value = "";
  clearErr("errorChica");
  clearErr("errorSeleccion");
  ocultar("chicaSinSeleccion");
  ocultar("chicaSeleccionada");
}

// ════════════════════════════════════════
//  ██████  CHICOS
// ════════════════════════════════════════
function buscarMusico() {
  clearErr("errorBusqueda");

  const codigo = $("inputCodigo").value.trim();
  if (!/^\d{6}$/.test(codigo)) {
    setError("errorBusqueda", "⚠ El código debe tener exactamente 6 dígitos.");
    return;
  }

  // Búsqueda instantánea desde caché
  const data = buscarEnCache(codigo);
  if (!data) {
    setError("errorBusqueda", "⚠ Código no encontrado: " + codigo);
    ocultar("seccionSinRegistro");
    ocultar("seccionRegistrado");
    return;
  }

  musicoActual = { codigo, ...data };

  ocultar("seccionSinRegistro");
  ocultar("seccionRegistrado");

  const tieneAsignacion = data.numCana && String(data.numCana).trim() !== "" && String(data.numCana).trim() !== "0";

  if (tieneAsignacion) {
    $("greenNombre").textContent = data.nombre || "—";
    $("greenDNI").textContent    = data.dni    || "—";
    $("greenCiclo").textContent  = data.ciclo  || "—";
    $("greenCana").textContent   = String(data.numCana) === "1" ? "Seis" : "Siete";
    $("greenTipo").textContent   = data.tipoCana || "—";
    mostrar("seccionRegistrado");
  } else {
    $("cyanNombre").textContent = data.nombre || "—";
    $("cyanDNI").textContent    = data.dni    || "—";
    $("cyanCiclo").textContent  = data.ciclo  || "—";
    document.querySelectorAll('input[name="cana"]').forEach(r => r.checked = false);
    document.querySelectorAll('input[name="tipoCana"]').forEach(r => r.checked = false);
    ocultar("btnGuardar");
    clearErr("errorGuardar");
    mostrar("seccionSinRegistro");
  }

  setTimeout(() => {
    const id = tieneAsignacion ? "seccionRegistrado" : "seccionSinRegistro";
    $(id).scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
}

function actualizarSeleccion() {
  const cana     = document.querySelector('input[name="cana"]:checked');
  const tipoCana = document.querySelector('input[name="tipoCana"]:checked');
  cana && tipoCana ? mostrar("btnGuardar") : ocultar("btnGuardar");
}

async function guardarDatos() {
  clearErr("errorGuardar");

  const canaInput    = document.querySelector('input[name="cana"]:checked');
  const tipoCanaInput = document.querySelector('input[name="tipoCana"]:checked');
  if (!canaInput || !tipoCanaInput || !musicoActual) {
    setError("errorGuardar", "⚠ Selecciona caña y tipo de caña.");
    return;
  }

  mostrarLoading("Guardando registro...");

  try {
    const params = new URLSearchParams({
      action:   "guardar",
      codigo:   musicoActual.codigo,
      numCana:  canaInput.value,
      tipoCana: tipoCanaInput.value
    });
    const resp = await fetch(`${SCRIPT_URL}?${params}`, { redirect: "follow" });
    const data = await resp.json();

    if (data.error) { setError("errorGuardar", "⚠ " + data.error); return; }

    // Actualizar caché local
    CACHE[musicoActual.codigo].numCana  = canaInput.value;
    CACHE[musicoActual.codigo].tipoCana = tipoCanaInput.value;

    $("greenNombre").textContent = musicoActual.nombre || "—";
    $("greenDNI").textContent    = musicoActual.dni    || "—";
    $("greenCiclo").textContent  = musicoActual.ciclo  || "—";
    $("greenCana").textContent   = canaInput.value === "1" ? "Seis" : "Siete";
    $("greenTipo").textContent   = tipoCanaInput.value;

    ocultar("seccionSinRegistro");
    mostrar("seccionRegistrado");
    $("seccionRegistrado").scrollIntoView({ behavior: "smooth", block: "start" });

    // Refrescar resumen del home en segundo plano
    renderResumenes();

  } catch (err) {
    console.error(err);
    setError("errorGuardar", "⚠ Error al guardar. Intenta nuevamente.");
  } finally {
    ocultarLoading();
  }
}

function resetChicos() {
  musicoActual = null;
  $("inputCodigo").value = "";
  clearErr("errorBusqueda");
  clearErr("errorGuardar");
  ocultar("seccionSinRegistro");
  ocultar("seccionRegistrado");
}

// ════════════════════════════════════════
//  EVENTOS DE TECLADO
// ════════════════════════════════════════
$("inputCodigoChica").addEventListener("keydown", e => { if (e.key === "Enter") buscarChica(); });
$("inputCodigoChica").addEventListener("input", function () { this.value = this.value.replace(/\D/g, "").slice(0, 6); });
// Búsqueda al completar 6 dígitos (chicas)
$("inputCodigoChica").addEventListener("input", function () {
  if (this.value.length === 6) buscarChica();
});

$("inputCodigo").addEventListener("keydown", e => { if (e.key === "Enter") buscarMusico(); });
$("inputCodigo").addEventListener("input", function () { this.value = this.value.replace(/\D/g, "").slice(0, 6); });
// Búsqueda al completar 6 dígitos (chicos)
$("inputCodigo").addEventListener("input", function () {
  if (this.value.length === 6) buscarMusico();
});

// ════════════════════════════════════════
//  INICIO — cargar datos al abrir la app
// ════════════════════════════════════════
cargarTodos();