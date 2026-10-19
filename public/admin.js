"use strict";

const state = { settings: null, categories: [] };

const ui = {
  editingCategoryId: null,
  editingItemId: null,
  logoDataUrl: null,
  logoBusy: false,
  logoJob: 0,
  drag: null,
  loadSeq: 0,
  orderChain: Promise.resolve(),
};

const el = {};
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
// shortcut: measured on the data-URI string to stay under the server's 200,000-character limit; use decoded bytes if that limit changes.
const LOGO_LIMIT = 150 * 1024;

document.addEventListener("DOMContentLoaded", init);

function init() {
  document.querySelectorAll("[id]").forEach((node) => {
    el[node.id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = node;
  });
  bindEvents();
  load().catch((error) => showBootError(errorMessage(error)));
}

function bindEvents() {
  el.bootRetry.addEventListener("click", () => {
    load().catch((error) => showBootError(errorMessage(error)));
  });
  el.loginForm.addEventListener("submit", (event) => {
    handleLogin(event).catch((error) => {
      setFormError(el.loginError, errorMessage(error));
      el.loginSubmit.disabled = false;
    });
  });
  el.logoutButton.addEventListener("click", () => {
    handleLogout().catch(() => showLogin(""));
  });
  el.settingsButton.addEventListener("click", () => openSettings(el.settingsButton));
  el.addCategory.addEventListener("click", () => openCategoryDialog(null, el.addCategory));
  el.categories.addEventListener("click", onCategoryClick);
  el.categories.addEventListener("dragstart", onDragStart);
  el.categories.addEventListener("dragover", onDragOver);
  el.categories.addEventListener("drop", onDrop);
  el.categories.addEventListener("dragend", finishDrag);
  el.categoryForm.addEventListener("submit", (event) => {
    submitCategory(event).catch((error) => {
      if (error.status !== 401) setFormError(el.categoryError, errorMessage(error));
    });
  });
  el.itemForm.addEventListener("submit", (event) => {
    submitItem(event).catch((error) => {
      if (error.status !== 401) setFormError(el.itemError, errorMessage(error));
    });
  });
  el.addVariant.addEventListener("click", () => {
    const row = addVariantRow();
    if (row) row.querySelector('[data-variant-field="nameFa"]').focus();
  });
  el.variantRows.addEventListener("click", onVariantClick);
  el.settingsForm.addEventListener("submit", (event) => {
    submitSettings(event).catch((error) => {
      if (error.status !== 401) setFormError(el.settingsError, errorMessage(error));
    });
  });
  el.logoInput.addEventListener("change", () => {
    handleLogoFile().catch((error) => setFormError(el.settingsError, errorMessage(error)));
  });
  el.logoRemove.addEventListener("click", removeLogo);
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-close-dialog]");
    if (!button) return;
    const dialog = button.closest("dialog");
    if (dialog) dialog.close();
  });
  [el.categoryDialog, el.itemDialog, el.settingsDialog].forEach((dialog) => {
    dialog.addEventListener("close", () => restoreDialogFocus(dialog));
  });
  el.settingsDialog.addEventListener("close", () => {
    ui.logoJob += 1;
    ui.logoBusy = false;
    el.logoInput.disabled = false;
    el.logoRemove.disabled = false;
  });
}

function errorMessage(error) {
  if (error && error.message) return error.message;
  return "خطای نامشخصی رخ داد. دوباره تلاش کنید.";
}

function setFormError(node, message) {
  node.textContent = message;
  node.hidden = false;
  if (node.closest("dialog")) node.scrollIntoView({ block: "nearest" });
}

function clearFormError(node) {
  node.textContent = "";
  node.hidden = true;
}

function busyButton(button, busy, busyText) {
  if (busy) {
    if (button.dataset.idleLabel) return;
    button.dataset.idleLabel = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    if (!button.dataset.idleLabel) return;
    button.textContent = button.dataset.idleLabel;
    delete button.dataset.idleLabel;
    button.disabled = false;
  }
}

function setStatus(message) {
  el.appStatus.textContent = message;
  el.appStatus.hidden = !message;
}

function showEditorError(message) {
  el.editorError.textContent = message;
  el.editorError.hidden = false;
}

