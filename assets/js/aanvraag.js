// Aanvraagformulier: eerst kiezen tussen particulier en zakelijk, daarna het
// bijbehorende formulier. Verstuur via Formspree en ga daarna naar de eigen
// bedankpagina. Zonder JavaScript post het formulier gewoon naar Formspree.
(function () {
  var formulieren = document.querySelectorAll('.aanvraag-formulier');
  if (!formulieren.length) return;

  function datumTekst(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function dagenVanaf(n) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
  }
  // Werkdagen (ma–vr) tussen twee datums, eerste en laatste dag meegeteld.
  function werkdagen(begin, eind) {
    var d = new Date(begin + 'T12:00:00');
    var e = new Date(eind + 'T12:00:00');
    var aantal = 0;
    while (d <= e) {
      if (d.getDay() !== 0 && d.getDay() !== 6) aantal++;
      d.setDate(d.getDate() + 1);
    }
    return aantal;
  }

  // Koppel de foutmelding aan het veld zolang het veld ongeldig is.
  function markeer(veld, ongeldig) {
    var melding = veld.dataset.fout ? document.getElementById(veld.dataset.fout) : veld.parentNode.querySelector('.fout');
    if (!melding || !melding.id) return;
    var ids = (veld.getAttribute('aria-describedby') || '').split(' ').filter(function (id) {
      return id && id !== melding.id;
    });
    if (ongeldig) {
      veld.setAttribute('aria-invalid', 'true');
      ids.unshift(melding.id);
    } else {
      veld.removeAttribute('aria-invalid');
    }
    if (ids.length) veld.setAttribute('aria-describedby', ids.join(' '));
    else veld.removeAttribute('aria-describedby');
  }

  function richIn(form) {
    var fout = form.querySelector('.verzend-fout');
    var knop = form.querySelector('button[type="submit"]');
    var bezig = false;

    // Velden in een verborgen blok niet valideren en niet versturen.
    function bijwerkenBlokken() {
      var blokken = form.querySelectorAll('.alleen-bij');
      for (var i = 0; i < blokken.length; i++) {
        var verborgen = getComputedStyle(blokken[i]).display === 'none';
        var velden = blokken[i].querySelectorAll('input, textarea, select');
        for (var j = 0; j < velden.length; j++) {
          velden[j].disabled = verborgen;
          if (verborgen) markeer(velden[j], false);
        }
      }
    }

    // Periode: ingangsdatum vanaf vandaag, einddatum (optioneel) minimaal vijf werkdagen.
    var van = form.querySelector('input[name="ingangsdatum"]');
    var tot = form.querySelector('input[name="verwachte_einddatum"]');
    function controleerPeriode() {
      tot.min = van.value || datumTekst(new Date());
      var teKort = van.value && tot.value && werkdagen(van.value, tot.value) < 5;
      tot.setCustomValidity(teKort ? 'U huurt minimaal vijf werkdagen.' : '');
    }
    van.min = datumTekst(new Date());

    // Herroepingsrecht (alleen particulier): begint de huur binnen 14 dagen,
    // dan moet de huurder daar uitdrukkelijk om vragen.
    var herroepBlok = form.querySelector('.herroeping');
    var herroep = herroepBlok && herroepBlok.querySelector('input');
    function controleerHerroeping() {
      if (!herroepBlok) return;
      var binnen = !!van.value && new Date(van.value + 'T12:00:00') < dagenVanaf(14);
      herroepBlok.hidden = !binnen;
      herroep.disabled = !binnen;
      herroep.required = binnen;
      if (!binnen) markeer(herroep, false);
    }

    // Minimaal één aantal groter dan 0, of advies gevraagd.
    var aantallen = form.querySelectorAll('.aantallen input');
    var advies = form.querySelector('input[name="advies"]');
    function controleerAantal() {
      var totaal = 0;
      var teVeel = false;
      for (var i = 0; i < aantallen.length; i++) {
        var n = parseInt(aantallen[i].value, 10) || 0;
        totaal += n;
        if (n > 500 || n < 0) teVeel = true;
      }
      var goed = !teVeel && (totaal > 0 || advies.checked);
      aantallen[0].setCustomValidity(goed ? '' : 'Vul een aantal in of vraag om advies.');
      if (goed) markeer(aantallen[0], false);
    }

    function alles() {
      controleerPeriode();
      controleerHerroeping();
      controleerAantal();
    }

    form.addEventListener('invalid', function (e) { markeer(e.target, true); }, true);
    form.addEventListener('change', function (e) {
      alles();
      if (e.target.willValidate) markeer(e.target, !e.target.checkValidity());
      bijwerkenBlokken();
    });
    form.addEventListener('input', function (e) {
      alles();
      if (e.target.validity && e.target.validity.valid) markeer(e.target, false);
    });
    alles();
    bijwerkenBlokken();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (bezig) return;
      bezig = true;
      fout.hidden = true;
      knop.disabled = true;
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error(res.status);
        window.location.href = 'aanvraag-ontvangen.html';
      }).catch(function () {
        fout.hidden = false;
        knop.disabled = false;
        bezig = false;
      });
    });

    return bijwerkenBlokken;
  }

  var bijwerkers = [];
  for (var i = 0; i < formulieren.length; i++) bijwerkers.push(richIn(formulieren[i]));
  function bijwerkenAlles() {
    for (var i = 0; i < bijwerkers.length; i++) bijwerkers[i]();
  }

  // Keuze particulier of zakelijk. Het tonen gebeurt in CSS; hier alleen de
  // voorkeuze via #particulier of #zakelijk in de link, en de hash bijwerken.
  var typen = document.querySelectorAll('input[name="huurtype"]');
  function kiesVanuitHash() {
    var gekozen = document.getElementById('type-' + location.hash.slice(1));
    if (gekozen && gekozen.name === 'huurtype') {
      gekozen.checked = true;
      bijwerkenAlles();
    }
  }
  for (var t = 0; t < typen.length; t++) {
    typen[t].addEventListener('change', function () {
      if (history.replaceState) history.replaceState(null, '', '#' + this.value);
      bijwerkenAlles();
    });
  }
  window.addEventListener('hashchange', kiesVanuitHash);
  kiesVanuitHash();
})();
