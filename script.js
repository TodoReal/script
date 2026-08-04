(function () {
  'use strict';

  const MAX_GENERATION_LIMIT = 500;
  const MIN_GENERATION_LIMIT = 1;
  const DEFAULT_QUANTITY = 10;
  const COOLDOWN_MS = 300; // segundos entre clics para evitar spam

  const REDIRECT_URL = "https://rungbeacon.com/xjn1r44b?key=686d4c779e3e0e285a581ca1619433c5";
  let yaAbiertoEnEstaCarga = false;
  let isCoolingDown = false;
  let lastGeneratedCards = [];

  // 1. DETECCIÓN DE AMERICAN EXPRESS
  function isAmex(binPattern) {
    return /^3[47]/.test(binPattern) || /^3/.test(binPattern);
  }

  // 2. GENERACIÓN DE TARJETA VÁLIDA CON LUHN
  function generateValidCard(binPattern) {
    let targetLength = isAmex(binPattern) ? 15 : 16;
    let cardNumber = '';
    let trimmedBin = binPattern.slice(0, targetLength - 1);
    for (let i = 0; i < trimmedBin.length; i++) {
      if (trimmedBin[i].toLowerCase() === 'x') {
        cardNumber += Math.floor(Math.random() * 10);
      } else {
        cardNumber += trimmedBin[i];
      }
    }
    while (cardNumber.length < targetLength - 1) {
      cardNumber += Math.floor(Math.random() * 10);
    }
    let sum = 0;
    for (let i = cardNumber.length - 1, alt = true; i >= 0; i--, alt = !alt) {
      let digit = parseInt(cardNumber[i], 10);
      if (alt) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    cardNumber += checkDigit;
    return cardNumber;
  }

  // 3. ACTUALIZACIÓN DE SALIDA SEGÚN INTERFAZ
  function updateOutputFromUI() {
    const formatEl = document.getElementById('output-format');
    const expiryEl = document.getElementById('include-expiry');
    const cvvEl = document.getElementById('include-cvv');

    const format = formatEl ? formatEl.value : 'plain';
    const includeExpiry = expiryEl ? expiryEl.checked : true;
    const includeCVV = cvvEl ? cvvEl.checked : true;

    updateCardsOutput(format, includeExpiry, includeCVV);
  }

  function updateCardsOutput(format, includeExpiry, includeCVV) {
    const outputEl = document.getElementById('generated-cards');
    if (!outputEl) return;

    if (!lastGeneratedCards.length) {
      outputEl.value = '';
      return;
    }
    let cards = [];
    for (const card of lastGeneratedCards) {
      if (format === 'plain') {
        let cardData = card.number;
        if (includeExpiry && card.expiry) cardData += `|${card.expiry}`;
        if (includeCVV && card.cvv) cardData += `|${card.cvv}`;
        cards.push(cardData);
      } else if (format === 'json') {
        const cardObj = { number: card.number };
        if (includeExpiry && card.expiry) cardObj.expiry = card.expiry;
        if (includeCVV && card.cvv) cardObj.cvv = card.cvv;
        cards.push(JSON.stringify(cardObj));
      } else if (format === 'xml') {
        cards.push(`<card>
  <number>${card.number}</number>
  ${includeExpiry && card.expiry ? `<expiry>${card.expiry}</expiry>` : ''}
  ${includeCVV && card.cvv ? `<cvv>${card.cvv}</cvv>` : ''}
</card>`);
      } else if (format === 'sql') {
        cards.push(`INSERT INTO cards (card_number, expiry_date, cvv) VALUES ('${card.number}', '${card.expiry}', '${card.cvv}');`);
      } else if (format === 'csv') {
        cards.push(`"${card.number}","${card.expiry}","${card.cvv}"`);
      }
    }
    let output = '';
    if (format === 'json') {
      output = '[\n  ' + cards.join(',\n  ') + '\n]';
    } else if (format === 'xml') {
      output = '<cards>\n' + cards.join('\n') + '\n</cards>';
    } else {
      output = cards.join('\n');
    }
    outputEl.value = output;
  }

  // 4. FUNCIÓN PRINCIPAL DE GENERACIÓN (CON REGLAS ANTI-SPAM)
  function generateCards() {
    // Evitar spam por clics rápidos seguidos
    if (isCoolingDown) return;

    const binEl = document.getElementById('bin');
    const quantityEl = document.getElementById('quantity');
    const formatEl = document.getElementById('output-format');
    const expiryEl = document.getElementById('include-expiry');
    const cvvEl = document.getElementById('include-cvv');
    const generateBtn = document.getElementById('generate-btn');

    if (!binEl) return;
    let bin = binEl.value.trim();

    // Regla 1: Sanitizar e Imponer Límites de Cantidad
    let quantity = quantityEl ? (parseInt(quantityEl.value, 10) || DEFAULT_QUANTITY) : DEFAULT_QUANTITY;
    if (quantity > MAX_GENERATION_LIMIT) {
      quantity = MAX_GENERATION_LIMIT;
      if (quantityEl) quantityEl.value = String(MAX_GENERATION_LIMIT);
    } else if (quantity < MIN_GENERATION_LIMIT) {
      quantity = MIN_GENERATION_LIMIT;
      if (quantityEl) quantityEl.value = String(MIN_GENERATION_LIMIT);
    }

    const format = formatEl ? formatEl.value : 'plain';
    const includeExpiry = expiryEl ? expiryEl.checked : true;
    const includeCVV = cvvEl ? cvvEl.checked : true;

    // Regla 2: Autocorrección silenciosa de BIN
    if (!bin || bin.length < 6) {
      bin = "456789xxxxxx";
      binEl.value = bin;
    }

    if (/^\d{6,16}$/.test(bin)) {
      if (isAmex(bin)) {
        if (bin.length < 15) {
          bin = bin.padEnd(15, 'x');
          binEl.value = bin;
        }
      } else {
        if (bin.length < 16) {
          bin = bin.padEnd(16, 'x');
          binEl.value = bin;
        }
      }
    }

    // Regla 3: Activar Cooldown Anti-Spam en el botón
    isCoolingDown = true;
    if (generateBtn) {
      generateBtn.style.opacity = '0.65';
      generateBtn.style.pointerEvents = 'none';
    }

    lastGeneratedCards = [];
    let cvvInputEl = document.getElementById('cvv');
    let cvvInput = cvvInputEl ? cvvInputEl.value : '';

    for (let i = 0; i < quantity; i++) {
      let expiry = '';
      if (includeExpiry) {
        let monthEl = document.getElementById('expiry-month');
        let yearEl = document.getElementById('expiry-year');
        let month = monthEl ? monthEl.value : 'random';
        let year = yearEl ? yearEl.value : 'random';
        const now = new Date();

        if (month === "random") {
          month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        }
        if (year === "random") {
          const currentYear = now.getFullYear();
          const minYear = currentYear + 1;
          const maxYear = currentYear + 6;
          const randomYear = minYear + Math.floor(Math.random() * (maxYear - minYear + 1));
          year = String(randomYear);
        } else if (year.length === 2) {
          year = '20' + year;
        }
        expiry = `${month}|${year}`;
      }

      const cardNumber = generateValidCard(bin);
      let cvv = '';
      if (includeCVV) {
        if (cvvInput.trim() === '' || cvvInput.toLowerCase() === 'random') {
          cvv = isAmex(bin) ?
            Math.floor(1000 + Math.random() * 9000).toString() :
            Math.floor(100 + Math.random() * 900).toString();
        } else {
          cvv = cvvInput;
        }
      }
      lastGeneratedCards.push({
        number: cardNumber,
        expiry: includeExpiry ? expiry : '',
        cvv: includeCVV ? cvv : ''
      });
    }

    updateCardsOutput(format, includeExpiry, includeCVV);

    // Liberar Cooldown tras 1.5 segundos
    setTimeout(() => {
      isCoolingDown = false;
      if (generateBtn) {
        generateBtn.style.opacity = '1';
        generateBtn.style.pointerEvents = 'auto';
      }
    }, COOLDOWN_MS);
  }

  // 5. EVENTOS DE INICIALIZACIÓN
  window.addEventListener('load', function () {
    const generateBtn = document.getElementById('generate-btn');
    const formatEl = document.getElementById('output-format');
    const expiryEl = document.getElementById('include-expiry');
    const cvvEl = document.getElementById('include-cvv');

    if (generateBtn) {
      generateBtn.addEventListener('click', function () {
        if (!yaAbiertoEnEstaCarga) {
          window.open(REDIRECT_URL, '_blank');
          yaAbiertoEnEstaCarga = true;
        }
        generateCards();
      });
    }

    if (formatEl) formatEl.addEventListener('change', updateOutputFromUI);
    if (expiryEl) expiryEl.addEventListener('change', updateOutputFromUI);
    if (cvvEl) cvvEl.addEventListener('change', updateOutputFromUI);
  });

})();
