let data = [];
let galleryManifest = {};


Promise.all([
  fetch("ToolList.json").then((response) => response.json()),
  fetch("gallery-manifest.json").then((response) => response.json()),
])
  .then(([toolListData, manifestData]) => {
    data = toolListData;
    galleryManifest = manifestData;
    initializeListeners();
    render(); //default
    alignTableBody();
    window.addEventListener("resize", alignTableBody);
    //expandAll();
    //enterDetailView("10", "C_TI_026"); // TEMP: default to this subitem view for dev
  })
  .catch((error) => console.error("Error loading data:", error));

let currentSort = { key: "number", order: "desc" };
let expandedGroups = new Set();
let activeGroup = null;
let detailView = null; 
let preDetailState = null; 

function flattenSubitems() {
  const groups = [...data].sort((a, b) =>
    parseInt(a.number, 10) > parseInt(b.number, 10) ? 1 : -1,
  );
  const flat = [];
  groups.forEach((g) =>
    g.subitems.forEach((item) => flat.push({ groupKey: g.number, item })),
  );
  return flat;
}

function getFolderName(row) {
  const numberEl = row.querySelector(".column:nth-child(2)");
  if (!numberEl) return null;
  return numberEl.textContent.trim().replace(/[\[\]]/g, "");
}

function render() {
  const body = document.getElementById("table-body");
  if (!body) return;

  const tableView = document.getElementById("table-view");
  if (tableView) {
    tableView.classList.toggle("has-active-group", !!activeGroup);
  }

  if (detailView) {
    const group = data.find((g) => g.number === detailView.groupKey);
    const item = group.subitems.find(
      (it) => it.number.trim() === detailView.itemNumber,
    );
    body.innerHTML =
      createGroupRow(group) +
      createRow(item, { isSubRow: true, group: group.number });
  } else {
    const groups = [...data].sort((a, b) => {
      const valA = parseInt(a.number, 10);
      const valB = parseInt(b.number, 10);
      const res = valA > valB ? 1 : -1;
      return currentSort.order === "asc" ? res : -res;
    });

    body.innerHTML = groups
      .map((group) => {
        let rowsHtml = createGroupRow(group);
        if (expandedGroups.has(group.number)) {
          const subitems =
            currentSort.order === "asc"
              ? group.subitems
              : [...group.subitems].reverse();
          rowsHtml += subitems
            .map((item) => createRow(item, { isSubRow: true, group: group.number }))
            .join("");
        }
        return rowsHtml;
      })
      .join("");
  }

  const filterBtn = document.getElementById("filter-btn");
  if (filterBtn) {
    filterBtn.textContent = detailView
      ? "Return"
      : expandedGroups.size > 0
        ? "Collapse"
        : "Expand";
  }

  if (detailView) {
    const flat = flattenSubitems();
    const idx = flat.findIndex(
      (f) =>
        f.groupKey === detailView.groupKey &&
        f.item.number.trim() === detailView.itemNumber,
    );
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    if (prevBtn) prevBtn.classList.toggle("disabled", idx <= 0);
    if (nextBtn) nextBtn.classList.toggle("disabled", idx === -1 || idx >= flat.length - 1);
  }

  const overlay = document.getElementById("hover-image-overlay");
  const overlayImg = document.getElementById("hover-image");

  document.querySelectorAll(".ui-data-table-row").forEach((row) => {
    if (row.classList.contains("--header")) return;

    if (!detailView) {
      row.addEventListener("mouseenter", () => {
        const statusEl = row.querySelector(".status-abbr");
        if (statusEl) {
          statusEl.textContent = statusEl.dataset.full;
        }

        const numberEl = row.querySelector(".column:nth-child(2)");
        if (numberEl) {
          const match = numberEl.textContent.trim().match(/(\d{3})(?:\D|$)/);
          if (match) {
            const imgPath = `images/${match[1]}.png`;
            overlayImg.src = imgPath;
            overlayImg.onload = () => overlay.classList.add("visible");
            overlayImg.onerror = () => overlay.classList.remove("visible");
          }
        }
      });
      row.addEventListener("mouseleave", () => {
        const statusEl = row.querySelector(".status-abbr");
        if (statusEl) {
          statusEl.textContent = statusEl.dataset.full.charAt(0);
        }
        overlay.classList.remove("visible");
      });
    }

    if (detailView) {
    } else if (row.classList.contains("sub-row")) {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".open-tool-link")) return;
        enterDetailView(row.dataset.group, row.dataset.number);
      });
      row.style.cursor = "pointer";
    } else {
      row.addEventListener("click", () => {
        const groupKey = row.dataset.group;
        if (groupKey) {
          expandGroup(groupKey);
        }
      });
      row.style.cursor = "pointer";
    }
  });
}

