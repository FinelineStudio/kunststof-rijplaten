/* Hamburgermenu voor smalle schermen.
   Zonder JavaScript blijft de knop verborgen en is het menu een horizontale
   rij die opzij scrollt. */
(function () {
  var kop = document.querySelector('.kop');
  var knop = document.querySelector('.menuknop');
  var menu = document.getElementById('hoofdmenu');
  if (!kop || !knop || !menu) return;

  knop.hidden = false;
  kop.classList.add('kop--js');

  function zet(open) {
    kop.classList.toggle('kop--open', open);
    knop.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  knop.addEventListener('click', function () {
    zet(knop.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && kop.classList.contains('kop--open')) {
      zet(false);
      knop.focus();
    }
  });

  // Breder scherm: menu staat altijd zichtbaar, dus de open-stand vergeten.
  var breed = window.matchMedia('(min-width: 640px)');
  var reset = function (e) { if (e.matches) zet(false); };
  if (breed.addEventListener) breed.addEventListener('change', reset);
})();
