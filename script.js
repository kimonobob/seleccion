// ════════════════════════════════════════
//  CONFIGURACIÓN
// ════════════════════════════════════════
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyZTtvn6U41oGOE00A0WFskmtinDAlMPrwAP3uaScfxvFtaueNGnFQUT4x1Ohd9K_po/exec";

// ════════════════════════════════════════
//  CACHÉ LOCAL
// ════════════════════════════════════════
let CACHE  = {};   // { "123456": { nombre, dni, ciclo, numCana, tipoCana, bailarina } }
let PUESTOS_CHICAS = {};  // { 1: "123456", 5: "654321", ... }  puesto → codigo

// ════════════════════════════════════════
//  ESTADO MODAL
// ════════════════════════════════════════
let modalPuestoActual = null;   // número de puesto abierto en el modal

// ════════════════════════════════════════
//  HELPERS UI
// ════════════════════════════════════════
const $ = id => document.getElementById(id);
const mostrar  = id => $(id).classList.remove("hidden");
const ocultar  = id => $(id).classList.add("hidden");
const setError = (id, msg) => $(id).textContent = msg;
const clearErr = id => $(id).textContent = "";

// ════════════════════════════════════════
//  CARGA INICIAL PARALELA
//  Estudiantes + Puestos al mismo tiempo
// ════════════════════════════════════════
async function cargarTodos() {
  const estadoEl = $("cargaEstado");
  const textoEl  = $("cargaTexto");

  try {
    // Lanzar ambas peticiones en paralelo
    const [respEstudiantes, respPuestos] = await Promise.all([
      fetch(`${SCRIPT_URL}?action=todos`),
      fetch(`${SCRIPT_URL}?action=getPuestosChicas`)
    ]);

    const dataEst    = await respEstudiantes.json();
    const dataPuestos = await respPuestos.json();

    if (dataEst.error)    throw new Error(dataEst.error);
    if (dataPuestos.error) throw new Error(dataPuestos.error);

    // Indexar estudiantes por código
    CACHE = {};
    dataEst.estudiantes.forEach(e => {
      CACHE[String(e.codigo).trim()] = e;
    });

    // Indexar puestos
    PUESTOS_CHICAS = {};
    dataPuestos.puestos.forEach(p => {
      if (p.codigo && String(p.codigo).trim() !== "") {
        PUESTOS_CHICAS[p.puesto] = String(p.codigo).trim();
      }
    });

    estadoEl.classList.add("listo");
    textoEl.textContent = `✓ ${dataEst.estudiantes.length} registros cargados`;

    renderResumenes();

  } catch (err) {
    console.error(err);
    estadoEl.classList.add("error-carga");
    textoEl.textContent = "⚠ Error al cargar. Recarga la página.";
  }
}