function showLogin(message) {
  ui.loadSeq += 1;
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  state.settings = null;
  state.categories = [];
  el.boot.hidden = true;
  el.editor.hidden = true;
  el.loginScreen.hidden = false;
  el.loginPassword.value = "";
  el.loginSubmit.disabled = false;
  if (message) setFormError(el.loginError, message);
  else clearFormError(el.loginError);
  document.title = "ورود — مدیریت منو";
  el.loginPassword.focus();
}

function showEditor() {
  el.boot.hidden = true;
  el.loginScreen.hidden = true;
  el.editor.hidden = false;
}

function showBoot(message) {
  el.loginScreen.hidden = true;
  el.editor.hidden = true;
  el.boot.hidden = false;
  el.bootMessage.textContent = message;
  el.bootRetry.hidden = true;
}

function showBootError(message) {
  showBoot(message || "بارگذاری منو ممکن نشد.");
  el.bootRetry.hidden = false;
}

async function api(path, options = {}) {
  const request = { method: options.method || "GET", credentials: "same-origin", headers: {} };
  if (options.body !== undefined) {
    request.headers["Content-Type"] = "application/json";
    request.body = JSON.stringify(options.body);
  }
  let response;
  try {
    response = await fetch(path, request);
  } catch (error) {
    throw new Error("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
  }
  if (response.status === 401) {
    const wasEditor = !el.editor.hidden;
    showLogin(wasEditor ? "نشست شما منقضی شده است. دوباره وارد شوید." : "");
    const error = new Error("برای ادامه باید وارد شوید.");
    error.status = 401;
    throw error;
  }
  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = null;
    }
  }
  if (!response.ok) {
    const error = new Error((data && data.error) || "خطا در ارتباط با سرور.");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function load() {
  const sequence = ++ui.loadSeq;
  const initial = !state.settings;
  if (initial) showBoot("در حال بارگذاری…");
  else setStatus("در حال به‌روزرسانی…");
  try {
    const data = await api("/api/menu");
    if (sequence !== ui.loadSeq) return;
    state.settings = (data && data.settings) || {};
    const categories = (data && Array.isArray(data.categories)) ? data.categories : [];
    state.categories = categories.map((category) => ({
      ...category,
      items: Array.isArray(category.items) ? category.items : [],
    }));
    render();
    showEditor();
  } catch (error) {
    if (error.status === 401 || sequence !== ui.loadSeq) return;
    if (initial) showBootError(errorMessage(error));
    else showEditorError("منو به‌روزرسانی نشد: " + errorMessage(error));
  } finally {
    if (sequence === ui.loadSeq) setStatus("");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  if (el.loginSubmit.disabled) return;
  clearFormError(el.loginError);
  const password = el.loginPassword.value;
  if (!password) {
    setFormError(el.loginError, "رمز عبور را وارد کنید.");
    el.loginPassword.focus();
    return;
  }
  el.loginSubmit.disabled = true;
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }
    if (!response.ok) {
      setFormError(el.loginError, (data && data.error) || "ورود ناموفق بود.");
      el.loginPassword.focus();
      el.loginPassword.select();
      return;
    }
    el.loginPassword.value = "";
    await load();
    if (!el.editor.hidden) el.addCategory.focus();
  } catch (error) {
    setFormError(el.loginError, "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
  } finally {
    el.loginSubmit.disabled = false;
  }
}

async function handleLogout() {
  el.logoutButton.disabled = true;
  let loggedOut = false;
  try {
    await api("/api/logout", { method: "POST", body: {} });
    loggedOut = true;
  } catch (error) {
    if (error.status === 401) loggedOut = true;
    else showEditorError(errorMessage(error));
  } finally {
    el.logoutButton.disabled = false;
  }
  if (!loggedOut) return;
  state.settings = null;
  state.categories = [];
  showLogin("");
}

function render() {
  const settings = state.settings || {};
  el.cafeName.textContent = settings.nameFa || "منوی کافه";
  document.title = (settings.nameFa || "مدیریت منو") + " — مدیریت منو";
  el.previewLink.href = "/?t=" + Date.now();
  el.categories.replaceChildren();
  state.categories.forEach((category, index) => {
    el.categories.append(buildCategory(category, index));
  });
  el.categoriesEmpty.hidden = state.categories.length > 0;
  el.editorError.hidden = true;
}

function buildCategory(category, index) {
  const node = el.categoryTemplate.content.firstElementChild.cloneNode(true);
  const items = category.items;
  node.dataset.categoryId = String(category.id);
  node.querySelector('[data-field="name"]').textContent = category.nameFa || "";
  node.querySelector('[data-field="count"]').textContent = toFaDigits(items.length) + " آیتم";

  const up = node.querySelector('[data-action="category-up"]');
  const down = node.querySelector('[data-action="category-down"]');
  const deleteButton = node.querySelector('[data-action="category-delete"]');
  const note = node.querySelector('[data-field="delete-note"]');
  up.disabled = index === 0;
  down.disabled = index === state.categories.length - 1;
  deleteButton.disabled = items.length > 0;
  if (items.length > 0) {
    note.id = "category-delete-note-" + category.id;
    note.hidden = false;
    deleteButton.setAttribute("aria-describedby", note.id);
    deleteButton.title = "این دسته آیتم دارد و حذف نمی‌شود.";
  } else {
    note.hidden = true;
    deleteButton.removeAttribute("aria-describedby");
    deleteButton.title = "حذف دسته خالی";
  }

  const itemsNode = node.querySelector('[data-field="items"]');
  items.forEach((item, itemIndex) => {
    itemsNode.append(buildItem(item, itemIndex, items.length));
  });
  node.querySelector('[data-field="items-empty"]').hidden = items.length > 0;
  return node;
}

function buildItem(item, index, total) {
  const node = el.itemTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.itemId = String(item.id);
  node.querySelector('[data-field="name"]').textContent = item.nameFa || "";

  const english = node.querySelector('[data-field="name-en"]');
  english.textContent = item.nameEn || "";
  english.hidden = !item.nameEn;

  const variants = summarizeVariants(item.variants);
  const variantNode = node.querySelector('[data-field="variants"]');
  variantNode.textContent = variants;
  variantNode.hidden = !variants;

  const soldOut = Boolean(item.isSoldOut);
  node.classList.toggle("is-sold-out", soldOut);
  node.querySelector('[data-field="sold-out"]').hidden = !soldOut;
  node.querySelector('[data-field="price"]').textContent = formatToman(item.priceToman);
  node.querySelector('[data-action="item-up"]').disabled = index === 0;
  node.querySelector('[data-action="item-down"]').disabled = index === total - 1;
  return node;
}

function summarizeVariants(variants) {
  if (!Array.isArray(variants)) return "";
  return variants.map((variant) => {
    const english = variant.nameEn ? " (" + variant.nameEn + ")" : "";
    const delta = Number(variant.priceDelta) ? " " + formatDelta(variant.priceDelta) : "";
    return (variant.nameFa || "") + english + delta;
  }).join(" · ");
}

function toFaDigits(value) {
  return String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)]);
}

