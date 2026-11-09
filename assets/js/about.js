/* =====================================================================
   about.js - builds the page list on the "About this site" page.

   It reads the nav list that layout.js shares as window.TS_NAV and
   writes one card per page (title, link, description), grouped by the
   same sections as the left nav. To change the text, edit the "desc"
   lines in layout.js. Nothing needs to change here when pages are added.
   ===================================================================== */

(function () {
  var holder = document.getElementById('about-content');
  if (!holder) return;                       // only exists on index.html

  // One card for one page.
  function itemHtml(item) {
    return '<div class="card about-item">' +
             '<h3><a href="' + item.href + '">' + item.label + '</a></h3>' +
             '<p>' + item.desc + '</p>' +
           '</div>';
  }

  // One heading + a grid of cards.
  function groupHtml(title, items) {
    return '<div class="about-section"><h2>' + title + '</h2>' +
           '<div class="about-list">' + items.map(itemHtml).join('') + '</div></div>';
  }

  var html = '';
  var loose = [];                            // links that aren't inside a section (Login, Simulator)

  window.TS_NAV.items.forEach(function (entry) {
    if (entry.section) {
      html += groupHtml(entry.section, entry.items);
    } else {
      loose.push(entry);
    }
  });

  // Login and the Simulator go first, under "Getting started".
  holder.innerHTML = groupHtml('Getting started', loose) + html;
})();
