/* Villa Canal · comportamiento común a todas las páginas.
   La web funciona sin este archivo: aquí solo se añaden comodidades. */
(function () {
  'use strict';

  var WA_NUMERO = '34657337686'; // WhatsApp del gestor de la villa

  /* ---------- WhatsApp: todos los enlaces [data-wa] llevan un mensaje ya escrito ---------- */
  function enlaceWA(texto) {
    return 'https://wa.me/' + WA_NUMERO + '?text=' + encodeURIComponent(texto);
  }
  window.VillaCanal = { enlaceWA: enlaceWA, WA_NUMERO: WA_NUMERO };
  document.querySelectorAll('[data-wa]').forEach(function (a) {
    a.href = enlaceWA(a.getAttribute('data-wa') || 'Hola, tengo una pregunta sobre Villa Canal.');
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });

  /* ---------- Cabecera: transparente sobre la portada, clara al bajar ---------- */
  var cabecera = document.querySelector('.cabecera');
  var portada = document.querySelector('[data-portada]');
  function estadoCabecera() {
    if (!cabecera || !cabecera.classList.contains('cabecera--transparente')) return;
    var limite = portada ? portada.offsetHeight - cabecera.offsetHeight - 40 : 40;
    cabecera.classList.toggle('cabecera--solida', window.scrollY > Math.max(limite, 40));
  }

  /* ---------- Barra inferior del móvil y WhatsApp flotante del escritorio ---------- */
  var barra = document.querySelector('.barra-movil');
  var wa = document.querySelector('.wa-flotante');
  var disparador = document.querySelector('[data-barra-desde]');
  var pie = document.querySelector('.pie');
  function estadoBarra() {
    // Los dos se esconden al llegar al pie para no tapar los enlaces legales
    var enPie = !!pie && pie.getBoundingClientRect().top < window.innerHeight - 40;
    // El WhatsApp tampoco se ve mientras el buscador está en pantalla, para no tapar su botón
    if (wa) {
      var r = disparador ? disparador.getBoundingClientRect() : null;
      var buscadorVisible = !!r && r.bottom > 0 && r.top < window.innerHeight;
      wa.classList.toggle('wa-flotante--oculto', buscadorVisible || enPie);
    }
    if (!barra) return;
    // La barra aparece al dejar atrás el buscador
    var desde = disparador ? disparador.getBoundingClientRect().bottom < 0 : window.scrollY > 480;
    barra.setAttribute('data-visible', desde && !enPie ? 'true' : 'false');
  }

  var pendiente = false;
  function alDesplazar() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () { estadoCabecera(); estadoBarra(); pendiente = false; });
  }
  window.addEventListener('scroll', alDesplazar, { passive: true });
  window.addEventListener('resize', alDesplazar);
  // Primer cálculo sin transición: el WhatsApp no se desvanece al cargar la portada
  if (wa) wa.style.transition = 'none';
  estadoCabecera(); estadoBarra();
  if (wa) { void wa.offsetWidth; wa.style.transition = ''; }

  /* ---------- Menú del móvil ---------- */
  var panel = document.getElementById('panel-menu');
  var abrir = document.querySelector('[data-abrir-menu]');
  var cerrar = panel ? panel.querySelector('[data-cerrar-menu]') : null;
  var ultimoFoco = null;
  // Todo lo que queda detrás del panel (menos los scripts): inerte mientras el menú está abierto
  function fondo() {
    return [].filter.call(document.body.children, function (el) { return el !== panel && el.tagName !== 'SCRIPT'; });
  }
  function abrirMenu() {
    ultimoFoco = document.activeElement;
    panel.setAttribute('data-abierto', 'true');
    panel.removeAttribute('inert');
    fondo().forEach(function (el) { el.inert = true; });
    abrir.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { (cerrar || panel).focus(); }, 30);
  }
  function cerrarMenu() {
    panel.setAttribute('data-abierto', 'false');
    panel.setAttribute('inert', '');
    // Primero se libera el fondo; si no, el foco no puede volver al botón del menú
    fondo().forEach(function (el) { el.inert = false; });
    abrir.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    if (ultimoFoco) ultimoFoco.focus();
  }
  if (panel && abrir) {
    panel.setAttribute('inert', '');
    abrir.addEventListener('click', abrirMenu);
    if (cerrar) cerrar.addEventListener('click', cerrarMenu);
    panel.querySelectorAll('nav a').forEach(function (a) { a.addEventListener('click', cerrarMenu); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.getAttribute('data-abierto') === 'true') cerrarMenu();
    });
  }

  /* ---------- Aparición suave de bloques ---------- */
  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bloques = document.querySelectorAll('.aparece');
  if (!reducido && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visto'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    bloques.forEach(function (b) { io.observe(b); });
  } else {
    bloques.forEach(function (b) { b.classList.add('visto'); });
  }

  /* ---------- Buscador de disponibilidad: lleva las fechas a la página de reserva ---------- */
  // Fechas AAAA-MM-DD en hora local (toISOString usa UTC y en husos lejanos cambia de día)
  function isoLocal(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function hoyISO() { return isoLocal(new Date()); }
  function sumarDias(iso, n) {
    var p = iso.split('-');
    var d = new Date(+p[0], p[1] - 1, +p[2], 12); d.setDate(d.getDate() + n);
    return isoLocal(d);
  }
  var FALTA = { llegada: 'Elige la fecha de llegada.', salida: 'Elige la fecha de salida.' };
  document.querySelectorAll('form[data-disponibilidad]').forEach(function (form) {
    var llegada = form.querySelector('[name="llegada"]');
    var salida = form.querySelector('[name="salida"]');
    var huespedes = form.querySelector('[name="huespedes"]');
    var error = form.parentNode.querySelector('[data-error]'); // el aviso está fuera del form
    var hoy = hoyISO();
    // Con JS validamos nosotros (mensajes en español); sin JS sigue la validación del navegador
    form.noValidate = true;
    if (llegada) llegada.min = hoy;
    if (salida) salida.min = sumarDias(hoy, 1);
    if (llegada && salida) {
      llegada.addEventListener('change', function () {
        if (!llegada.value) return;
        salida.min = sumarDias(llegada.value, 1);
        if (!salida.value || salida.value <= llegada.value) salida.value = '';
      });
    }

    // Todos los enlaces a reservar/ de la página llevan las fechas y huéspedes ya elegidos
    function enlazarReserva() {
      var p = new URLSearchParams();
      if (llegada && llegada.value) p.set('llegada', llegada.value);
      if (salida && salida.value) p.set('salida', salida.value);
      if (huespedes && huespedes.value) p.set('huespedes', huespedes.value);
      var q = p.toString();
      document.querySelectorAll('a[href^="reservar/"]').forEach(function (a) {
        if (!a.hasAttribute('data-href-base')) a.setAttribute('data-href-base', a.getAttribute('href'));
        var base = a.getAttribute('data-href-base').split(/[?#]/)[0];
        a.setAttribute('href', base + (q ? '?' + q : ''));
      });
    }
    function quitarError(campo) {
      if (campo) campo.removeAttribute('aria-invalid');
      if (error) { error.hidden = true; error.textContent = ''; }
    }
    function alCambiar(e) {
      if (e.target.getAttribute('aria-invalid') === 'true') quitarError(e.target);
      enlazarReserva();
    }
    form.addEventListener('change', alCambiar);
    form.addEventListener('input', alCambiar);
    // Si el navegador devuelve el formulario relleno (botón atrás), los enlaces también
    if ((llegada && llegada.value) || (salida && salida.value)) enlazarReserva();

    form.addEventListener('submit', function (e) {
      if (!llegada || !salida) return;
      var msg = '', campo = null;
      [].some.call(form.querySelectorAll('[required]'), function (c) {
        if (c.value.trim()) return false;
        campo = c; msg = FALTA[c.name] || 'Rellena este campo.';
        return true;
      });
      if (!msg) {
        if (llegada.value < hoy) { campo = llegada; msg = 'La fecha de llegada ya ha pasado.'; }
        else if (salida.value <= llegada.value) { campo = salida; msg = 'La salida tiene que ser después de la llegada.'; }
      }
      if (msg) {
        e.preventDefault();
        if (error) { error.textContent = msg; error.hidden = false; }
        campo.setAttribute('aria-invalid', 'true');
        campo.focus();
      } else {
        quitarError(null);
      }
    });
  });

  /* Año del pie */
  document.querySelectorAll('[data-anio]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