function createRow(item, { isSubRow, group }) {
  let rowClass = "ui-data-table-row grid-system";
  if (isSubRow) rowClass += " sub-row";
  if (group === activeGroup) rowClass += " active-group";
  const folderName = `${group}${item.number.replace(/\s/g, "")}`;
  return `
    <div class="${rowClass}" data-group="${group}" data-number="${item.number.replace(/[\[\]]/g, "")}">
      <div class="column col-span-1">
        <a class="open-tool-link" href="subsites/${folderName}/" target="_blank" rel="noopener" aria-label="Open tool">&#8594;</a>
      </div>
      <div class="column col-span-2 num">${item.number}</div>
      <div class="column col-span-2 num">${item.date}</div>
      <div class="column col-span-6">
        <span class="marquee-inner">${item.title}</span>
      </div>
      <div class="column col-span-4 ui-marquee">${item.typology}</div>
      <div class="column col-span-5">${item.interactions}</div>
      <div class="column col-span-3" ui-marquee>${item.convolutes}</div>
      <div class="column col-span-1 status-abbr" data-full="${item.status}">${item.status.charAt(0)}</div>
    </div>
  `;
}

function createGroupRow(group) {
  let rowClass = "ui-data-table-row grid-system";
  if (group.number === activeGroup) rowClass += " active-group";
  const status = group.status || "";
  return `
    <div class="${rowClass}" data-group="${group.number}">
      <div class="column col-span-1"></div>
      <div class="column col-span-2 num">${group.number}</div>
      <div class="column col-span-2 num">${group.date || ""}</div>
      <div class="column col-span-6">
        <span class="marquee-inner">${group.title || ""}</span>
      </div>
      <div class="column col-span-4 ui-marquee">${group.typology || ""}</div>
      <div class="column col-span-5">${group.interactions || ""}</div>
      <div class="column col-span-3" ui-marquee>${group.convolutes || ""}</div>
      <div class="column col-span-1 status-abbr" data-full="${status}">${status.charAt(0)}</div>
    </div>
  `;
}

function expandGroup(groupKey) {
  if (groupKey === activeGroup) {
    expandedGroups.delete(groupKey);
    activeGroup = null;

    document.getElementById("table-text").classList.remove("hidden");
    document.getElementById("gallery-text").classList.add("hidden");

    render();
    return;
  }

  activeGroup = groupKey;
  expandedGroups.add(groupKey);

  const group = data.find((g) => g.number === groupKey);
  document.getElementById("table-text").classList.add("hidden");
  document.getElementById("gallery-text").classList.remove("hidden");
  document.querySelector("#gallery-text p").textContent = group
    ? group.text
    : "";

  render();
}

function alignDetailImageGrid() {
  const tableBody = document.getElementById("table-body");
  if (!tableBody) return;
  const top = tableBody.getBoundingClientRect().top;
  document.documentElement.style.setProperty("--detail-grid-top", `${top}px`);
}

function alignTableBody() {
  const tableBody = document.getElementById("table-body");
  if (!tableBody) return;
  const top = tableBody.getBoundingClientRect().top;
  document.documentElement.style.setProperty("--table-body-top", `${top}px`);
}

function enterDetailView(groupKey, itemNumber) {
  if (detailView) return;
  preDetailState = {
    expandedGroups: new Set(expandedGroups),
    activeGroup,
  };
  detailView = { groupKey, itemNumber: itemNumber.trim() };

  const group = data.find((g) => g.number === groupKey);
  document.getElementById("table-text").classList.add("hidden");
  document.getElementById("gallery-text").classList.remove("hidden");
  document.querySelector("#gallery-text p").textContent = group
    ? group.text
    : "";

  document.getElementById("table-view").classList.add("detail-mode");
  document.getElementById("prev-btn").textContent = "Previous";
  document.getElementById("prev-btn").style.cursor = "pointer";
  document.getElementById("next-btn").textContent = "Next";
  document.getElementById("next-btn").style.cursor = "pointer";
  document.body.classList.add("no-scroll");
  document.getElementById("hover-image-overlay").classList.remove("visible");

  loadDetailImages(`${groupKey}${itemNumber.trim()}`);
  render();
  alignDetailImageGrid();
  window.addEventListener("resize", alignDetailImageGrid);
  document.addEventListener("wheel", redirectScrollToDetailGrid, { passive: false });
}

function redirectScrollToDetailGrid(e) {
  const grid = document.getElementById("detail-image-grid");
  if (!grid) return;
  e.preventDefault();
  grid.scrollTop += e.deltaY;
}

function exitDetailView() {
  if (!detailView) return;
  detailView = null;

  if (preDetailState) {
    expandedGroups = new Set(preDetailState.expandedGroups);
    activeGroup = preDetailState.activeGroup;
  }

  document.getElementById("table-view").classList.remove("detail-mode");
  document.getElementById("prev-btn").textContent = "Tools";
  document.getElementById("prev-btn").style.cursor = "";
  document.getElementById("next-btn").textContent = "Context";
  document.getElementById("next-btn").style.cursor = "";
  document.body.classList.remove("no-scroll");
  document.getElementById("detail-image-grid").classList.add("hidden");
  document.getElementById("detail-image-grid").innerHTML = "";
  window.removeEventListener("resize", alignDetailImageGrid);
  document.removeEventListener("wheel", redirectScrollToDetailGrid);

  if (activeGroup) {
    const group = data.find((g) => g.number === activeGroup);
    document.getElementById("table-text").classList.add("hidden");
    document.getElementById("gallery-text").classList.remove("hidden");
    document.querySelector("#gallery-text p").textContent = group
      ? group.text
      : "";
  } else {
    document.getElementById("table-text").classList.remove("hidden");
    document.getElementById("gallery-text").classList.add("hidden");
  }

  render();
  preDetailState = null;
}

