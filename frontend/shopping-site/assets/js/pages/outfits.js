/*
  outfits.js
  说明：穿搭晒单页面逻辑
  - 瀑布流展示
  - 上传晒单（身高、尺码、场景、关联商品）
  - 人脸检测隐私提示
  - 点击跳转商品
  - 点赞功能
*/

import { toast } from "../app.js";
import { productById, PRODUCTS } from "../product-data.js";
import {
  getOutfits,
  addOutfit,
  getScenes,
  getSizes,
  initSampleOutfits,
  detectFaceInImage,
  toggleLike,
  isLiked,
  toggleFeature
} from "../outfit-store.js";
import { getUser } from "../user-store.js";
import { formatPrice, productImageUrl } from "../ui-products.js";

let currentFilter = "all";
let currentSort = "latest";
let currentProductId = null;
let uploadedImage = "";
let selectedScene = "";
let hasFace = false;
let currentVisitorId = "";

function getVisitorId() {
  if (!currentVisitorId) {
    const stored = localStorage.getItem("aurora_visitor_id");
    if (stored) {
      currentVisitorId = stored;
    } else {
      currentVisitorId = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem("aurora_visitor_id", currentVisitorId);
    }
  }
  return currentVisitorId;
}

function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveProductLink(productId) {
  return `./product.html?id=${encodeURIComponent(productId)}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function renderOutfitCard(outfit) {
  const product = productById(outfit.productId);
  const liked = isLiked(outfit.id, getVisitorId());
  const likeCls = liked ? "liked" : "";
  const faceBadge = outfit.hasFace
    ? `<span class="outfit-badge outfit-badge--warn" title="含人脸照片">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 9v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        </svg>
        隐私提示
      </span>`
    : "";
  
  const featuredBadge = outfit.featured
    ? `<span class="outfit-badge outfit-badge--featured" title="运营精选">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="currentColor"/>
        </svg>
        精选
      </span>`
    : "";

  const metaTags = [];
  if (outfit.height) metaTags.push(`身高 ${outfit.height}cm`);
  if (outfit.size) metaTags.push(`尺码 ${outfit.size}`);
  if (outfit.scene) metaTags.push(outfit.scene);

  return `
    <article class="outfit-card" data-id="${outfit.id}" data-product-id="${outfit.productId}">
      <div class="outfit-image-wrap" data-action="view-detail">
        <img class="outfit-image" src="${escapeHTML(outfit.image)}" alt="穿搭晒单" loading="lazy" />
        <div class="outfit-badges">
          ${featuredBadge}
          ${faceBadge}
        </div>
      </div>
      <div class="outfit-body">
        <div class="outfit-user">
          <div class="outfit-avatar">${escapeHTML(outfit.userName.charAt(0))}</div>
          <div>
            <div class="outfit-username">${escapeHTML(outfit.userName)}</div>
            <div class="outfit-time">${formatDate(outfit.createdAt)}</div>
          </div>
        </div>
        
        ${metaTags.length > 0 ? `
          <div class="outfit-meta">
            ${metaTags.map((t) => `<span class="chip chip--sm">${escapeHTML(t)}</span>`).join("")}
          </div>
        ` : ""}
        
        ${outfit.content ? `<p class="outfit-content">${escapeHTML(outfit.content)}</p>` : ""}
        
        <div class="outfit-product" data-action="view-product">
          <img src="${productImageUrl(product || { category: "服饰" }, { w: 120, h: 120 })}" alt="" />
          <div class="outfit-product-info">
            <div class="outfit-product-name" title="${escapeHTML(product?.name || outfit.productName)}">
              ${escapeHTML(product?.name || outfit.productName)}
            </div>
            <div class="outfit-product-price">${product ? formatPrice(product.price) : ""}</div>
          </div>
          <div class="outfit-product-arrow">去购买 →</div>
        </div>
        
        <div class="outfit-actions">
          <button class="outfit-action-btn ${likeCls}" data-action="like" data-id="${outfit.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 21s-7-4.6-9.3-9C.5 7.3 3.5 4 7.4 5.1c1.3.4 2.3 1.4 2.6 2 .3-.6 1.3-1.6 2.6-2C16.5 4 19.5 7.3 21.3 12c-2.3 4.4-9.3 9-9.3 9Z"
                stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            </svg>
            <span>${outfit.likes || 0}</span>
          </button>
          <button class="outfit-action-btn" data-action="share">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <path d="m16 6-4-4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 2v13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            <span>分享</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderOutfits() {
  const grid = document.querySelector("[data-role='outfit-grid']");
  const emptyHint = document.querySelector("[data-role='empty-hint']");
  if (!grid) return;

  let outfits = getOutfits();

  if (currentProductId) {
    outfits = outfits.filter((o) => o.productId === currentProductId);
    const product = productById(currentProductId);
    if (product) {
      document.querySelector(".page-head h1").textContent = `${product.name} 的买家晒单`;
      document.querySelector(".page-head p").textContent = `共 ${outfits.length} 位买家分享了他们的穿搭效果`;
    }
  }

  if (currentFilter === "featured") {
    outfits = outfits.filter((o) => o.featured);
  } else if (currentFilter !== "all") {
    const sceneMap = {
      daily: "日常",
      work: "通勤",
      date: "约会",
      sport: "运动",
      travel: "旅行"
    };
    const sceneName = sceneMap[currentFilter];
    if (sceneName) {
      outfits = outfits.filter((o) => o.scene === sceneName);
    }
  }

  if (currentSort === "popular") {
    outfits = [...outfits].sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }

  if (outfits.length === 0) {
    grid.innerHTML = "";
    emptyHint.textContent = currentProductId ? "该商品暂无晒单，快来发布第一条吧～" : "暂无晒单，快来发布第一条吧～";
    return;
  }

  emptyHint.textContent = "";
  grid.innerHTML = outfits.map(renderOutfitCard).join("");

  initMasonry(grid);
}

