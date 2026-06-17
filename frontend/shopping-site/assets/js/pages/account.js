/*
  pages/account.js
  - 登录/注册选项卡（演示）
  - localStorage 保存用户信息
*/

import { getUser, logout, setUser } from "../user-store.js";
import { toast } from "../app.js";
import { getOutfits, deleteOutfit, toggleFeature, initSampleOutfits } from "../outfit-store.js";
import { productById } from "../product-data.js";
import { productImageUrl, formatPrice } from "../ui-products.js";

function initTabs() {
  const tabs = document.querySelector("[data-role='account-tabs']");
  const panels = document.querySelectorAll("[data-role='account-panel']");
  if (!tabs || panels.length === 0) return;

  function active(name) {
    tabs.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.name === name));
    panels.forEach((p) => (p.style.display = p.dataset.name === name ? "" : "none"));
  }

  tabs.addEventListener("click", (e) => {
    const t = e.target.closest(".tab");
    if (!t) return;
    active(t.dataset.name);
  });

  active("login");
}

function renderAccount() {
  const wrap = document.querySelector("[data-role='account-wrap']");
  if (!wrap) return;
  const u = getUser();
  initSampleOutfits();

  wrap.innerHTML = `
    <div class="card pad" style="margin-bottom:20px;">
      <div class="panel-title">账户中心</div>
      ${
        u
          ? `
            <div class="notice"><strong>已登录：</strong>${escapeHTML(u.name)}（${escapeHTML(u.email)}）</div>
            <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
              <a class="btn primary" href="./orders.html">查看订单</a>
              <a class="btn" href="./outfits.html">去发布晒单</a>
              <button class="btn" type="button" data-action="toggle-admin">
                ${u.email === "admin@aurora.shop" ? "退出运营模式" : "进入运营模式"}
              </button>
              <button class="btn danger" type="button" data-action="logout">退出登录</button>
            </div>
          `
            : `
            <div class="notice"><strong>提示：</strong>这里是静态演示登录，不接入后端。</div>
            <div class="tabs" data-role="account-tabs" style="margin-top:12px;">
              <button class="tab active" type="button" data-name="login">登录</button>
              <button class="tab" type="button" data-name="register">注册</button>
            </div>
            <div data-role="account-panel" data-name="login">
              <form class="form" data-role="login-form">
                <div class="field"><label>邮箱</label><input name="email" placeholder="name@example.com" required /></div>
                <div class="field"><label>昵称</label><input name="name" placeholder="请输入昵称" required /></div>
                <div class="hint" style="margin-top:8px; font-size:12px;">提示：使用 admin@aurora.shop 登录可体验运营模式</div>
                <button class="btn primary" type="submit">登录（演示）</button>
              </form>
            </div>
            <div data-role="account-panel" data-name="register" style="display:none;">
              <form class="form" data-role="register-form">
                <div class="field"><label>邮箱</label><input name="email" placeholder="name@example.com" required /></div>
                <div class="field"><label>昵称</label><input name="name" placeholder="请输入昵称" required /></div>
                <div class="notice"><strong>说明：</strong>注册后自动登录。</div>
                <button class="btn primary" type="submit">注册并登录</button>
              </form>
            </div>
          `
        }
    </div>

    ${u ? renderUserOutfits(u) : ""}
    ${u && u.email === "admin@aurora.shop" ? renderAdminPanel() : ""}

    ${!u ? `
    <div class="card pad">
      <div class="panel-title">安全与隐私</div>
      <div class="list">
        <div class="item"><div><div style="font-weight:800;">不保存密码</div><div class="desc">演示项目仅保存昵称与邮箱，不涉及真实认证。</div></div><div class="tag"><span class="chip">演示</span></div></div>
        <div class="item"><div><div style="font-weight:800;">本地存储</div><div class="desc">使用 localStorage 保存登录态/购物车/订单。</div></div><div class="tag"><span class="chip">localStorage</span></div></div>
        <div class="item"><div><div style="font-weight:800;">可扩展</div><div class="desc">可对接后端 API，实现真实登录与支付。</div></div><div class="tag"><span class="chip">可扩展</span></div></div>
      </div>
    </div>
    ` : ""}
  `;

  bindForms();
  initTabs();
  bindOutfitActions();
}