// ════════════════════════════════════════
//  RESÚMENES HOME
// ════════════════════════════════════════
function renderResumenes() {
  const todos = Object.values(CACHE);

  // ── Músicos ──
  const musicos = todos.filter(e =>
    e.numCana && String(e.numCana).trim() !== "" && String(e.numCana).trim() !== "0"
  );
  $("conteoMusicos").textContent = `${musicos.length} registrado${musicos.length !== 1 ? "s" : ""}`;

  const porCana = { seis: 0, siete: 0 };
  const porTipo = { Sanja: 0, Malta: 0, Contra: 0 };
  musicos.forEach(m => {
    if (String(m.numCana) === "1") porCana.seis++;
    if (String(m.numCana) === "2") porCana.siete++;
    if (m.tipoCana) porTipo[m.tipoCana] = (porTipo[m.tipoCana] || 0) + 1;
  });

  const statsEl = $("statsMusicos");
  statsEl.innerHTML = "";
  [
    { l: "Seis",   v: porCana.seis },
    { l: "Siete",  v: porCana.siete },
    { l: "Sanja",  v: porTipo.Sanja  || 0 },
    { l: "Malta",  v: porTipo.Malta  || 0 },
    { l: "Contra", v: porTipo.Contra || 0 },
  ].filter(x => x.v > 0).forEach(({ l, v }) => {
    const c = document.createElement("span");
    c.className = "stat-chip";
    c.innerHTML = `<span>${v}</span>${l}`;
    statsEl.appendChild(c);
  });

  const tbody = $("tbodyMusicos");
  tbody.innerHTML = "";
  if (musicos.length === 0) { mostrar("vacioMusicos"); }
  else {
    ocultar("vacioMusicos");
    musicos.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(m => {
      const cn = String(m.numCana) === "1" ? "1" : "2";
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${m.nombre}</td>
        <td><span class="tb-badge ${cn === "1" ? "tb-seis" : "tb-siete"}">${cn === "1" ? "Seis" : "Siete"}</span></td>
        <td><span class="tb-badge tb-${m.tipoCana ? m.tipoCana.toLowerCase() : ""}">${m.tipoCana || "—"}</span></td>`;
      tbody.appendChild(tr);
    });
  }
  mostrar("resumenMusicos");

  // ── Chicas ──
  const chicas = todos.filter(e => String(e.bailarina).trim() === "1");
  $("conteoChicas").textContent = `${chicas.length} seleccionada${chicas.length !== 1 ? "s" : ""}`;
  const tbodyC = $("tbodyChicas");
  tbodyC.innerHTML = "";
  if (chicas.length === 0) { mostrar("vacioChicas"); }
  else {
    ocultar("vacioChicas");
    chicas.sort((a, b) => a.nombre.localeCompare(b.nombre)).forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${c.nombre}</td><td>${c.ciclo || "—"}</td>
        <td style="font-family:'DM Mono',monospace;font-size:.75rem">${c.dni || "—"}</td>`;
      tbodyC.appendChild(tr);
    });
  }
  mostrar("resumenChicas");
}