function formatToman(value) {
  const number = Math.trunc(Number(value) || 0);
  const sign = number < 0 ? "−" : "";
  return sign + toFaDigits(String(Math.abs(number)).replace(/\B(?=(\d{3})+(?!\d))/g, "٬"));
}

function formatDelta(value) {
  const number = Math.trunc(Number(value) || 0);
  if (number === 0) return toFaDigits(0);
  return (number > 0 ? "+" : "−") + formatToman(Math.abs(number));
}

function findCategory(categoryId) {
  return state.categories.find((category) => category.id === categoryId);
}

function onCategoryClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  const categoryNode = button.closest("[data-category-id]");
  if (!categoryNode) return;
  const category = findCategory(Number(categoryNode.dataset.categoryId));
  if (!category) return;
  const itemNode = button.closest("[data-item-id]");
  const item = itemNode
    ? category.items.find((entry) => entry.id === Number(itemNode.dataset.itemId))
    : null;
  const action = button.dataset.action;
  try {
    if (action === "category-up" || action === "category-down") {
      moveCategory(category.id, action === "category-up" ? -1 : 1);
    } else if (action === "category-rename") {
      openCategoryDialog(category, button);
    } else if (action === "category-delete") {
      runEditor(deleteCategory(category));
    } else if (action === "category-add-item") {
      openItemDialog(category.id, null, button);
    } else if (item && (action === "item-up" || action === "item-down")) {
      moveItem(category.id, item.id, action === "item-up" ? -1 : 1);
    } else if (item && action === "item-edit") {
      openItemDialog(category.id, item, button);
    } else if (item && action === "item-delete") {
      runEditor(deleteItem(category, item));
    }
  } catch (error) {
    showEditorError(errorMessage(error));
  }
}

