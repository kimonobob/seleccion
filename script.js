// ════════════════════════════════════════
//  CONFIGURACIÓN
// ════════════════════════════════════════
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzEOTmrUo9J67XCd1F-DJLD1CtYQr91WFvom9hKaS0FZBH1HAvySB0MjFwOC8lW_irR/exec";

// ════════════════════════════════════════
//  ESTADO
// ════════════════════════════════════════
let musicoActual = null;

// ════════════════════════════════════════
//  HELPERS UI
// ════════════════════════════════════════
const $ = id => document.getElementById(id);

function mostrarLoading(txt = "Cargando...") {
  $("loadingOverlay").classList.remove("hidden");
  $("loadingText").textContent = txt;
}
function ocultarLoading() { $("loadingOverlay").classList.add("hidden"); }

function mostrar(id) { $(id).classList.remove("hidden"); }
function ocultar(id) { $(id).classList.add("hidden"); }

function setError(id, msg) { $(id).textContent = msg; }
function clearError(id)    { $(id).textContent = ""; }

// ════════════════════════════════════════
//  BUSCAR MÚSICO
// ════════════════════════════════════════
async function buscarMusico() {
  clearError("errorBusqueda");

  const codigo = $("inputCodigo").value.trim();
  if (!/^\d{6}$/.test(codigo)) {
    setError("errorBusqueda", "⚠ El código debe tener exactamente 6 dígitos.");
    return;
  }

  mostrarLoading("Buscando músico...");

  try {
    const url  = `${SCRIPT_URL}?action=buscar&codigo=${encodeURIComponent(codigo)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Error de red: " + resp.status);

    const data = await resp.json();

    if (data.error) {
      setError("errorBusqueda", "⚠ " + data.error);
      return;
    }

    musicoActual = { codigo, ...data };

    // ¿Ya tiene asignación?
    const tieneAsignacion = data.numCana && String(data.numCana).trim() !== "";

    if (tieneAsignacion) {
      mostrarEstadoVerde(data);
    } else {
      mostrarEstadoCeleste(data);
    }

    ocultar("seccionSinRegistro");
    ocultar("seccionRegistrado");

    if (tieneAsignacion) {
      mostrar("seccionRegistrado");
    } else {
      mostrar("seccionSinRegistro");
    }

    // Scroll suave a la sección
    setTimeout(() => {
      const seccion = tieneAsignacion ? "seccionRegistrado" : "seccionSinRegistro";
      $(seccion).scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

  } catch (err) {
    console.error(err);
    setError("errorBusqueda", "⚠ No se pudo conectar. Intenta nuevamente.");
  } finally {
    ocultarLoading();
  }
}

// ════════════════════════════════════════
//  MOSTRAR ESTADO CELESTE (sin registro)
// ════════════════════════════════════════
function mostrarEstadoCeleste(data) {
  $("cyanNombre").textContent = data.nombre || "—";
  $("cyanDNI").textContent    = data.dni    || "—";
  $("cyanCiclo").textContent  = data.ciclo  || "—";

  // Limpiar selecciones
  document.querySelectorAll('input[name="cana"]').forEach(r => r.checked = false);
  document.querySelectorAll('input[name="tipoCana"]').forEach(r => r.checked = false);
  ocultar("btnGuardar");
  clearError("errorGuardar");
}

// ════════════════════════════════════════
//  MOSTRAR ESTADO VERDE (ya registrado)
// ════════════════════════════════════════
function mostrarEstadoVerde(data) {
  $("greenNombre").textContent = data.nombre || "—";
  $("greenDNI").textContent    = data.dni    || "—";
  $("greenCiclo").textContent  = data.ciclo  || "—";

  // numCana: 1 = Seis, 2 = Siete
  const canaTexto = data.numCana == 1 ? "Seis" : data.numCana == 2 ? "Siete" : String(data.numCana);
  $("greenCana").textContent = canaTexto;
  $("greenTipo").textContent = data.tipoCana || "—";
}

// ════════════════════════════════════════
//  MOSTRAR BOTÓN GUARDAR SI HAY SELECCIÓN
// ════════════════════════════════════════
function actualizarSeleccion() {
  const cana    = document.querySelector('input[name="cana"]:checked');
  const tipoCana = document.querySelector('input[name="tipoCana"]:checked');

  if (cana && tipoCana) {
    mostrar("btnGuardar");
  } else {
    ocultar("btnGuardar");
  }
}

// ════════════════════════════════════════
//  GUARDAR DATOS
// ════════════════════════════════════════
async function guardarDatos() {
  clearError("errorGuardar");

  const canaInput    = document.querySelector('input[name="cana"]:checked');
  const tipoCanaInput = document.querySelector('input[name="tipoCana"]:checked');

  if (!canaInput || !tipoCanaInput || !musicoActual) {
    setError("errorGuardar", "⚠ Selecciona caña y tipo de caña.");
    return;
  }

  const payload = {
    action:   "guardar",
    codigo:   musicoActual.codigo,
    numCana:  canaInput.value,      // "1" = Seis, "2" = Siete
    tipoCana: tipoCanaInput.value   // "Sanja", "Malta", "Contra"
  };

  mostrarLoading("Guardando registro...");

  try {
    const params = new URLSearchParams(payload);
    const resp   = await fetch(`${SCRIPT_URL}?${params.toString()}`, { redirect: "follow" });
    const data   = await resp.json();

    if (data.error) {
      setError("errorGuardar", "⚠ " + data.error);
      return;
    }

    // Pasar a estado verde con la nueva asignación
    const asignado = {
      ...musicoActual,
      numCana:  canaInput.value,
      tipoCana: tipoCanaInput.value
    };

    ocultar("seccionSinRegistro");
    mostrarEstadoVerde(asignado);
    mostrar("seccionRegistrado");

    $("seccionRegistrado").scrollIntoView({ behavior: "smooth", block: "start" });

  } catch (err) {
    console.error(err);
    setError("errorGuardar", "⚠ Error al guardar. Intenta nuevamente.");
  } finally {
    ocultarLoading();
  }
}

// ════════════════════════════════════════
//  REINICIAR
// ════════════════════════════════════════
function reiniciar() {
  musicoActual = null;
  $("inputCodigo").value = "";
  clearError("errorBusqueda");
  ocultar("seccionSinRegistro");
  ocultar("seccionRegistrado");
  $("seccionBusqueda").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ════════════════════════════════════════
//  EVENTOS DE TECLADO Y FORMATO
// ════════════════════════════════════════
$("inputCodigo").addEventListener("keydown", e => { if (e.key === "Enter") buscarMusico(); });
$("inputCodigo").addEventListener("input",   function () {
  this.value = this.value.replace(/\D/g, "").slice(0, 6);
});