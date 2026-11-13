
import "./style.css";

const app = document.querySelector("#app");

let sessionToken = null;
let participantName = "";

function renderHeader() {
  return `
    <header class="navbar">
      <a href="#" class="brand">
        <span class="brand-icon">✦</span>
        Amigo Secreto
      </a>
      <span class="edition">EDICIÓN FAMILIAR</span>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer>
      <p>Hecho con cariño para compartir en familia</p>
      <span>✦ AMIGO SECRETO FAMILIAR ✦</span>
    </footer>
  `;
}

function renderLogin() {
  app.innerHTML = `
    ${renderHeader()}

    <main class="container">
      <section class="hero">
        <div class="hero-content">
          <span class="eyebrow">✧ UNA TRADICIÓN PARA COMPARTIR ✧</span>

          <h1>
            La magia de regalar
            <span>comienza aquí</span>
          </h1>

          <p>
            Porque los mejores regalos no son solamente
            los que recibimos, sino las personas con
            quienes compartimos estos momentos.
          </p>

          <div class="hero-decoration">
            <span>🎁</span>
            <span>✦</span>
            <span>🎄</span>
            <span>✧</span>
          </div>
        </div>

        <div class="hero-side">
          <div class="gift-circle">
            <div class="gift-icon">🎁</div>
            <span class="circle-text">UNA SORPRESA ESPECIAL</span>
          </div>
        </div>
      </section>

      <section class="login-section">
        <div class="login-heading">
          <span class="small-label">TU FAMILIA TE ESPERA</span>
          <h2>Bienvenido al sorteo</h2>
          <p>Ingresa tus datos para acceder a tu experiencia.</p>
        </div>

        <form id="login-form">
          <div class="form-group">
            <label for="fullName">Nombre completo</label>
            <input
              type="text"
              id="fullName"
              placeholder="Escribe tu nombre completo"
              autocomplete="name"
              required
            />
          </div>

          <div class="form-group">
            <label for="accessCode">Tu código personal</label>
            <input
              type="password"
              id="accessCode"
              placeholder="Ingresa tu código secreto"
              autocomplete="off"
              required
            />
          </div>

          <button type="submit" class="primary-button">
            Entrar a mi sorteo
            <span>→</span>
          </button>

          <p id="message" class="message" role="status"></p>
        </form>

        <div class="privacy">
          <span>🔒</span>
          Tu papelito es privado. Nadie más podrá verlo.
        </div>
      </section>

      ${renderFooter()}
    </main>
  `;

  const form = document.querySelector("#login-form");
  const message = document.querySelector("#message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.querySelector("#fullName").value.trim();
    const code = document.querySelector("#accessCode").value.trim();
    const button = form.querySelector("button");

    if (!name || !code) {
      message.textContent = "Completa tu nombre y tu código personal.";
      message.className = "message error";
      return;
    }

    button.disabled = true;
    button.textContent = "Verificando acceso...";
    message.textContent = "";

    try {
      const response = await fetch("/api/iniciar-sesion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          accessCode: code
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "No se pudo iniciar sesión.");
      }

      sessionToken = data.token;
      participantName = data.participant.name;

      renderWishes();

    } catch (error) {
      message.textContent = error.message;
      message.className = "message error";

      button.disabled = false;
      button.innerHTML = 'Entrar a mi sorteo <span>→</span>';
    }
  });
}