function runEditor(promise) {
  promise.catch((error) => {
    if (error.status !== 401) showEditorError(errorMessage(error));
  });
}

function moveCategory(categoryId, direction) {
  const index = state.categories.findIndex((category) => category.id === categoryId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= state.categories.length) return;
  const moved = state.categories.splice(index, 1)[0];
  state.categories.splice(target, 0, moved);
  render();
  focusReorderButton(direction < 0 ? "category-up" : "category-down", categoryId, null);
  queueCategoryOrder();
}

function moveItem(categoryId, itemId, direction) {
  const category = findCategory(categoryId);
  if (!category) return;
  const index = category.items.findIndex((item) => item.id === itemId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= category.items.length) return;
  const moved = category.items.splice(index, 1)[0];
  category.items.splice(target, 0, moved);
  render();
  focusReorderButton(direction < 0 ? "item-up" : "item-down", categoryId, itemId);
  queueItemOrder(categoryId);
}

function focusReorderButton(action, categoryId, itemId) {
  const scope = itemId !== null
    ? document.querySelector('[data-item-id="' + itemId + '"]')
    : document.querySelector('[data-category-id="' + categoryId + '"]');
  if (!scope) return;
  let target = scope.querySelector('[data-action="' + action + '"]');
  if (!target || target.disabled) {
    const opposite = action.endsWith("-up")
      ? action.slice(0, -3) + "-down"
      : action.replace("-down", "-up");
    target = scope.querySelector('[data-action="' + opposite + '"]');
  }
  if (!target || target.disabled) {
    target = scope.querySelector('[data-action="item-edit"], [data-action="category-rename"]');
  }
  if (target && !target.disabled) target.focus();
}

function enqueueOrder(task) {
  const next = ui.orderChain.then(task, task);
  ui.orderChain = next.catch(() => {});
  return next;
}

function queueCategoryOrder() {
  enqueueOrder(async () => {
    const ids = state.categories.map((category) => category.id);
    try {
      await api("/api/categories/order", { method: "PUT", body: { ids } });
    } catch (error) {
      if (error.status === 401) return;
      await load();
      if (!el.loginScreen.hidden) return;
      showEditorError("ترتیب دسته‌ها ذخیره نشد؛ فهرست دوباره بارگذاری شد.");
    }
  });
}

function queueItemOrder(categoryId) {
  enqueueOrder(async () => {
    const category = findCategory(categoryId);
    if (!category) return;
    const ids = category.items.map((item) => item.id);
    try {
      await api("/api/items/order", { method: "PUT", body: { categoryId, ids } });
    } catch (error) {
      if (error.status === 401) return;
      await load();
      if (!el.loginScreen.hidden) return;
      showEditorError("ترتیب اقلام ذخیره نشد؛ فهرست دوباره بارگذاری شد.");
    }
  });
}

function onDragStart(event) {
  const handle = event.target.closest("[data-drag-handle]");
  if (!handle) {
    event.preventDefault();
    return;
  }
  const row = handle.closest("[data-item-id]");
  const categoryNode = handle.closest("[data-category-id]");
  if (!row || !categoryNode) return;
  ui.drag = {
    itemId: Number(row.dataset.itemId),
    categoryId: Number(categoryNode.dataset.categoryId),
  };
  row.classList.add("is-dragging");
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setData("text/plain", String(ui.drag.itemId));
    } catch (error) {
      /* Some browsers restrict custom drag data; the in-memory drag state is enough. */
    }
  }
}

function onDragOver(event) {
  if (!ui.drag) return;
  const row = event.target.closest("[data-item-id]");
  if (!row) return;
  const categoryNode = row.closest("[data-category-id]");
  if (!categoryNode || Number(categoryNode.dataset.categoryId) !== ui.drag.categoryId) return;
  const targetId = Number(row.dataset.itemId);
  if (targetId === ui.drag.itemId) {
    clearDropHints();
    return;
  }
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  const rect = row.getBoundingClientRect();
  const after = event.clientY > rect.top + rect.height / 2;
  clearDropHints();
  row.classList.add(after ? "drop-after" : "drop-before");
}

