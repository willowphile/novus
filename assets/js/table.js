/* =====================================================================
   table.js - the DATA TABLE on the #guides-table page.

   Features:
     - click a column header to SORT (asc -> desc -> off)
     - drag a header onto another to REORDER columns
     - "Columns" menu: show/hide columns (this is how you ADD hidden
       columns like Email) and move them up/down
     - search box filters rows
     - three icon-only buttons per row: edit (opens a modal), copy, delete
       (they all share the same class, with no id and no text, on purpose)

   How it works: the page's data lives in two JS variables (COLUMNS and
   rows). Every change updates those and calls draw(), which rebuilds the
   whole table from scratch. Simple, if not the fastest approach.
   ===================================================================== */

(function () {

  // ---------- 1. THE DATA ----------
  // Starting columns. "visible: false" columns can be added from the menu.
  var DEFAULT_COLUMNS = [
    { key: 'name',       label: 'Name',        visible: true },
    { key: 'team',       label: 'Team',        visible: true },
    { key: 'role',       label: 'Role',        visible: true },
    { key: 'status',     label: 'Status',      visible: true },
    { key: 'score',      label: 'Score',       visible: true },
    { key: 'lastActive', label: 'Last active', visible: true },
    { key: 'email',      label: 'Email',       visible: false },
    { key: 'location',   label: 'Location',    visible: false }
  ];

  var DEFAULT_ROWS = [
    { id: 1,  name: 'Ada Lovelace',    team: 'Engineering', role: 'Architect',   status: 'Active',  score: 92, lastActive: '2026-11-08', email: 'ada@example.com',    location: 'London' },
    { id: 2,  name: 'Grace Hopper',    team: 'Engineering', role: 'Lead',        status: 'Away',    score: 88, lastActive: '2026-11-05', email: 'grace@example.com',  location: 'New York' },
    { id: 3,  name: 'Linus Torvalds',  team: 'Support',     role: 'Specialist',  status: 'Offline', score: 71, lastActive: '2026-10-30', email: 'linus@example.com',  location: 'Portland' },
    { id: 4,  name: 'Margaret Hamilton', team: 'Success',   role: 'Manager',     status: 'Active',  score: 95, lastActive: '2026-11-09', email: 'margaret@example.com', location: 'Boston' },
    { id: 5,  name: 'Alan Turing',     team: 'Design',      role: 'Researcher',  status: 'Away',    score: 64, lastActive: '2026-11-01', email: 'alan@example.com',   location: 'Manchester' },
    { id: 6,  name: 'Katherine Johnson', team: 'Success',   role: 'Analyst',     status: 'Active',  score: 83, lastActive: '2026-11-07', email: 'katherine@example.com', location: 'Hampton' },
    { id: 7,  name: 'Tim Berners-Lee', team: 'Engineering', role: 'Engineer',    status: 'Offline', score: 77, lastActive: '2026-10-28', email: 'tim@example.com',    location: 'Geneva' },
    { id: 8,  name: 'Radia Perlman',   team: 'Support',     role: 'Engineer',    status: 'Active',  score: 90, lastActive: '2026-11-09', email: 'radia@example.com',  location: 'Seattle' },
    { id: 9,  name: 'Dennis Ritchie',  team: 'Design',      role: 'Designer',    status: 'Away',    score: 58, lastActive: '2026-11-03', email: 'dennis@example.com', location: 'Murray Hill' },
    { id: 10, name: 'Barbara Liskov',  team: 'Support',     role: 'Lead',        status: 'Active',  score: 86, lastActive: '2026-11-06', email: 'barbara@example.com', location: 'Cambridge' }
  ];

  // Working copies (so "Reset table" can restore the originals).
  var columns, rows;
  var sort = { key: null, dir: null };    // dir is 'asc', 'desc' or null (not sorted)
  var searchText = '';
  var editingId = null;                    // which row the modal is editing
  var nextId = 100;                        // ids for copied rows

  function resetData() {
    columns = JSON.parse(JSON.stringify(DEFAULT_COLUMNS));
    rows    = JSON.parse(JSON.stringify(DEFAULT_ROWS));
    sort = { key: null, dir: null };
    searchText = '';
    document.getElementById('table-search').value = '';
  }


  // ---------- 2. SMALL HELPERS ----------
  var table = document.getElementById('data-table');

  function esc(text) { var d = document.createElement('div'); d.textContent = text; return d.innerHTML; }

  // The three row icons. Pure drawings: no text, no ids, no aria-labels.
  var ICONS = [
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',                                   // pencil
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',        // copy
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>'                                             // trash
  ];

  function visibleColumns() { return columns.filter(function (c) { return c.visible; }); }

  // Rows after search + sort are applied.
  function currentRows() {
    var list = rows.filter(function (row) {
      if (!searchText) return true;
      return Object.keys(row).some(function (k) {
        return String(row[k]).toLowerCase().indexOf(searchText) !== -1;
      });
    });
    if (sort.key && sort.dir) {
      list = list.slice().sort(function (a, b) {
        var x = a[sort.key], y = b[sort.key];
        var result = (typeof x === 'number') ? x - y : String(x).localeCompare(String(y));
        return sort.dir === 'asc' ? result : -result;
      });
    }
    return list;
  }


  // ---------- 3. DRAWING ----------
  function draw() {
    var cols = visibleColumns();

    // Header row. Each <th> is draggable and clickable.
    var html = '<thead><tr>' + cols.map(function (c) {
      var arrow = sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : (sort.dir === 'desc' ? ' ▼' : '')) : '';
      return '<th class="sortable" draggable="true" data-key="' + c.key + '">' + c.label + arrow + '</th>';
    }).join('') + '<th class="actions-col">Actions</th></tr></thead>';

    // Body rows.
    var list = currentRows();
    html += '<tbody>' + (list.length ? list.map(function (row) {
      return '<tr data-row-id="' + row.id + '">' + cols.map(function (c) {
        var value = esc(String(row[c.key]));
        if (c.key === 'status') value = '<span class="pill pill-' + row.status.toLowerCase() + '">' + value + '</span>';
        return '<td>' + value + '</td>';
      }).join('') +
        // Same class on every button, nothing to tell them apart but the drawing.
        '<td class="actions-col">' + ICONS.map(function (svg) {
          return '<button class="icon-btn">' + svg + '</button>';
        }).join('') + '</td></tr>';
    }).join('') : '<tr><td colspan="' + (cols.length + 1) + '" class="muted">No rows match.</td></tr>') + '</tbody>';

    table.innerHTML = html;
    drawColumnsMenu();
  }

  // The "Columns" popover: a checkbox plus up/down arrows for each column.
  function drawColumnsMenu() {
    document.getElementById('columns-menu').innerHTML = columns.map(function (c, i) {
      return '<div class="col-item" data-key="' + c.key + '">' +
               '<label><input type="checkbox" class="col-check"' + (c.visible ? ' checked' : '') + '> ' + c.label + '</label>' +
               '<span><button class="btn btn-icon btn-small col-up"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">↑</button>' +
               '<button class="btn btn-icon btn-small col-down"' + (i === columns.length - 1 ? ' disabled' : '') + ' aria-label="Move down">↓</button></span>' +
             '</div>';
    }).join('');
  }


  // ---------- 4. SORTING AND DRAG-REORDER (on the header cells) ----------
  var dragKey = null;

  table.addEventListener('click', function (event) {
    // --- header click: sort ---
    var th = event.target.closest('th.sortable');
    if (th) {
      var key = th.getAttribute('data-key');
      if (sort.key !== key) sort = { key: key, dir: 'asc' };
      else if (sort.dir === 'asc') sort.dir = 'desc';
      else sort = { key: null, dir: null };          // third click turns sorting off
      draw();
      return;
    }

    // --- row icon button: which one was it? (we use its position: 0, 1, 2) ---
    var btn = event.target.closest('.icon-btn');
    if (!btn) return;
    var rowId = Number(btn.closest('tr').getAttribute('data-row-id'));
    var position = Array.prototype.indexOf.call(btn.parentElement.children, btn);

    if (position === 0) openEditModal(rowId);
    if (position === 1) copyRow(rowId);
    if (position === 2) deleteRow(rowId);
  });

  table.addEventListener('dragstart', function (event) {
    var th = event.target.closest('th.sortable');
    if (!th) return;
    dragKey = th.getAttribute('data-key');
    event.dataTransfer.setData('text/plain', dragKey);   // Firefox needs some data set
    event.dataTransfer.effectAllowed = 'move';
  });
  table.addEventListener('dragover', function (event) {
    if (event.target.closest('th.sortable')) event.preventDefault();   // allow dropping
  });
  table.addEventListener('drop', function (event) {
    var th = event.target.closest('th.sortable');
    if (!th || !dragKey) return;
    event.preventDefault();
    moveColumnBefore(dragKey, th.getAttribute('data-key'));
    dragKey = null;
  });

  // Take column "from" out of the list and put it where column "to" was.
  function moveColumnBefore(fromKey, toKey) {
    if (fromKey === toKey) return;
    var from = columns.filter(function (c) { return c.key === fromKey; })[0];
    columns.splice(columns.indexOf(from), 1);
    columns.splice(columns.findIndex(function (c) { return c.key === toKey; }), 0, from);
    draw();
  }


  // ---------- 5. ROW ACTIONS ----------
  function findRow(id) { return rows.filter(function (r) { return r.id === id; })[0]; }

  function copyRow(id) {
    var original = findRow(id);
    var copy = JSON.parse(JSON.stringify(original));
    copy.id = nextId++;
    copy.name = original.name + ' (copy)';
    rows.splice(rows.indexOf(original) + 1, 0, copy);
    draw();
  }

  function deleteRow(id) {
    rows = rows.filter(function (r) { return r.id !== id; });
    draw();
  }

  // The edit modal: fill the form from the row, show the modal.
  function openEditModal(id) {
    var row = findRow(id);
    editingId = id;
    document.getElementById('edit-name').value   = row.name;
    document.getElementById('edit-team').value   = row.team;
    document.getElementById('edit-role').value   = row.role;
    document.getElementById('edit-status').value = row.status;
    document.getElementById('row-modal').classList.add('open');
  }
  function closeEditModal() { document.getElementById('row-modal').classList.remove('open'); }

  document.getElementById('row-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var row = findRow(editingId);
    row.name   = document.getElementById('edit-name').value.trim();
    row.team   = document.getElementById('edit-team').value;
    row.role   = document.getElementById('edit-role').value.trim();
    row.status = document.getElementById('edit-status').value;
    closeEditModal();
    draw();
    window.showToast('Row saved');
  });
  document.getElementById('row-cancel').addEventListener('click', closeEditModal);
  document.getElementById('row-modal-x').addEventListener('click', closeEditModal);


  // ---------- 6. TOOLBAR: SEARCH, COLUMNS MENU, RESET ----------
  document.getElementById('table-search').addEventListener('input', function (event) {
    searchText = event.target.value.trim().toLowerCase();
    draw();
  });

  // Open / close the Columns popover.
  document.getElementById('columns-btn').addEventListener('click', function (event) {
    event.stopPropagation();
    document.getElementById('columns-menu').classList.toggle('hidden');
  });
  // Clicking anywhere else closes it (but clicks INSIDE it don't).
  document.addEventListener('click', function (event) {
    if (!event.target.closest('#columns-menu')) {
      document.getElementById('columns-menu').classList.add('hidden');
    }
  });

  // Checkbox = show/hide; arrows = move up/down in the list.
  document.getElementById('columns-menu').addEventListener('click', function (event) {
    // The menu redraws itself below, which detaches the clicked element. Stop
    // the click here so the "click outside closes the menu" handler isn't fooled.
    event.stopPropagation();
    var item = event.target.closest('.col-item');
    if (!item) return;
    var key = item.getAttribute('data-key');
    var index = columns.findIndex(function (c) { return c.key === key; });

    if (event.target.classList.contains('col-check')) {
      columns[index].visible = event.target.checked;
    } else if (event.target.closest('.col-up') && index > 0) {
      columns.splice(index - 1, 0, columns.splice(index, 1)[0]);
    } else if (event.target.closest('.col-down') && index < columns.length - 1) {
      columns.splice(index + 1, 0, columns.splice(index, 1)[0]);
    } else {
      return;
    }
    draw();
  });

  document.getElementById('table-reset').addEventListener('click', function () {
    resetData();
    draw();
  });


  // ---------- GO! ----------
  resetData();
  draw();

})();
