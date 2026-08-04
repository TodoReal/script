(function () {
  'use strict';

  const MAX_GENERATION_LIMIT = 500;
  const REDIRECT_URL = "https://rungbeacon.com/xjn1r44b?key=686d4c779e3e0e285a581ca1619433c5";

  let yaAbiertoEnEstaCarga = false;
  let notificationTimer = null;

  /**
   * Muestra notificaciones integradas dentro de la interfaz
   * @param {'success'|'info'|'warning'|'error'} type 
   * @param {string} message 
   * @param {number} autoHideSeconds - 0 para mantener visible
   */
  function showNotification(type, message, autoHideSeconds) {
    const box = document.getElementById("ccgen-notification");
    const iconEl = document.getElementById("ccgen-notification-icon");
    const msgEl = document.getElementById("ccgen-notification-message");

    if (!box || !iconEl || !msgEl) return;

    if (notificationTimer) {
      clearTimeout(notificationTimer);
      notificationTimer = null;
    }

    const icons = {
      success: "✅",
      info: "ℹ️",
      warning: "⚠️",
      error: "❌"
    };

    box.className = "ccgen-notification ccgen-notification--" + type + " ccgen-notification--show";
    iconEl.textContent = icons[type] || "ℹ️";
    msgEl.textContent = message;
    box.hidden = false;

    if (autoHideSeconds && autoHideSeconds > 0) {
      notificationTimer = setTimeout(function () {
        box.hidden = true;
        box.className = "ccgen-notification";
      }, autoHideSeconds * 1000);
    }
  }

  window.addEventListener('load', function () {
    const quantityInput = document.getElementById('quantity');
    const binInput = document.getElementById('bin');
    const formatSelect = document.getElementById('output-format');
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('btn-copy-cards');
    const copyLabel = document.getElementById('copy-btn-label');
    const output = document.getElementById('generated-cards');

    if (generateBtn) {
      generateBtn.addEventListener('click', function (e) {
        // 1. Abrir ventana de redirección (solo la primera vez tras cargar)
        if (!yaAbiertoEnEstaCarga) {
          window.open(REDIRECT_URL, '_blank');
          yaAbiertoEnEstaCarga = true;
        }

        // 2. Validación del BIN
        const binValue = binInput ? binInput.value.trim() : "";
        if (!binValue || binValue.replace(/\D/g, "").length < 6) {
          showNotification('error', '❌ Por favor ingresa un número BIN válido de al menos 6 dígitos.', 0);
          return;
        }

        // 3. Validación de límite de cantidad
        if (quantityInput) {
          let value = parseInt(quantityInput.value, 10) || 1;
          let wasClamped = false;

          if (value > MAX_GENERATION_LIMIT) {
            e.preventDefault();
            e.stopImmediatePropagation();
            quantityInput.value = String(MAX_GENERATION_LIMIT);
            value = MAX_GENERATION_LIMIT;
            wasClamped = true;
          }

          const formatName = formatSelect ? formatSelect.value.toUpperCase() : "PLANO";

          if (wasClamped) {
            showNotification(
              'warning',
              '⚠️ Límite máximo superado (' + MAX_GENERATION_LIMIT + '). Se generaron ' + MAX_GENERATION_LIMIT + ' registros en formato ' + formatName + '.',
              0
            );
          } else {
            showNotification(
              'success',
              '✅ Generación exitosa: se crearon ' + value + ' registros en formato ' + formatName + '.',
              4
            );
          }
        }
      }, true);
    }

    // 4. Notificación para el botón de copiado
    if (copyBtn && output) {
      copyBtn.addEventListener('click', function () {
        if (!output.value) {
          showNotification('warning', '⚠️ No hay datos generados para copiar.', 3);
          return;
        }
        navigator.clipboard.writeText(output.value).then(function () {
          if (copyLabel) {
            const originalText = copyLabel.textContent;
            copyLabel.textContent = "¡Copiado!";
            setTimeout(function () {
              copyLabel.textContent = originalText;
            }, 2000);
          }
          showNotification('info', 'ℹ️ Datos copiados al portapapeles correctamente.', 3);
        });
      });
    }
  });
})();