function onDrop(event) {
  if (!ui.drag) return;
  const row = event.target.closest("[data-item-id]");
  if (!row) return;
  const categoryNode = row.closest("[data-category-id]");
  if (!categoryNode || Number(categoryNode.dataset.categoryId) !== ui.drag.categoryId) return;
  event.preventDefault();
  const drag = { ...ui.drag };
  const targetId = Number(row.dataset.itemId);
  const after = row.classList.contains("drop-after");
  finishDrag();
  if (targetId === drag.itemId) return;
  applyItemDrop(drag, targetId, after);
}

function finishDrag() {
  el.categories.querySelectorAll(".is-dragging").forEach((row) => row.classList.remove("is-dragging"));
  clearDropHints();
  ui.drag = null;
}

function clearDropHints() {
  el.categories.querySelectorAll(".drop-before, .drop-after").forEach((row) => {
    row.classList.remove("drop-before", "drop-after");
  });
}

function applyItemDrop(drag, targetId, after) {
  const category = findCategory(drag.categoryId);
  if (!category) return;
  const from = category.items.findIndex((item) => item.id === drag.itemId);
  if (from < 0) return;
  const moved = category.items.splice(from, 1)[0];
  let to = category.items.findIndex((item) => item.id === targetId);
  if (to < 0) {
    category.items.splice(from, 0, moved);
    return;
  }
  if (after) to += 1;
  category.items.splice(to, 0, moved);
  if (to === from) return;
  render();
  queueItemOrder(category.id);
}

async function deleteCategory(category) {
  const current = findCategory(category.id);
  if (!current || current.items.length > 0) return;
  const index = state.categories.findIndex((entry) => entry.id === current.id);
  if (!window.confirm("دسته «" + current.nameFa + "» حذف شود؟")) return;
  try {
    await api("/api/categories/" + current.id, { method: "DELETE", body: {} });
    await load();
    const next = state.categories[Math.min(index, state.categories.length - 1)];
    const scope = next
      ? document.querySelector('[data-category-id="' + next.id + '"]')
      : null;
    (scope && scope.querySelector('[data-action="category-rename"]') || el.addCategory).focus();
  } catch (error) {
    if (error.status === 401) return;
    if (error.status === 409) {
      await load();
      if (!el.loginScreen.hidden) return;
      showEditorError("این دسته خالی نیست؛ ابتدا اقلام آن را حذف یا منتقل کنید.");
    } else {
      showEditorError(errorMessage(error));
    }
  }
}

async function deleteItem(category, item) {
  const index = category.items.findIndex((entry) => entry.id === item.id);
  if (!window.confirm("آیتم «" + item.nameFa + "» حذف شود؟")) return;
  try {
    await api("/api/items/" + item.id, { method: "DELETE", body: {} });
    await load();
    const fresh = findCategory(category.id);
    const next = fresh && fresh.items[Math.min(index, fresh.items.length - 1)];
    const scope = next
      ? document.querySelector('[data-item-id="' + next.id + '"]')
      : document.querySelector('[data-category-id="' + category.id + '"]');
    (scope && scope.querySelector(next ? '[data-action="item-edit"]' : '[data-action="category-add-item"]') || el.addCategory).focus();
  } catch (error) {
    if (error.status === 401) return;
    if (error.status === 404) await load();
    showEditorError(errorMessage(error));
  }
}

function openDialog(dialog, trigger) {
  dialog._trigger = trigger || document.activeElement;
  dialog._triggerRef = describeTrigger(dialog._trigger);
  if (!dialog.open) dialog.showModal();
}

function describeTrigger(node) {
  if (!node || !node.dataset || !node.dataset.action) return null;
  const itemNode = node.closest("[data-item-id]");
  const categoryNode = node.closest("[data-category-id]");
  return {
    action: node.dataset.action,
    itemId: itemNode ? itemNode.dataset.itemId : null,
    categoryId: categoryNode ? categoryNode.dataset.categoryId : null,
  };
}

