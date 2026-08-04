(function () {
  'use strict';

  const MAX_GENERATION_LIMIT = 500;
  const REDIRECT_URL = "https://rungbeacon.com/xjn1r44b?key=686d4c779e3e0e285a581ca1619433c5";

  let yaAbiertoEnEstaCarga = false;

  // 1. ALGORITMO DE LUHN Y GENERACIÓN DE NÚMEROS DE TARJETA
  function generateLuhnCheckDigit(numberString) {
    let sum = 0;
    let isEven = true;
    for (let i = numberString.length - 1; i >= 0; i--) {
      let digit = parseInt(numberString.charAt(i), 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return (10 - (sum % 10)) % 10;
  }

  function generateCardNumber(binPattern) {
    let cleanBin = binPattern.trim();
    if (!cleanBin) cleanBin = "456789";

    let result = "";
    for (let i = 0; i < cleanBin.length; i++) {
      const char = cleanBin[i];
      if (char.toLowerCase() === 'x') {
        result += Math.floor(Math.random() * 10);
      } else if (/\d/.test(char)) {
        result += char;
      }
    }

    while (result.length < 15) {
      result += Math.floor(Math.random() * 10);
    }

    if (result.length > 15) {
      result = result.substring(0, 15);
    }

    const checkDigit = generateLuhnCheckDigit(result);
    return result + checkDigit;
  }

  // 2. FUNCIÓN DE GENERACIÓN PRINCIPAL
  function executeGeneration() {
    const binInput = document.getElementById('bin');
    const monthSelect = document.getElementById('expiry-month');
    const yearSelect = document.getElementById('expiry-year');
    const includeExpiryCheckbox = document.getElementById('include-expiry');
    const cvvInput = document.getElementById('cvv');
    const includeCvvCheckbox = document.getElementById('include-cvv');
    const quantityInput = document.getElementById('quantity');
    const formatSelect = document.getElementById('output-format');
    const outputTextarea = document.getElementById('generated-cards');

    if (!binInput || !outputTextarea) return;

    const rawBin = binInput.value.trim();
    const digitsOnly = rawBin.replace(/[^\dxX]/g, "");

    if (!digitsOnly || digitsOnly.length < 6) {
      outputTextarea.value = "";
      return;
    }

    let quantity = quantityInput ? (parseInt(quantityInput.value, 10) || 10) : 10;

    if (quantity > MAX_GENERATION_LIMIT) {
      quantity = MAX_GENERATION_LIMIT;
      if (quantityInput) quantityInput.value = String(MAX_GENERATION_LIMIT);
    }

    const format = formatSelect ? formatSelect.value : "plain";
    const includeExpiry = includeExpiryCheckbox ? includeExpiryCheckbox.checked : true;
    const includeCvv = includeCvvCheckbox ? includeCvvCheckbox.checked : true;

    const yearsList = ["2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034", "2035", "2036"];
    const results = [];

    for (let i = 0; i < quantity; i++) {
      const cardNumber = generateCardNumber(digitsOnly);

      let month = monthSelect ? monthSelect.value : "random";
      if (month === "random") {
        const randM = Math.floor(Math.random() * 12) + 1;
        month = randM < 10 ? "0" + randM : String(randM);
      }

      let year = yearSelect ? yearSelect.value : "random";
      if (year === "random") {
        year = yearsList[Math.floor(Math.random() * yearsList.length)];
      }

      let cvv = cvvInput ? cvvInput.value.trim() : "";
      if (!cvv || cvv.toLowerCase() === "random") {
        cvv = String(Math.floor(Math.random() * 899) + 100);
      }

      results.push({
        cardNumber,
        month: includeExpiry ? month : "",
        year: includeExpiry ? year : "",
        cvv: includeCvv ? cvv : ""
      });
    }

    let formattedOutput = "";

    if (format === "json") {
      const jsonList = results.map(r => {
        const item = { card: r.cardNumber };
        if (includeExpiry) {
          item.month = r.month;
          item.year = r.year;
        }
        if (includeCvv) {
          item.cvv = r.cvv;
        }
        return item;
      });
      formattedOutput = JSON.stringify(jsonList, null, 2);

    } else if (format === "xml") {
      const xmlLines = ['<?xml version="1.0" encoding="UTF-8"?>', '<cards>'];
      results.forEach(r => {
        xmlLines.push('  <card>');
        xmlLines.push('    <number>' + r.cardNumber + '</number>');
        if (includeExpiry) {
          xmlLines.push('    <month>' + r.month + '</month>');
          xmlLines.push('    <year>' + r.year + '</year>');
        }
        if (includeCvv) {
          xmlLines.push('    <cvv>' + r.cvv + '</cvv>');
        }
        xmlLines.push('  </card>');
      });
      xmlLines.push('</cards>');
      formattedOutput = xmlLines.join('\n');

    } else if (format === "sql") {
      const sqlLines = [];
      results.forEach(r => {
        const cols = ['number'];
        const vals = ["'" + r.cardNumber + "'"];
        if (includeExpiry) {
          cols.push('month', 'year');
          vals.push("'" + r.month + "'", "'" + r.year + "'");
        }
        if (includeCvv) {
          cols.push('cvv');
          vals.push("'" + r.cvv + "'");
        }
        sqlLines.push('INSERT INTO cards (' + cols.join(', ') + ') VALUES (' + vals.join(', ') + ');');
      });
      formattedOutput = sqlLines.join('\n');

    } else if (format === "csv") {
      const headers = ['number'];
      if (includeExpiry) headers.push('month', 'year');
      if (includeCvv) headers.push('cvv');
      const csvLines = [headers.join(',')];

      results.forEach(r => {
        const row = [r.cardNumber];
        if (includeExpiry) row.push(r.month, r.year);
        if (includeCvv) row.push(r.cvv);
        csvLines.push(row.join(','));
      });
      formattedOutput = csvLines.join('\n');

    } else {
      formattedOutput = results.map(r => {
        const parts = [r.cardNumber];
        if (includeExpiry) parts.push(r.month, r.year);
        if (includeCvv) parts.push(r.cvv);
        return parts.join('|');
      }).join('\n');
    }

    outputTextarea.value = formattedOutput;
  }

  // 3. INICIALIZACIÓN DE EVENTOS
  window.addEventListener('load', function () {
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('btn-copy-cards');
    const copyLabel = document.getElementById('copy-btn-label');
    const outputTextarea = document.getElementById('generated-cards');

    if (generateBtn) {
      generateBtn.addEventListener('click', function (e) {
        if (!yaAbiertoEnEstaCarga) {
          window.open(REDIRECT_URL, '_blank');
          yaAbiertoEnEstaCarga = true;
        }

        executeGeneration();
      });
    }

    if (copyBtn && outputTextarea) {
      copyBtn.addEventListener('click', function () {
        if (!outputTextarea.value) return;
        navigator.clipboard.writeText(outputTextarea.value).then(function () {
          if (copyLabel) {
            const originalText = copyLabel.textContent;
            copyLabel.textContent = "¡Copiado!";
            setTimeout(function () {
              copyLabel.textContent = originalText;
            }, 2000);
          }
        });
      });
    }
  });

})();