function initMasonry(grid) {
  const cards = grid.querySelectorAll(".outfit-card");
  const columns = 4;
  const columnHeights = new Array(columns).fill(0);
  const gap = 16;

  cards.forEach((card, index) => {
    const col = index % columns;
    card.style.position = "absolute";
    card.style.left = `${col * (100 / columns)}%`;
    card.style.top = `${columnHeights[col]}px`;
    card.style.width = `calc(${100 / columns}% - ${gap * 3 / 4}px)`;
    
    card.addEventListener("load", () => {
      columnHeights[col] += card.offsetHeight + gap;
      grid.style.height = `${Math.max(...columnHeights)}px`;
    }, { once: true });

    setTimeout(() => {
      columnHeights[col] += card.offsetHeight + gap;
      grid.style.height = `${Math.max(...columnHeights)}px`;
    }, 50);
  });
}

function initUploadForm() {
  const sizeSelect = document.querySelector("[data-role='size-select']");
  const sceneChips = document.querySelector("[data-role='scene-chips']");
  const productSelect = document.querySelector("[data-role='product-select']");

  getSizes().forEach((size) => {
    const opt = document.createElement("option");
    opt.value = size;
    opt.textContent = size;
    sizeSelect.appendChild(opt);
  });

  getScenes().forEach((scene) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = scene;
    chip.dataset.scene = scene;
    chip.addEventListener("click", () => {
      sceneChips.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      selectedScene = scene;
      document.querySelector("[data-role='scene-input']").value = scene;
    });
    sceneChips.appendChild(chip);
  });

  const fashionProducts = PRODUCTS.filter((p) => p.category === "服饰");
  fashionProducts.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} - ¥${p.price}`;
    productSelect.appendChild(opt);
  });

  const uploadArea = document.querySelector("[data-role='upload-area']");
  const fileInput = document.querySelector("[data-role='file-input']");
  const uploadPlaceholder = document.querySelector("[data-role='upload-placeholder']");
  const uploadPreview = document.querySelector("[data-role='upload-preview']");
  const privacyWarning = document.querySelector("[data-role='privacy-warning']");

  uploadArea.addEventListener("click", () => fileInput.click());
  
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });
  
  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });
  
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageFile(file);
    }
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleImageFile(file);
  });

  function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedImage = e.target.result;
      uploadPreview.src = uploadedImage;
      uploadPreview.hidden = false;
      uploadPlaceholder.hidden = true;

      hasFace = detectFaceInImage();
      privacyWarning.hidden = !hasFace;
    };
    reader.readAsDataURL(file);
  }

  const form = document.querySelector("[data-role='upload-form']");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    
    if (!uploadedImage) {
      return toast("请上传照片", "需要上传穿搭照片才能发布");
    }

    const fd = new FormData(form);
    const productId = String(fd.get("productId") || "");
    if (!productId) {
      return toast("请选择商品", "请选择你购买的关联商品");
    }

    const product = productById(productId);
    const user = getUser();

    addOutfit({
      userId: user?.email || "guest",
      userName: user?.name || "匿名用户",
      image: uploadedImage,
      height: fd.get("height") || null,
      size: fd.get("size") || "",
      scene: selectedScene,
      productId: productId,
      productName: product?.name || "",
      content: fd.get("content") || "",
      hasFace: hasFace
    });

    toast("发布成功", "你的穿搭晒单已发布");
    closeUploadModal();
    renderOutfits();
    resetUploadForm();
  });
}

function resetUploadForm() {
  const form = document.querySelector("[data-role='upload-form']");
  form.reset();
  uploadedImage = "";
  selectedScene = "";
  hasFace = false;
  
  document.querySelector("[data-role='upload-preview']").hidden = true;
  document.querySelector("[data-role='upload-placeholder']").hidden = false;
  document.querySelector("[data-role='privacy-warning']").hidden = true;
  document.querySelectorAll("[data-role='scene-chips'] .chip").forEach((c) => c.classList.remove("active"));
  document.querySelector("[data-role='scene-input']").value = "";
}

function openUploadModal() {
  document.querySelector("[data-role='upload-modal']").classList.add("show");
}

function closeUploadModal() {
  document.querySelector("[data-role='upload-modal']").classList.remove("show");
}

function openDetailModal(outfit) {
  const modal = document.querySelector("[data-role='detail-modal']");
  const body = document.querySelector("[data-role='detail-body']");
  const title = document.querySelector("[data-role='detail-title']");
  
  const product = productById(outfit.productId);
  title.textContent = `${outfit.userName}的穿搭晒单`;
  
  body.innerHTML = `
    <div class="outfit-detail">
      <div class="outfit-detail-image">
        <img src="${escapeHTML(outfit.image)}" alt="穿搭晒单" />
        ${outfit.hasFace ? `
          <div class="privacy-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 9v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            </svg>
            <span>此照片包含人脸，请注意隐私保护</span>
          </div>
        ` : ""}
      </div>
      <div class="outfit-detail-info">
        <div class="outfit-user" style="margin-bottom:16px;">
          <div class="outfit-avatar">${escapeHTML(outfit.userName.charAt(0))}</div>
          <div>
            <div class="outfit-username">${escapeHTML(outfit.userName)}</div>
            <div class="outfit-time">${formatDate(outfit.createdAt)}</div>
          </div>
          ${outfit.featured ? `<span class="chip" style="margin-left:auto;">✨ 运营精选</span>` : ""}
        </div>
        
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
          ${outfit.height ? `<span class="chip">身高 ${outfit.height}cm</span>` : ""}
          ${outfit.size ? `<span class="chip">尺码 ${outfit.size}</span>` : ""}
          ${outfit.scene ? `<span class="chip">${escapeHTML(outfit.scene)}</span>` : ""}
        </div>
        
        ${outfit.content ? `<p style="margin-bottom:16px; line-height:1.8;">${escapeHTML(outfit.content)}</p>` : ""}
        
        <div class="outfit-product" data-action="view-product" style="cursor:pointer;">
          <img src="${productImageUrl(product || { category: "服饰" }, { w: 120, h: 120 })}" alt="" />
          <div class="outfit-product-info">
            <div class="outfit-product-name">${escapeHTML(product?.name || outfit.productName)}</div>
            <div class="outfit-product-price">${product ? formatPrice(product.price) : ""}</div>
          </div>
          <div class="outfit-product-arrow">去购买 →</div>
        </div>
        
        <div style="margin-top:16px; display:flex; gap:12px;">
          <button class="btn primary" type="button" data-action="view-product-detail" data-id="${outfit.productId}">查看商品详情</button>
          <button class="btn" type="button" data-action="close-detail">关闭</button>
        </div>
      </div>
    </div>
  `;
  
  modal.classList.add("show");
  
  body.querySelector("[data-action='view-product']")?.addEventListener("click", () => {
    window.location.href = resolveProductLink(outfit.productId);
  });
  
  body.querySelector("[data-action='view-product-detail']")?.addEventListener("click", () => {
    window.location.href = resolveProductLink(outfit.productId);
  });
  
  body.querySelector("[data-action='close-detail']")?.addEventListener("click", closeDetailModal);
}

function closeDetailModal() {
  document.querySelector("[data-role='detail-modal']").classList.remove("show");
}

function bindEvents() {
  document.querySelector("[data-role='upload-btn']").addEventListener("click", openUploadModal);
  document.querySelector("[data-role='modal-close']").addEventListener("click", closeUploadModal);
  document.querySelector("[data-role='modal-cancel']").addEventListener("click", closeUploadModal);
  document.querySelector("[data-role='modal-backdrop']").addEventListener("click", closeUploadModal);
  
  document.querySelector("[data-role='detail-close']").addEventListener("click", closeDetailModal);
  document.querySelector("[data-role='detail-backdrop']").addEventListener("click", closeDetailModal);

  document.querySelector("[data-role='filter-tabs']").addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (!tab) return;
    
    document.querySelectorAll("[data-role='filter-tabs'] .tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.filter;
    renderOutfits();
  });

  document.querySelector("[data-role='sorter']").addEventListener("change", (e) => {
    currentSort = e.target.value;
    renderOutfits();
  });

  const grid = document.querySelector("[data-role='outfit-grid']");
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".outfit-card");
    if (!card) return;
    
    const actionEl = e.target.closest("[data-action]");
    const action = actionEl?.dataset.action;
    const id = card.dataset.id;
    const productId = card.dataset.productId;

    if (action === "like" && id) {
      const res = toggleLike(id, getVisitorId());
      const btn = actionEl;
      btn.classList.toggle("liked", res.has);
      btn.querySelector("span").textContent = res.count;
      toast(res.has ? "已点赞" : "已取消", `感谢你的支持`);
      return;
    }

    if (action === "share") {
      toast("分享功能", "演示：可生成分享海报或链接");
      return;
    }

    if (action === "view-product" && productId) {
      window.location.href = resolveProductLink(productId);
      return;
    }

    if (action === "view-detail" && id) {
      const outfit = getOutfits().find((o) => o.id === id);
      if (outfit) openDetailModal(outfit);
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeUploadModal();
      closeDetailModal();
    }
  });
}

function parseURLParams() {
  const sp = new URLSearchParams(window.location.search);
  const productId = sp.get("productId");
  if (productId) {
    currentProductId = productId;
    
    const productSelect = document.querySelector("[data-role='product-select']");
    if (productSelect) {
      for (let opt of productSelect.options) {
        if (opt.value === productId) {
          opt.selected = true;
          break;
        }
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initSampleOutfits();
  parseURLParams();
  initUploadForm();
  renderOutfits();
  bindEvents();

  window.addEventListener("resize", () => {
    renderOutfits();
  });
});