function findEquivalentTrigger(ref) {
  if (!ref) return null;
  if (ref.itemId) {
    const itemNode = document.querySelector('[data-item-id="' + ref.itemId + '"]');
    const target = itemNode && itemNode.querySelector('[data-action="' + ref.action + '"]');
    if (target && !target.disabled) return target;
  }
  if (ref.categoryId) {
    const categoryNode = document.querySelector('[data-category-id="' + ref.categoryId + '"]');
    const target = categoryNode && categoryNode.querySelector('[data-action="' + ref.action + '"]');
    if (target && !target.disabled) return target;
  }
  const globalTarget = document.querySelector('[data-action="' + ref.action + '"]');
  return globalTarget && !globalTarget.disabled ? globalTarget : null;
}

function restoreDialogFocus(dialog) {
  const target = findEquivalentTrigger(dialog._triggerRef)
    || (dialog._trigger && dialog._trigger.isConnected ? dialog._trigger : null);
  if (target && !target.disabled) target.focus();
  else el.addCategory.focus();
}

function openCategoryDialog(category, trigger) {
  ui.editingCategoryId = category ? category.id : null;
  clearFormError(el.categoryError);
  el.categoryName.value = category ? category.nameFa : "";
  el.categoryDialogTitle.textContent = category ? "تغییر نام دسته" : "افزودن دسته";
  el.categorySave.textContent = category ? "ذخیره نام" : "افزودن دسته";
  el.categorySave.disabled = false;
  openDialog(el.categoryDialog, trigger);
  el.categoryName.focus();
  el.categoryName.select();
}

async function submitCategory(event) {
  event.preventDefault();
  if (el.categorySave.dataset.idleLabel) return;
  const nameFa = el.categoryName.value.trim();
  if (!nameFa) {
    setFormError(el.categoryError, "نام دسته را وارد کنید.");
    el.categoryName.focus();
    return;
  }
  const editingId = ui.editingCategoryId;
  clearFormError(el.categoryError);
  busyButton(el.categorySave, true, "در حال ذخیره…");
  try {
    await api(editingId ? "/api/categories/" + editingId : "/api/categories", {
      method: editingId ? "PUT" : "POST",
      body: { nameFa },
    });
    await load();
    el.categoryDialog.close();
  } finally {
    busyButton(el.categorySave, false);
  }
}

function openItemDialog(categoryId, item, trigger) {
  ui.editingItemId = item ? item.id : null;
  clearFormError(el.itemError);
  el.itemCategory.replaceChildren();
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = String(category.id);
    option.textContent = category.nameFa;
    el.itemCategory.append(option);
  });
  el.itemCategory.value = String(categoryId);
  el.itemNameFa.value = item ? item.nameFa : "";
  el.itemNameEn.value = item && item.nameEn ? item.nameEn : "";
  el.itemDescription.value = item && item.description ? item.description : "";
  el.itemPrice.value = item ? String(item.priceToman) : "0";
  el.itemSoldOut.checked = Boolean(item && item.isSoldOut);
  el.variantRows.replaceChildren();
  if (item && Array.isArray(item.variants)) {
    item.variants.forEach((variant) => addVariantRow(variant));
  }
  updateVariantControls();
  el.itemDialogTitle.textContent = item ? "ویرایش آیتم" : "افزودن آیتم";
  el.itemSave.textContent = item ? "ذخیره تغییرات" : "افزودن آیتم";
  el.itemSave.disabled = false;
  openDialog(el.itemDialog, trigger);
  el.itemNameFa.focus();
  el.itemNameFa.select();
}

function addVariantRow(variant) {
  const count = el.variantRows.querySelectorAll("[data-variant-row]").length;
  if (count >= 10) {
    setFormError(el.itemError, "حداکثر ۱۰ واریانت برای هر آیتم مجاز است.");
    return null;
  }
  const row = el.variantTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector('[data-variant-field="nameFa"]').value = variant && variant.nameFa ? variant.nameFa : "";
  row.querySelector('[data-variant-field="nameEn"]').value = variant && variant.nameEn ? variant.nameEn : "";
  row.querySelector('[data-variant-field="priceDelta"]').value =
    variant && variant.priceDelta !== undefined && variant.priceDelta !== null
      ? String(variant.priceDelta)
      : "0";
  el.variantRows.append(row);
  updateVariantControls();
  return row;
}

function updateVariantControls() {
  const count = el.variantRows.querySelectorAll("[data-variant-row]").length;
  el.addVariant.disabled = count >= 10;
  el.addVariant.textContent = count >= 10 ? "حداکثر ۱۰ واریانت" : "افزودن واریانت";
}