function renderUserOutfits(u) {
  const userOutfits = getOutfits({ userId: u.email });
  
  return `
    <div class="card pad" style="margin-bottom:20px;">
      <div class="panel-title">我的晒单 (${userOutfits.length})</div>
      ${userOutfits.length > 0 ? `
        <div class="outfit-masonry--small" style="margin-top:12px;">
          ${userOutfits.map((o) => {
            const product = productById(o.productId);
            return `
              <article class="outfit-card" style="position:static; width:auto; left:auto; top:auto;">
                <div class="outfit-image-wrap">
                  <img class="outfit-image" src="${escapeHTML(o.image)}" alt="我的晒单" loading="lazy" />
                  <div class="outfit-badges">
                    ${o.featured ? `<span class="outfit-badge outfit-badge--featured">✨ 精选</span>` : ""}
                    ${o.hasFace ? `<span class="outfit-badge outfit-badge--warn">⚠ 隐私提示</span>` : ""}
                  </div>
                </div>
                <div class="outfit-body">
                  <div class="outfit-meta">
                    ${o.height ? `<span class="chip chip--sm">${o.height}cm</span>` : ""}
                    ${o.size ? `<span class="chip chip--sm">${o.size}</span>` : ""}
                    ${o.scene ? `<span class="chip chip--sm">${escapeHTML(o.scene)}</span>` : ""}
                  </div>
                  ${o.content ? `<p class="outfit-content">${escapeHTML(o.content)}</p>` : ""}
                  <div class="outfit-product">
                    <img src="${productImageUrl(product || { category: "服饰" }, { w: 80, h: 80 })}" alt="" />
                    <div class="outfit-product-info">
                      <div class="outfit-product-name" style="font-size:12px;">${escapeHTML(product?.name || o.productName)}</div>
                      <div class="outfit-product-price" style="font-size:12px;">${product ? formatPrice(product.price) : ""}</div>
                    </div>
                  </div>
                  <div style="display:flex; gap:8px; margin-top:10px;">
                    <button class="btn btn--sm danger" type="button" data-action="delete-outfit" data-id="${o.id}" style="flex:1; padding:6px 10px; font-size:12px;">删除晒单</button>
                  </div>
                  <div class="outfit-time" style="margin-top:8px; text-align:right;">发布于 ${new Date(o.createdAt).toLocaleDateString()}</div>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      ` : `
        <div class="notice" style="text-align:center; padding:30px 20px; margin-top:12px;">
          <strong>你还没有发布过晒单</strong>
          <p style="margin-top:8px; color:var(--muted);">分享你的穿搭，帮助更多买家做决策～</p>
          <a class="btn primary" style="margin-top:12px;" href="./outfits.html">去发布晒单</a>
        </div>
      `}
    </div>
  `;
}

function renderAdminPanel() {
  const allOutfits = getOutfits();
  const featuredCount = allOutfits.filter((o) => o.featured).length;
  
  return `
    <div class="card pad" style="margin-bottom:20px; border:2px solid var(--brand);">
      <div class="panel-title" style="color:var(--brand);">
        🛠 运营管理后台
        <span class="chip" style="margin-left:8px; background:var(--brand-soft);">共 ${allOutfits.length} 条晒单 · ${featuredCount} 条精选</span>
      </div>
      <div class="notice" style="margin-top:12px;">
        <strong>运营说明：</strong>你可以精选优质晒单展示在瀑布流顶部，但<span style="color:var(--danger); font-weight:600;">不能修改用户的原始评价内容</span>。
      </div>
      <div style="margin-top:16px;">
        ${allOutfits.map((o) => {
          const product = productById(o.productId);
          return `
            <div class="admin-outfit-item" style="display:flex; gap:16px; padding:16px; border:1px solid var(--border); border-radius:var(--radius-sm); margin-bottom:12px; background:var(--bg);">
              <img src="${escapeHTML(o.image)}" alt="" style="width:100px; height:140px; object-fit:cover; border-radius:8px; flex-shrink:0;" />
              <div style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                  <strong>${escapeHTML(o.userName)}</strong>
                  <span class="chip chip--sm">${new Date(o.createdAt).toLocaleDateString()}</span>
                  ${o.featured ? `<span class="chip chip--sm" style="background:var(--brand-soft); color:var(--brand);">✨ 已精选</span>` : ""}
                  ${o.hasFace ? `<span class="chip chip--sm" style="background:rgba(239,68,68,0.1); color:var(--danger);">⚠ 含人脸</span>` : ""}
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
                  ${o.height ? `<span class="chip chip--sm">${o.height}cm</span>` : ""}
                  ${o.size ? `<span class="chip chip--sm">${o.size}</span>` : ""}
                  ${o.scene ? `<span class="chip chip--sm">${escapeHTML(o.scene)}</span>` : ""}
                </div>
                <div style="margin-bottom:8px; padding:10px; background:var(--panel); border-radius:8px;">
                  <div style="font-size:12px; color:var(--muted); margin-bottom:4px;">用户原始评价（不可修改）：</div>
                  <div style="line-height:1.6;">${escapeHTML(o.content || "（无评价内容）")}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; font-size:13px;">
                  <span style="color:var(--muted);">关联商品：</span>
                  <a href="./product.html?id=${encodeURIComponent(o.productId)}" style="color:var(--brand);">${escapeHTML(product?.name || o.productName)}</a>
                </div>
                <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
                  <button class="btn ${o.featured ? "" : "primary"}" type="button" data-action="toggle-feature" data-id="${o.id}">
                    ${o.featured ? "取消精选" : "设为精选"}
                  </button>
                  <button class="btn danger" type="button" data-action="admin-delete" data-id="${o.id}">删除晒单</button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function bindOutfitActions() {
  const wrap = document.querySelector("[data-role='account-wrap']");
  if (!wrap) return;

  wrap.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id;

    if (action === "delete-outfit" && id) {
      if (confirm("确定要删除这条晒单吗？此操作不可撤销。")) {
        deleteOutfit(id);
        toast("删除成功", "晒单已删除");
        renderAccount();
      }
    }

    if (action === "toggle-feature" && id) {
      const u = getUser();
      const res = toggleFeature(id, u?.name || "运营");
      if (res) {
        toast(res.featured ? "已设为精选" : "已取消精选", `晒单 ${res.featured ? "将" : "不再"}在瀑布流顶部展示`);
        renderAccount();
      }
    }

    if (action === "admin-delete" && id) {
      if (confirm("作为运营，确定要删除这条晒单吗？")) {
        deleteOutfit(id);
        toast("删除成功", "晒单已从平台移除");
        renderAccount();
      }
    }

    if (action === "toggle-admin") {
      const u = getUser();
      if (u && u.email === "admin@aurora.shop") {
        setUser({ name: u.name, email: "user@example.com" });
        toast("已退出运营模式", "已切换为普通用户身份");
      } else {
        setUser({ name: u?.name || "运营", email: "admin@aurora.shop" });
        toast("已进入运营模式", "你现在可以管理和精选晒单");
      }
      renderAccount();
    }
  });
}

function bindForms() {
  const wrap = document.querySelector("[data-role='account-wrap']");
  if (!wrap) return;

  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='logout']");
    if (!btn) return;
    logout();
    toast("已退出登录", "欢迎再次回来");
    renderAccount();
  });

  const login = wrap.querySelector("[data-role='login-form']");
  login?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(login);
    const email = String(fd.get("email") || "").trim();
    const name = String(fd.get("name") || "").trim();
    if (!email || !name) return toast("登录失败", "请输入昵称与邮箱");
    setUser({ email, name });
    toast("登录成功", `欢迎你，${name}`);
    renderAccount();
  });

  const reg = wrap.querySelector("[data-role='register-form']");
  reg?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(reg);
    const email = String(fd.get("email") || "").trim();
    const name = String(fd.get("name") || "").trim();
    if (!email || !name) return toast("注册失败", "请填写信息");
    setUser({ email, name });
    toast("注册成功", "已自动登录");
    renderAccount();
  });
}

function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

renderAccount();

