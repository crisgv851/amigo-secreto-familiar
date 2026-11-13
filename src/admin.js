
import "./style.css";

const app = document.querySelector("#app");

let adminToken = null;

function renderLogin() {
  app.innerHTML = `
    <header class="navbar">
      <a href="/" class="brand">
        <span class="brand-icon">✦</span>
        Amigo Secreto
      </a>
      <span class="edition">ADMINISTRACIÓN</span>
    </header>

    <main class="container">
      <section class="login-section">
        <div class="login-heading">
          <span class="small-label">ACCESO PRIVADO</span>
          <h2>Panel administrativo</h2>
          <p>Ingresa tu contraseña para administrar el sorteo familiar.</p>
        </div>

        <form id="admin-login-form">
          <div class="form-group">
            <label for="admin-password">Contraseña administrativa</label>
            <input
              type="password"
              id="admin-password"
              placeholder="Ingresa tu contraseña"
              autocomplete="current-password"
              required
            />
          </div>

          <button type="submit" class="primary-button">
            Ingresar al panel
            <span>→</span>
          </button>

          <p id="admin-message" class="message" role="status"></p>
        </form>

        <div class="privacy">
          <span>🔒</span>
          Acceso exclusivo para el administrador.
        </div>
      </section>
    </main>
  `;

  document
    .querySelector("#admin-login-form")
    .addEventListener("submit", iniciarSesionAdmin);
}

async function iniciarSesionAdmin(event) {
  event.preventDefault();

  const password = document
    .querySelector("#admin-password")
    .value;

  const button = event.currentTarget.querySelector("button");
  const message = document.querySelector("#admin-message");

  button.disabled = true;
  button.textContent = "Verificando...";
  message.textContent = "";

  try {
    const response = await fetch("/api/admin-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "No se pudo iniciar sesión.");
    }

    adminToken = data.token;

    await renderDashboard();

  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";

    button.disabled = false;
    button.innerHTML = 'Ingresar al panel <span>→</span>';
  }
}

async function renderDashboard() {
  app.innerHTML = `
    <header class="navbar">
      <a href="/" class="brand">
        <span class="brand-icon">✦</span>
        Amigo Secreto
      </a>
      <span class="edition">ADMINISTRACIÓN</span>
    </header>

    <main class="container">
      <section class="hero">
        <div class="hero-content">
          <span class="eyebrow">✧ CONTROL FAMILIAR ✧</span>
          <h1>
            Panel de
            <span>administración</span>
          </h1>
          <p>
            Consulta el progreso de los participantes
            y administra el sorteo familiar.
          </p>
        </div>
        <div class="hero-side">
          <div class="gift-circle">
            <div class="gift-icon">🎄</div>
            <span class="circle-text">PANEL PRIVADO</span>
          </div>
        </div>
      </section>

      <section class="login-section">
        <div class="login-heading">
          <span class="small-label">RESUMEN GENERAL</span>
          <h2>Participantes</h2>
          <p>Estado de los registros familiares.</p>
        </div>

        <div id="admin-summary">
          Cargando información...
        </div>

        <div id="participants-list"></div>

        <p id="dashboard-message" class="message" role="status"></p>

        <button
          type="button"
          id="refresh-button"
          class="secondary-button"
        >
          Actualizar participantes
        </button>

        <button
          type="button"
          id="draw-button"
          class="primary-button"
          disabled
        >
          Realizar sorteo
          <span>→</span>
        </button>

        <button
          type="button"
          id="admin-logout"
          class="secondary-button"
        >
          Cerrar sesión administrativa
        </button>

        <div class="privacy">
          <span>🔒</span>
          Este panel no muestra los regalos ni las asignaciones.
        </div>
      </section>

      <footer>
        <p>Hecho con cariño para compartir en familia</p>
        <span>✦ AMIGO SECRETO FAMILIAR ✦</span>
      </footer>
    </main>
  `;

  document
    .querySelector("#refresh-button")
    .addEventListener("click", cargarParticipantes);

  document
    .querySelector("#draw-button")
    .addEventListener("click", realizarSorteo);

  document
    .querySelector("#admin-logout")
    .addEventListener("click", cerrarSesionAdmin);

  await cargarParticipantes();
}

async function cargarParticipantes() {
  const summary = document.querySelector("#admin-summary");
  const list = document.querySelector("#participants-list");
  const message = document.querySelector("#dashboard-message");
  const drawButton = document.querySelector("#draw-button");

  summary.textContent = "Consultando participantes...";
  list.innerHTML = "";
  message.textContent = "";
  drawButton.disabled = true;

  try {
    const response = await fetch("/api/listar-participantes", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      if (response.status === 401) {
        cerrarSesionAdmin();
        throw new Error("Tu sesión administrativa ha expirado.");
      }

      throw new Error(data.message || "No se pudo cargar la información.");
    }

    summary.innerHTML = `
      <div class="privacy">
        <strong>Total:</strong> ${data.total}
        <span> | </span>
        <strong>Completados:</strong> ${data.completed}
        <span> | </span>
        <strong>Pendientes:</strong> ${data.total - data.completed}
      </div>
    `;

    if (data.participants.length === 0) {
      list.textContent = "Todavía no hay participantes registrados.";
      return;
    }

    list.innerHTML = data.participants.map((participant) => `
      <div class="form-group">
        <strong>${escapeHTML(participant.name)}</strong>
        <p>
          Estado:
          ${participant.registered ? "Completado" : "Pendiente"}
        </p>
        <p>Regalos registrados: ${participant.wishesCount} de 3</p>
      </div>
    `).join("");

    const allReady =
      data.total >= 2 &&
      data.total <= 20 &&
      data.completed === data.total &&
      data.participants.every(
        (participant) =>
          participant.registered &&
          participant.wishesCount === 3
      );

    drawButton.disabled = !allReady;

    if (allReady) {
      message.textContent =
        "Todos los participantes están preparados para el sorteo.";
      message.className = "message success";
    } else {
      message.textContent =
        "El sorteo estará disponible cuando todos completen sus tres regalos.";
      message.className = "message";
    }

  } catch (error) {
    summary.textContent = "";
    message.textContent = error.message;
    message.className = "message error";
  }
}

async function realizarSorteo() {
  const drawButton = document.querySelector("#draw-button");
  const message = document.querySelector("#dashboard-message");

  const confirmar = window.confirm(
    "¿Estás seguro de realizar el sorteo? Esta acción es definitiva y no se podrá repetir."
  );

  if (!confirmar) {
    return;
  }

  drawButton.disabled = true;
  drawButton.textContent = "Realizando sorteo...";
  message.textContent = "";

  try {
    const response = await fetch("/api/realizar-sorteo", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "No se pudo realizar el sorteo.");
    }

    message.textContent =
      "¡Sorteo realizado correctamente! Cada familiar ya puede consultar su resultado.";
    message.className = "message success";

    await cargarParticipantes();

    drawButton.disabled = true;
    drawButton.textContent = "Sorteo realizado";

  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";

    drawButton.disabled = false;
    drawButton.innerHTML = 'Realizar sorteo <span>→</span>';
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function cerrarSesionAdmin() {
  adminToken = null;
  renderLogin();
}

renderLogin();