function onVariantClick(event) {
  const button = event.target.closest('[data-action="variant-remove"]');
  if (!button) return;
  const row = button.closest("[data-variant-row]");
  if (!row) return;
  const next = row.nextElementSibling || row.previousElementSibling;
  row.remove();
  updateVariantControls();
  if (next) {
    const input = next.querySelector("input");
    if (input) input.focus();
  } else {
    el.addVariant.focus();
  }
}

function collectVariants() {
  const variants = [];
  el.variantRows.querySelectorAll("[data-variant-row]").forEach((row) => {
    const nameFa = row.querySelector('[data-variant-field="nameFa"]').value.trim();
    if (!nameFa) return;
    const nameEn = row.querySelector('[data-variant-field="nameEn"]').value.trim();
    const deltaValue = row.querySelector('[data-variant-field="priceDelta"]').value.trim();
    const priceDelta = deltaValue === "" ? 0 : Number(deltaValue);
    if (!Number.isSafeInteger(priceDelta) || Math.abs(priceDelta) > 1000000000) {
      throw new Error("اختلاف قیمت واریانت باید عددی بین منفی و مثبت یک میلیارد باشد.");
    }
    variants.push({ nameFa, nameEn, priceDelta });
  });
  return variants;
}

async function submitItem(event) {
  event.preventDefault();
  if (el.itemSave.dataset.idleLabel) return;
  clearFormError(el.itemError);
  const categoryId = Number(el.itemCategory.value);
  const nameFa = el.itemNameFa.value.trim();
  const nameEn = el.itemNameEn.value.trim();
  const description = el.itemDescription.value.trim();
  const priceRaw = el.itemPrice.value.trim();
  const priceToman = Number(priceRaw);
  if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
    setFormError(el.itemError, "دسته را انتخاب کنید.");
    el.itemCategory.focus();
    return;
  }
  if (!nameFa) {
    setFormError(el.itemError, "نام فارسی آیتم را وارد کنید.");
    el.itemNameFa.focus();
    return;
  }
  if (!priceRaw || !Number.isSafeInteger(priceToman) || priceToman < 0 || priceToman > 1000000000) {
    setFormError(el.itemError, "قیمت باید عددی صحیح بین صفر و یک میلیارد تومان باشد.");
    el.itemPrice.focus();
    return;
  }
  const variants = collectVariants();
  const editingId = ui.editingItemId;
  busyButton(el.itemSave, true, "در حال ذخیره…");
  try {
    await api(editingId ? "/api/items/" + editingId : "/api/items", {
      method: editingId ? "PUT" : "POST",
      body: { categoryId, nameFa, nameEn, description, priceToman, isSoldOut: el.itemSoldOut.checked, variants },
    });
    await load();
    el.itemDialog.close();
  } finally {
    busyButton(el.itemSave, false);
  }
}

function openSettings(trigger) {
  ui.logoJob += 1;
  ui.logoBusy = false;
  const settings = state.settings || {};
  clearFormError(el.settingsError);
  el.settingsNameFa.value = settings.nameFa || "";
  el.settingsNameEn.value = settings.nameEn || "";
  el.settingsWelcome.value = settings.welcomeMessage || "";
  el.settingsMeta.value = settings.metaDescription || "";
  ui.logoDataUrl = settings.logoDataUrl || null;
  el.logoInput.value = "";
  el.logoInput.disabled = false;
  el.logoRemove.disabled = false;
  el.settingsSave.disabled = false;
  renderLogoPreview(ui.logoDataUrl);
  openDialog(el.settingsDialog, trigger);
  el.settingsNameFa.focus();
  el.settingsNameFa.select();
}

async function submitSettings(event) {
  event.preventDefault();
  if (el.settingsSave.dataset.idleLabel) return;
  if (ui.logoBusy) {
    setFormError(el.settingsError, "پردازش لوگو هنوز تمام نشده است؛ کمی صبر کنید.");
    return;
  }
  const nameFa = el.settingsNameFa.value.trim();
  if (!nameFa) {
    setFormError(el.settingsError, "نام فارسی کافه را وارد کنید.");
    el.settingsNameFa.focus();
    return;
  }
  clearFormError(el.settingsError);
  busyButton(el.settingsSave, true, "در حال ذخیره…");
  try {
    await api("/api/settings", {
      method: "PUT",
      body: {
        nameFa,
        nameEn: el.settingsNameEn.value.trim(),
        welcomeMessage: el.settingsWelcome.value.trim(),
        metaDescription: el.settingsMeta.value.trim(),
        logoDataUrl: ui.logoDataUrl,
      },
    });
    await load();
    el.settingsDialog.close();
  } finally {
    busyButton(el.settingsSave, false);
  }
}

