// ════════════════════════════════════════
//  CONFIGURACIÓN
// ════════════════════════════════════════
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyuJoiJ-prcr3-Jz-vOwnI50p2eeX4C9teYbYutXj6inOL9fWSClbcK67GP2LEfSOSi/exec";

// ════════════════════════════════════════
//  ESTADO
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
const clearErr = id => $(id).textContent = "";

function mostrarLoading(txt = "Cargando...") {
  mostrar("loadingOverlay");
  $("loadingText").textContent = txt;
}
function ocultarLoading() { ocultar("loadingOverlay"); }

// ════════════════════════════════════════
//  NAVEGACIÓN ENTRE PANTALLAS
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

async function buscarChica() {
  clearErr("errorChica");

  const codigo = $("inputCodigoChica").value.trim();
  if (!/^\d{6}$/.test(codigo)) {
    setError("errorChica", "⚠ El código debe tener exactamente 6 dígitos.");
    return;
  }

  mostrarLoading("Buscando estudiante...");

  try {
    const url  = `${SCRIPT_URL}?action=buscar&codigo=${encodeURIComponent(codigo)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Error de red");

    const data = await resp.json();
    if (data.error) { setError("errorChica", "⚠ " + data.error); return; }

    chicaActual = { codigo, ...data };

    const yaSeleccionada = String(data.bailarina).trim() === "1";

    ocultar("chicaSinSeleccion");
    ocultar("chicaSeleccionada");

    if (yaSeleccionada) {
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
      const id = yaSeleccionada ? "chicaSeleccionada" : "chicaSinSeleccion";
      $(id).scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

  } catch (err) {
    console.error(err);
    setError("errorChica", "⚠ No se pudo conectar. Intenta nuevamente.");
  } finally {
    ocultarLoading();
  }
}

async function seleccionarChica() {
  clearErr("errorSeleccion");
  if (!chicaActual) return;

  mostrarLoading("Guardando selección...");

  try {
    const params = new URLSearchParams({
      action:    "seleccionarBailarina",
      codigo:    chicaActual.codigo
    });
    const resp = await fetch(`${SCRIPT_URL}?${params}`, { redirect: "follow" });
    const data = await resp.json();

    if (data.error) { setError("errorSeleccion", "⚠ " + data.error); return; }

    // Pasar a estado verde
    $("chicaGreenNombre").textContent = chicaActual.nombre || "—";
    $("chicaGreenDNI").textContent    = chicaActual.dni    || "—";
    $("chicaGreenCiclo").textContent  = chicaActual.ciclo  || "—";

    ocultar("chicaSinSeleccion");
    mostrar("chicaSeleccionada");
    $("chicaSeleccionada").scrollIntoView({ behavior: "smooth", block: "start" });

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

async function buscarMusico() {
  clearErr("errorBusqueda");

  const codigo = $("inputCodigo").value.trim();
  if (!/^\d{6}$/.test(codigo)) {
    setError("errorBusqueda", "⚠ El código debe tener exactamente 6 dígitos.");
    return;
  }

  mostrarLoading("Buscando músico...");

  try {
    const url  = `${SCRIPT_URL}?action=buscar&codigo=${encodeURIComponent(codigo)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Error de red");

    const data = await resp.json();
    if (data.error) { setError("errorBusqueda", "⚠ " + data.error); return; }

    musicoActual = { codigo, ...data };

    const tieneAsignacion = data.numCana && String(data.numCana).trim() !== "";

    ocultar("seccionSinRegistro");
    ocultar("seccionRegistrado");

    if (tieneAsignacion) {
      $("greenNombre").textContent = data.nombre || "—";
      $("greenDNI").textContent    = data.dni    || "—";
      $("greenCiclo").textContent  = data.ciclo  || "—";
      $("greenCana").textContent   = data.numCana == 1 ? "Seis" : "Siete";
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
    }, 80);

  } catch (err) {
    console.error(err);
    setError("errorBusqueda", "⚠ No se pudo conectar. Intenta nuevamente.");
  } finally {
    ocultarLoading();
  }
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

    $("greenNombre").textContent = musicoActual.nombre || "—";
    $("greenDNI").textContent    = musicoActual.dni    || "—";
    $("greenCiclo").textContent  = musicoActual.ciclo  || "—";
    $("greenCana").textContent   = canaInput.value === "1" ? "Seis" : "Siete";
    $("greenTipo").textContent   = tipoCanaInput.value;

    ocultar("seccionSinRegistro");
    mostrar("seccionRegistrado");
    $("seccionRegistrado").scrollIntoView({ behavior: "smooth", block: "start" });

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
$("inputCodigoChica").addEventListener("input", function () {
  this.value = this.value.replace(/\D/g, "").slice(0, 6);
});

$("inputCodigo").addEventListener("keydown", e => { if (e.key === "Enter") buscarMusico(); });
$("inputCodigo").addEventListener("input", function () {
  this.value = this.value.replace(/\D/g, "").slice(0, 6);
});