function renderWishes() {
  app.innerHTML = `
    ${renderHeader()}

    <main class="container">
      <section class="hero">
        <div class="hero-content">
          <span class="eyebrow">✧ TU MOMENTO ESPECIAL ✧</span>

          <h1>
            ¡Hola!
            <span id="participant-name"></span>
          </h1>

          <p>
            Ya estás dentro de la experiencia.
            Cuéntanos cuáles son esos tres regalos
            que te gustaría recibir.
          </p>

          <div class="hero-decoration">
            <span>🎁</span>
            <span>✦</span>
            <span>🎄</span>
            <span>✧</span>
          </div>
        </div>

        <div class="hero-side">
          <div class="gift-circle">
            <div class="gift-icon">🎁</div>
            <span class="circle-text">TUS TRES DESEOS</span>
          </div>
        </div>
      </section>

      <section class="login-section">
        <div class="login-heading">
          <span class="small-label">PREPARA TU LISTA</span>
          <h2>Mis tres regalos</h2>
          <p>
            Escribe tres regalos que te gustaría recibir.
            Sé tan específico como quieras.
          </p>
        </div>

        <form id="wishes-form">
          <div class="form-group">
            <label for="wish1">🎁 Primer regalo</label>
            <input
              type="text"
              id="wish1"
              maxlength="150"
              minlength="2"
              placeholder="¿Qué te gustaría recibir?"
              required
            />
          </div>

          <div class="form-group">
            <label for="wish2">🎁 Segundo regalo</label>
            <input
              type="text"
              id="wish2"
              maxlength="150"
              minlength="2"
              placeholder="Escribe tu segundo deseo"
              required
            />
          </div>

          <div class="form-group">
            <label for="wish3">🎁 Tercer regalo</label>
            <input
              type="text"
              id="wish3"
              maxlength="150"
              minlength="2"
              placeholder="Escribe tu tercer deseo"
              required
            />
          </div>

          <button type="submit" class="primary-button">
            Guardar mis regalos
            <span>→</span>
          </button>

          <p id="wishes-message" class="message" role="status"></p>
        </form>

        <div class="privacy">
          <span>🔒</span>
          Tus deseos son privados.
        </div>

        <div class="form-group">
          <button
            type="button"
            id="result-button"
            class="primary-button"
          >
            🎄 Consultar mi amigo secreto
            <span>→</span>
          </button>

          <p id="result-message" class="message" role="status"></p>
        </div>

        <button type="button" id="logout-button" class="secondary-button">
          Cerrar sesión
        </button>
      </section>

      ${renderFooter()}
    </main>
  `;

  document.querySelector("#participant-name").textContent =
    participantName;

  const form = document.querySelector("#wishes-form");
  const message = document.querySelector("#wishes-message");
  const button = form.querySelector("button");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const wishes = [
      document.querySelector("#wish1").value.trim(),
      document.querySelector("#wish2").value.trim(),
      document.querySelector("#wish3").value.trim()
    ];

    if (wishes.some((wish) => wish.length < 2 || wish.length > 150)) {
      message.textContent =
        "Cada regalo debe tener entre 2 y 150 caracteres.";
      message.className = "message error";
      return;
    }

    button.disabled = true;
    button.textContent = "Guardando tus regalos...";
    message.textContent = "";

    try {
      const response = await fetch("/api/guardar-deseos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ wishes })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "No se pudieron guardar los regalos."
        );
      }

      message.textContent =
        "¡Perfecto! Tus tres regalos se guardaron correctamente.";
      message.className = "message success";

    } catch (error) {
      message.textContent = error.message;
      message.className = "message error";

    } finally {
      button.disabled = false;
      button.innerHTML = 'Guardar mis regalos <span>→</span>';
    }
  });

  document.querySelector("#result-button").addEventListener(
    "click",
    consultarResultado
  );

  document.querySelector("#logout-button").addEventListener("click", () => {
    cerrarSesion();
  });
}

async function consultarResultado() {
  const button = document.querySelector("#result-button");
  const message = document.querySelector("#result-message");

  button.disabled = true;
  button.textContent = "Consultando resultado...";
  message.textContent = "";

  try {
    const response = await fetch("/api/mi-resultado", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${sessionToken}`
      }
    });

    const data = await response.json();

    if (response.status === 403) {
      message.textContent =
        "Todavía no se ha realizado el sorteo. ¡Pronto llegará tu sorpresa!";
      message.className = "message";
      return;
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || "No se pudo consultar tu resultado.");
    }

    renderResult(data.result.name);

  } catch (error) {
    message.textContent = error.message;
    message.className = "message error";

  } finally {
    button.disabled = false;
    button.innerHTML =
      '🎄 Consultar mi amigo secreto <span>→</span>';
  }
}

function renderResult(recipientName) {
  app.innerHTML = `
    ${renderHeader()}

    <main class="container">
      <section class="hero">
        <div class="hero-content">
          <span class="eyebrow">✧ HA LLEGADO EL MOMENTO ✧</span>

          <h1>
            ¡Tu amigo secreto
            <span>es...</span>
          </h1>

          <p>
            La sorpresa que estabas esperando
            finalmente ha llegado.
          </p>

          <div class="hero-decoration">
            <span>🎄</span>
            <span>✦</span>
            <span>🎁</span>
            <span>✧</span>
          </div>
        </div>

        <div class="hero-side">
          <div class="gift-circle">
            <div class="gift-icon">🎁</div>
            <span class="circle-text">TU SORPRESA</span>
          </div>
        </div>
      </section>

      <section class="login-section">
        <div class="login-heading">
          <span class="small-label">TU PERSONA ASIGNADA</span>
          <h2>¡Es hora de descubrirlo!</h2>
          <p>La persona que te corresponde en este Amigo Secreto es:</p>
        </div>

        <div class="gift-circle">
          <div class="gift-icon">🎅</div>
        </div>

        <h2 id="recipient-name" class="login-heading"></h2>

        <p class="privacy">
          🔒 Recuerda mantener esta sorpresa en secreto.
        </p>

        <button type="button" id="back-button" class="primary-button">
          Volver a mi espacio
          <span>→</span>
        </button>

        <button type="button" id="logout-button" class="secondary-button">
          Cerrar sesión
        </button>
      </section>

      ${renderFooter()}
    </main>
  `;

  document.querySelector("#recipient-name").textContent =
    recipientName;

  document.querySelector("#back-button").addEventListener("click", () => {
    renderWishes();
  });

  document.querySelector("#logout-button").addEventListener("click", () => {
    cerrarSesion();
  });
}

function cerrarSesion() {
  sessionToken = null;
  participantName = "";
  renderLogin();
}

renderLogin();