// ════════════════════════════════════════
//  NAVEGACIÓN
// ════════════════════════════════════════
function irA(seccion) {
  ["pantallaInicio","pantallaChicas","pantallaChicos",
   "pantallaPuestosChicas","pantallaPuestosChicos"].forEach(ocultar);

  const main = document.getElementById("mainContainer");
  main.classList.remove("puestos-mode");

  if (seccion === "chicas")        { mostrar("pantallaChicas"); }
  if (seccion === "chicos")        { mostrar("pantallaChicos"); }
  if (seccion === "puestosChicas") {
    main.classList.add("puestos-mode");
    mostrar("pantallaPuestosChicas");
    renderGridChicas();
  }
  if (seccion === "puestosChicos") { mostrar("pantallaPuestosChicos"); }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function volverInicio() {
  resetChicas(); resetChicos(); cerrarModal();
  ["pantallaChicas","pantallaChicos",
   "pantallaPuestosChicas","pantallaPuestosChicos"].forEach(ocultar);
  document.getElementById("mainContainer").classList.remove("puestos-mode");
  mostrar("pantallaInicio");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ════════════════════════════════════════
//  GRID DE PUESTOS — CHICAS
//  Bloque A: puestos 1-60  (4 filas × 15 cols)
//  Bloque B: puestos 61-100 (4 filas × 10 cols)
// ════════════════════════════════════════
function renderGridChicas() {
  renderBloque("gridBloqueA", 1,  60, "bloqueACount", 60);
  renderBloque("gridBloqueB", 61, 100, "bloqueBCount", 40);
}

function renderBloque(gridId, desde, hasta, countId, total) {
  const grid = $(gridId);
  grid.innerHTML = "";

  let asignados = 0;

  for (let n = desde; n <= hasta; n++) {
    const codigo = PUESTOS_CHICAS[n] || null;
    const est    = codigo ? CACHE[codigo] : null;

    if (codigo && est) asignados++;

    const seat = document.createElement("div");

    if (est) {
      // ── Asiento ocupado ──
      const { primerNombre, inicialApellido } = parsearNombre(est.nombre);
      seat.className = "seat seat-asignado";
      seat.innerHTML = `
        <span class="seat-nombre">${primerNombre}</span>
        <span class="seat-inicial">${inicialApellido}</span>
        <span class="seat-codigo">${codigo}</span>`;
    } else {
      // ── Asiento vacío ──
      seat.className = "seat seat-vacio";
      seat.innerHTML = `<span class="seat-num">#${n}</span><span class="seat-plus">+</span>`;
    }

    seat.addEventListener("click", () => abrirModal(n));
    grid.appendChild(seat);
  }

  $(countId).textContent = `${asignados} / ${total}`;
}

// Parsear nombre: "JUAN GARCIA LOPEZ" → primerNombre:"Juan", inicialApellido:"G."
function parsearNombre(nombreCompleto) {
  const partes = String(nombreCompleto).trim().split(/\s+/);
  const primerNombre    = capitalizar(partes[0] || "?");
  const inicialApellido = partes[1] ? partes[1][0].toUpperCase() + "." : "";
  return { primerNombre, inicialApellido };
}
function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ════════════════════════════════════════
//  MODAL
// ════════════════════════════════════════
function abrirModal(numPuesto) {
  modalPuestoActual = numPuesto;
  const codigoActual = PUESTOS_CHICAS[numPuesto] || null;
  const estActual    = codigoActual ? CACHE[codigoActual] : null;

  $("modalPuestoLabel").textContent = `Puesto #${numPuesto}`;

  if (estActual) {
    // Mostrar vista "ocupado"
    ocultar("modalVista");
    mostrar("modalVistaOcupado");
    $("modalOcupadoNombre").textContent = estActual.nombre || "—";
    $("modalOcupadoMeta").textContent =
      `Código: ${codigoActual}  ·  DNI: ${estActual.dni || "—"}  ·  Ciclo: ${estActual.ciclo || "—"}`;
  } else {
    // Mostrar vista "asignar"
    mostrar("modalVista");
    ocultar("modalVistaOcupado");
    $("modalCodigo").value = "";
    ocultar("modalPreview");
    ocultar("btnAsignarPuesto");
    clearErr("errorModal");
  }

  mostrar("modalPuesto");
  setTimeout(() => {
    if (!estActual) $("modalCodigo").focus();
  }, 120);
}

function cerrarModal() {
  ocultar("modalPuesto");
  modalPuestoActual = null;
}

// Buscar en caché mientras se escribe en el modal
$("modalCodigo").addEventListener("input", function () {
  this.value = this.value.replace(/\D/g, "").slice(0, 6);
  clearErr("errorModal");

  if (this.value.length === 6) {
    const est = CACHE[this.value];
    if (est) {
      $("modalPreviewNombre").textContent = est.nombre || "—";
      $("modalPreviewMeta").textContent =
        `DNI: ${est.dni || "—"}  ·  Ciclo: ${est.ciclo || "—"}`;
      mostrar("modalPreview");
      mostrar("btnAsignarPuesto");
    } else {
      setError("errorModal", "⚠ Código no encontrado.");
      ocultar("modalPreview");
      ocultar("btnAsignarPuesto");
    }
  } else {
    ocultar("modalPreview");
    ocultar("btnAsignarPuesto");
  }
});

$("modalCodigo").addEventListener("keydown", e => {
  if (e.key === "Enter") confirmarAsignacion();
});

async function confirmarAsignacion() {
  const codigo   = $("modalCodigo").value.trim();
  const numPuesto = modalPuestoActual;
  if (!codigo || codigo.length !== 6 || !CACHE[codigo] || !numPuesto) return;

  // UI optimista: cerrar modal y actualizar grid al instante
  PUESTOS_CHICAS[numPuesto] = codigo;
  cerrarModal();
  renderGridChicas();

  // Guardar en Sheets en segundo plano
  try {
    const params = new URLSearchParams({
      action:  "asignarPuesto",
      tipo:    "chica",
      puesto:  numPuesto,
      codigo:  codigo
    });
    const resp = await fetch(`${SCRIPT_URL}?${params}`, { redirect: "follow" });
    const data = await resp.json();
    if (data.error) {
      delete PUESTOS_CHICAS[numPuesto];
      renderGridChicas();
      alert("⚠ No se pudo guardar en el servidor: " + data.error);
    }
  } catch (err) {
    console.error(err);
    delete PUESTOS_CHICAS[numPuesto];
    renderGridChicas();
    alert("⚠ Error de red. El cambio no se guardó.");
  }
}

async function liberarPuesto() {
  const numPuesto = modalPuestoActual;
  if (!numPuesto) return;

  const codigoAnterior = PUESTOS_CHICAS[numPuesto];

  // UI optimista
  delete PUESTOS_CHICAS[numPuesto];
  cerrarModal();
  renderGridChicas();

  try {
    const params = new URLSearchParams({
      action: "liberarPuesto",
      tipo:   "chica",
      puesto: numPuesto
    });
    const resp = await fetch(`${SCRIPT_URL}?${params}`, { redirect: "follow" });
    const data = await resp.json();
    if (data.error) {
      if (codigoAnterior) PUESTOS_CHICAS[numPuesto] = codigoAnterior;
      renderGridChicas();
      alert("⚠ No se pudo liberar en el servidor: " + data.error);
    }
  } catch (err) {
    console.error(err);
    if (codigoAnterior) PUESTOS_CHICAS[numPuesto] = codigoAnterior;
    renderGridChicas();
    alert("⚠ Error de red.");
  }
}

// Cerrar modal al hacer click fuera
$("modalPuesto").addEventListener("click", function (e) {
  if (e.target === this) cerrarModal();
});

// ════════════════════════════════════════
//  CHICAS — Selección
// ════════════════════════════════════════
let chicaActual = null;

function buscarChica() {
  clearErr("errorChica");
  const codigo = $("inputCodigoChica").value.trim();
  if (!/^\d{6}$/.test(codigo)) { setError("errorChica", "⚠ El código debe tener exactamente 6 dígitos."); return; }
  const data = CACHE[codigo];
  if (!data) { setError("errorChica", "⚠ Código no encontrado: " + codigo); ocultar("chicaSinSeleccion"); ocultar("chicaSeleccionada"); return; }
  chicaActual = { codigo, ...data };
  ocultar("chicaSinSeleccion"); ocultar("chicaSeleccionada");
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
  const cod = chicaActual.codigo;
  CACHE[cod].bailarina = "1";
  $("chicaGreenNombre").textContent = chicaActual.nombre || "—";
  $("chicaGreenDNI").textContent    = chicaActual.dni    || "—";
  $("chicaGreenCiclo").textContent  = chicaActual.ciclo  || "—";
  ocultar("chicaSinSeleccion"); mostrar("chicaSeleccionada");
  $("chicaSeleccionada").scrollIntoView({ behavior: "smooth", block: "start" });
  renderResumenes();
  try {
    const params = new URLSearchParams({ action: "seleccionarBailarina", codigo: cod });
    const resp   = await fetch(`${SCRIPT_URL}?${params}`, { redirect: "follow" });
    const data   = await resp.json();
    if (data.error) { CACHE[cod].bailarina = ""; renderResumenes(); setError("errorSeleccion", "⚠ No se guardó: " + data.error); }
  } catch (err) {
    console.error(err); CACHE[cod].bailarina = ""; renderResumenes();
    setError("errorSeleccion", "⚠ Error de red.");
  }
}

function resetChicas() {
  chicaActual = null;
  $("inputCodigoChica").value = "";
  clearErr("errorChica"); clearErr("errorSeleccion");
  ocultar("chicaSinSeleccion"); ocultar("chicaSeleccionada");
}

// ════════════════════════════════════════
//  CHICOS — Búsqueda y caña
// ════════════════════════════════════════
let musicoActual = null;

function buscarMusico() {
  clearErr("errorBusqueda");
  const codigo = $("inputCodigo").value.trim();
  if (!/^\d{6}$/.test(codigo)) { setError("errorBusqueda", "⚠ El código debe tener exactamente 6 dígitos."); return; }
  const data = CACHE[codigo];
  if (!data) { setError("errorBusqueda", "⚠ Código no encontrado: " + codigo); ocultar("seccionSinRegistro"); ocultar("seccionRegistrado"); return; }
  musicoActual = { codigo, ...data };
  ocultar("seccionSinRegistro"); ocultar("seccionRegistrado");
  const tieneAsig = data.numCana && String(data.numCana).trim() !== "" && String(data.numCana).trim() !== "0";
  if (tieneAsig) {
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
    ocultar("btnGuardar"); clearErr("errorGuardar"); mostrar("seccionSinRegistro");
  }
  setTimeout(() => { $(tieneAsig ? "seccionRegistrado" : "seccionSinRegistro").scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
}

function actualizarSeleccion() {
  const c = document.querySelector('input[name="cana"]:checked');
  const t = document.querySelector('input[name="tipoCana"]:checked');
  c && t ? mostrar("btnGuardar") : ocultar("btnGuardar");
}

async function guardarDatos() {
  clearErr("errorGuardar");
  const canaInput    = document.querySelector('input[name="cana"]:checked');
  const tipoCanaInput = document.querySelector('input[name="tipoCana"]:checked');
  if (!canaInput || !tipoCanaInput || !musicoActual) { setError("errorGuardar", "⚠ Selecciona caña y tipo de caña."); return; }
  const cod = musicoActual.codigo;
  const numCana  = canaInput.value;
  const tipoCana = tipoCanaInput.value;
  CACHE[cod].numCana  = numCana;
  CACHE[cod].tipoCana = tipoCana;
  $("greenNombre").textContent = musicoActual.nombre || "—";
  $("greenDNI").textContent    = musicoActual.dni    || "—";
  $("greenCiclo").textContent  = musicoActual.ciclo  || "—";
  $("greenCana").textContent   = numCana === "1" ? "Seis" : "Siete";
  $("greenTipo").textContent   = tipoCana;
  ocultar("seccionSinRegistro"); mostrar("seccionRegistrado");
  $("seccionRegistrado").scrollIntoView({ behavior: "smooth", block: "start" });
  renderResumenes();
  try {
    const params = new URLSearchParams({ action: "guardar", codigo: cod, numCana, tipoCana });
    const resp = await fetch(`${SCRIPT_URL}?${params}`, { redirect: "follow" });
    const data = await resp.json();
    if (data.error) { CACHE[cod].numCana = ""; CACHE[cod].tipoCana = ""; renderResumenes(); setError("errorGuardar", "⚠ No se guardó: " + data.error); }
  } catch (err) {
    console.error(err); CACHE[cod].numCana = ""; CACHE[cod].tipoCana = ""; renderResumenes();
    setError("errorGuardar", "⚠ Error de red.");
  }
}

function resetChicos() {
  musicoActual = null;
  $("inputCodigo").value = "";
  clearErr("errorBusqueda"); clearErr("errorGuardar");
  ocultar("seccionSinRegistro"); ocultar("seccionRegistrado");
}

// ════════════════════════════════════════
//  EVENTOS DE TECLADO
// ════════════════════════════════════════
$("inputCodigoChica").addEventListener("input", function () {
  this.value = this.value.replace(/\D/g, "").slice(0, 6);
  if (this.value.length === 6) buscarChica();
});
$("inputCodigoChica").addEventListener("keydown", e => { if (e.key === "Enter") buscarChica(); });

$("inputCodigo").addEventListener("input", function () {
  this.value = this.value.replace(/\D/g, "").slice(0, 6);
  if (this.value.length === 6) buscarMusico();
});
$("inputCodigo").addEventListener("keydown", e => { if (e.key === "Enter") buscarMusico(); });

// ════════════════════════════════════════
//  ARRANQUE
// ════════════════════════════════════════
cargarTodos();