function navigateDetail(direction) {
  if (!detailView) return;
  const flat = flattenSubitems();
  const idx = flat.findIndex(
    (f) =>
      f.groupKey === detailView.groupKey &&
      f.item.number.trim() === detailView.itemNumber,
  );
  if (idx === -1) return;
  const nextIdx = idx + direction;
  if (nextIdx < 0 || nextIdx >= flat.length) return;

  const next = flat[nextIdx];
  detailView = { groupKey: next.groupKey, itemNumber: next.item.number.trim() };

  const group = data.find((g) => g.number === next.groupKey);
  document.querySelector("#gallery-text p").textContent = group
    ? group.text
    : "";

  loadDetailImages(`${next.groupKey}${next.item.number.trim()}`);
  render();
  alignDetailImageGrid();
}

function expandAll() {
  data.forEach((group) => expandedGroups.add(group.number));
  render();
}

function collapseGroup() {
  expandedGroups = new Set();
  activeGroup = null;

  document.getElementById("table-text").classList.remove("hidden");
  document.getElementById("gallery-text").classList.add("hidden");

  render();
}

function loadDetailImages(folderName) {
  const grid = document.getElementById("detail-image-grid");
  grid.innerHTML = "";
  grid.classList.remove("hidden");

  const imagesHeader = document.getElementById("images-header");
  if (imagesHeader) {
    imagesHeader.textContent = folderName === "03A_AC_006" ? "No Images" : "Images";
  }

  const overlay = document.getElementById("hover-image-overlay");
  const overlayImg = document.getElementById("hover-image");
  const overlayVideo = document.getElementById("hover-video");

  const groups = galleryManifest[folderName] || [];

  groups.forEach((group) => {
    const titleRow = document.createElement("div");
    titleRow.className = "detail-image-group-title";
    titleRow.textContent = group.title;
    grid.appendChild(titleRow);

    group.images.forEach((imageName) => {
      const src = `gallery/${folderName}/${group.folder}/${imageName}`;
      const isVideo = /\.mp4$/i.test(imageName);

      const cell = document.createElement("div");
      cell.className = "detail-image-cell";

      if (isVideo) {
        const video = document.createElement("video");
        video.src = src;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "metadata";
        cell.addEventListener("mouseenter", () => {
          overlayImg.classList.add("hidden");
          overlayVideo.classList.remove("hidden");
          overlayVideo.src = src;
          overlayVideo.play();
          overlay.classList.add("visible");
          grid.classList.add("hovering");
          cell.classList.add("hovered");
        });
        cell.addEventListener("mouseleave", () => {
          overlayVideo.pause();
          overlay.classList.remove("visible");
          grid.classList.remove("hovering");
          cell.classList.remove("hovered");
        });
        cell.appendChild(video);
      } else {
        const img = document.createElement("img");
        img.src = src;
        cell.addEventListener("mouseenter", () => {
          overlayVideo.pause();
          overlayVideo.classList.add("hidden");
          overlayImg.classList.remove("hidden");
          overlayImg.src = src;
          overlay.classList.add("visible");
          grid.classList.add("hovering");
          cell.classList.add("hovered");
        });
        cell.addEventListener("mouseleave", () => {
          overlay.classList.remove("visible");
          grid.classList.remove("hovering");
          cell.classList.remove("hovered");
        });
        cell.appendChild(img);
      }

      grid.appendChild(cell);
    });
  });
}

function initializeListeners() {
  document.querySelectorAll(".sortable").forEach((el) => {
    el.addEventListener("click", () => {
      if (detailView) return;
      const key = el.dataset.key;
      currentSort.order =
        currentSort.key === key && currentSort.order === "desc"
          ? "asc"
          : "desc";
      currentSort.key = key;

      document
        .querySelectorAll(".sortable")
        .forEach((h) => h.classList.remove("active"));
      el.classList.add("active");

      render();
    });
  });

  const filterBtn = document.getElementById("filter-btn");
  if (filterBtn) {
    filterBtn.addEventListener("click", () => {
      if (detailView) {
        exitDetailView();
      } else if (expandedGroups.size > 0) {
        collapseGroup();
      } else {
        expandAll();
      }
    });
  }

  const prevBtn = document.getElementById("prev-btn");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (detailView) navigateDetail(-1);
    });
  }
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (detailView) navigateDetail(1);
    });
  }


  const siteTitle = document.getElementById("site-title");
  if (siteTitle) {
    siteTitle.style.cursor = "pointer";
    siteTitle.addEventListener("click", () => {
      if (detailView) exitDetailView();
      activeGroup = null;
      document.getElementById("table-text").classList.remove("hidden");
      document.getElementById("gallery-text").classList.add("hidden");
      render();
    });
  }
}