function renderLogoPreview(dataUrl) {
  if (dataUrl) {
    el.logoPreview.src = dataUrl;
    el.logoPreview.hidden = false;
    el.logoEmpty.hidden = true;
    el.logoRemove.hidden = false;
    el.logoMeta.textContent = "حجم تقریبی داده: " + formatSize(dataUrl.length);
  } else {
    el.logoPreview.removeAttribute("src");
    el.logoPreview.hidden = true;
    el.logoEmpty.hidden = false;
    el.logoRemove.hidden = true;
    el.logoMeta.textContent = "لوگویی انتخاب نشده است.";
  }
}

function formatSize(length) {
  const kilobytes = length / 1024;
  const value = kilobytes < 10 ? kilobytes.toFixed(1) : String(Math.round(kilobytes));
  return toFaDigits(value).replace(".", "٫") + " کیلوبایت";
}

function removeLogo() {
  if (ui.logoBusy) return;
  clearFormError(el.settingsError);
  ui.logoDataUrl = null;
  renderLogoPreview(null);
  el.logoMeta.textContent = "لوگو پس از ذخیره حذف می‌شود.";
  el.logoInput.focus();
}

async function handleLogoFile() {
  const file = el.logoInput.files && el.logoInput.files[0];
  el.logoInput.value = "";
  if (!file) return;
  clearFormError(el.settingsError);
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    setFormError(el.settingsError, "فقط تصویر PNG، JPEG یا WebP مجاز است.");
    return;
  }
  const job = ++ui.logoJob;
  ui.logoBusy = true;
  el.logoInput.disabled = true;
  el.logoRemove.disabled = true;
  el.logoMeta.textContent = "در حال پردازش لوگو…";
  try {
    const dataUrl = await processLogo(file);
    if (job !== ui.logoJob) return;
    ui.logoDataUrl = dataUrl;
    renderLogoPreview(dataUrl);
  } catch (error) {
    if (job !== ui.logoJob) return;
    setFormError(el.settingsError, errorMessage(error));
    renderLogoPreview(ui.logoDataUrl);
  } finally {
    if (job === ui.logoJob) {
      ui.logoBusy = false;
      el.logoInput.disabled = false;
      el.logoRemove.disabled = false;
    }
  }
}

async function processLogo(file) {
  const source = await decodeImage(file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) {
    if (source.close) source.close();
    throw new Error("ابعاد تصویر قابل خواندن نیست.");
  }
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    if (source.close) source.close();
    throw new Error("پردازش تصویر در این مرورگر پشتیبانی نمی‌شود.");
  }
  const draw = (size, quality) => {
    canvas.width = size;
    canvas.height = size;
    const scale = Math.max(size / width, size / height);
    const drawWidth = width * scale;
    const drawHeight = height * scale;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, size, size);
    context.drawImage(source, (size - drawWidth) / 2, (size - drawHeight) / 2, drawWidth, drawHeight);
    let dataUrl = canvas.toDataURL("image/webp", quality);
    if (!dataUrl.startsWith("data:image/webp")) dataUrl = canvas.toDataURL("image/png");
    return dataUrl;
  };
  let dataUrl = draw(256, 0.82);
  if (dataUrl.length > LOGO_LIMIT) dataUrl = draw(256, 0.65);
  if (dataUrl.length > LOGO_LIMIT) dataUrl = draw(128, 0.65);
  if (source.close) source.close();
  if (dataUrl.length > LOGO_LIMIT) {
    throw new Error("حجم لوگو پس از فشرده‌سازی هنوز بیش از ۱۵۰ کیلوبایت است. تصویر ساده‌تری انتخاب کنید.");
  }
  return dataUrl;
}

async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch (error) {
      /* Fall back to an <img> decode below. */
    }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("تصویر قابل خواندن نیست."));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("خواندن فایل تصویر ممکن نشد."));
    reader.readAsDataURL(file);
  });
}
