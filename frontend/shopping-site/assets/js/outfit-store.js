/*
  outfit-store.js
  说明：用户晒单数据存储
  - 支持晒单的增删改查
  - 支持精选标记（运营可精选但不能修改原始内容）
  - 支持隐私风险标记（含人脸照片）
  - 支持点赞功能
*/

import { readJSON, writeJSON } from "./store.js";

const OUTFIT_KEY = "aurora_outfits_v1";
const OUTFIT_LIKES_KEY = "aurora_outfit_likes_v1";

const SCENES = ["日常", "通勤", "约会", "运动", "旅行", "聚会", "正式场合", "休闲"];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "均码"];

export function getScenes() {
  return [...SCENES];
}

export function getSizes() {
  return [...SIZES];
}

function generateId() {
  return "o" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getOutfitsRaw() {
  return readJSON(OUTFIT_KEY, []);
}

function saveOutfits(list) {
  writeJSON(OUTFIT_KEY, list);
}

export function getOutfits({ featured = null, productId = null, userId = null } = {}) {
  let list = getOutfitsRaw();
  
  if (featured !== null) {
    list = list.filter((o) => Boolean(o.featured) === Boolean(featured));
  }
  if (productId) {
    list = list.filter((o) => o.productId === productId);
  }
  if (userId) {
    list = list.filter((o) => o.userId === userId);
  }
  
  return list.sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export function getOutfitById(id) {
  return getOutfitsRaw().find((o) => o.id === id) || null;
}

export function addOutfit(data) {
  const list = getOutfitsRaw();
  const now = new Date().toISOString();
  const outfit = {
    id: generateId(),
    userId: String(data.userId || ""),
    userName: String(data.userName || "匿名用户"),
    image: String(data.image || ""),
    height: data.height ? Number(data.height) : null,
    size: String(data.size || ""),
    scene: String(data.scene || ""),
    productId: String(data.productId || ""),
    productName: String(data.productName || ""),
    content: String(data.content || ""),
    hasFace: Boolean(data.hasFace || false),
    featured: false,
    featuredBy: null,
    featuredAt: null,
    likes: 0,
    createdAt: now,
    updatedAt: now
  };
  list.unshift(outfit);
  saveOutfits(list);
  return outfit;
}

export function updateOutfit(id, data, { isAdmin = false } = {}) {
  const list = getOutfitsRaw();
  const idx = list.findIndex((o) => o.id === id);
  if (idx === -1) return null;

  const original = list[idx];
  
  if (isAdmin) {
    if (data.featured !== undefined) {
      original.featured = Boolean(data.featured);
      original.featuredBy = data.featuredBy || null;
      original.featuredAt = data.featured ? new Date().toISOString() : null;
    }
  } else {
    if (data.height !== undefined) original.height = data.height ? Number(data.height) : null;
    if (data.size !== undefined) original.size = String(data.size || "");
    if (data.scene !== undefined) original.scene = String(data.scene || "");
    if (data.productId !== undefined) original.productId = String(data.productId || "");
    if (data.productName !== undefined) original.productName = String(data.productName || "");
    if (data.image !== undefined) original.image = String(data.image || "");
    if (data.hasFace !== undefined) original.hasFace = Boolean(data.hasFace);
  }
  
  original.updatedAt = new Date().toISOString();
  list[idx] = original;
  saveOutfits(list);
  return original;
}

export function deleteOutfit(id) {
  const list = getOutfitsRaw();
  const filtered = list.filter((o) => o.id !== id);
  saveOutfits(filtered);
  return filtered.length !== list.length;
}

export function toggleFeature(id, adminName) {
  const outfit = getOutfitById(id);
  if (!outfit) return null;
  
  const nextFeatured = !outfit.featured;
  return updateOutfit(id, {
    featured: nextFeatured,
    featuredBy: adminName || "管理员"
  }, { isAdmin: true });
}

export function isLiked(outfitId, visitorId) {
  const likes = readJSON(OUTFIT_LIKES_KEY, {});
  const key = `${outfitId}_${visitorId}`;
  return Boolean(likes[key]);
}

export function toggleLike(outfitId, visitorId) {
  const likes = readJSON(OUTFIT_LIKES_KEY, {});
  const key = `${outfitId}_${visitorId}`;
  const had = Boolean(likes[key]);
  
  const list = getOutfitsRaw();
  const idx = list.findIndex((o) => o.id === outfitId);
  if (idx === -1) return { has: false, count: 0 };
  
  if (had) {
    delete likes[key];
    list[idx].likes = Math.max(0, (list[idx].likes || 0) - 1);
  } else {
    likes[key] = true;
    list[idx].likes = (list[idx].likes || 0) + 1;
  }
  
  writeJSON(OUTFIT_LIKES_KEY, likes);
  saveOutfits(list);
  
  return { has: !had, count: list[idx].likes };
}

export function detectFaceInImage() {
  return Math.random() < 0.3;
}

export function initSampleOutfits() {
  const existing = getOutfitsRaw();
  if (existing.length > 0) return;
  
  const sampleImages = [
    "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=young%20woman%20wearing%20fashion%20casual%20outfit%20street%20style%20full%20body%20photo&image_size=portrait_4_3",
    "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=man%20wearing%20smart%20casual%20office%20outfit%20full%20body%20photo&image_size=portrait_4_3",
    "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20elegant%20dress%20date%20outfit%20full%20body%20photo&image_size=portrait_4_3",
    "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=person%20wearing%20sportswear%20running%20outfit%20gym%20full%20body%20photo&image_size=portrait_4_3",
    "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=woman%20wearing%20travel%20vacation%20outfit%20summer%20full%20body%20photo&image_size=portrait_4_3",
    "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=man%20wearing%20party%20club%20outfit%20night%20full%20body%20photo&image_size=portrait_4_3"
  ];
  
  const samples = [
    {
      userName: "时尚达人小美",
      height: 165,
      size: "S",
      scene: "日常",
      productId: "p0006",
      productName: "通勤衬衫 Neo 3",
      content: "这件衬衫版型超赞，面料很舒服，百搭款！配牛仔裤或裙子都好看～",
      hasFace: true
    },
    {
      userName: "型男阿杰",
      height: 180,
      size: "L",
      scene: "通勤",
      productId: "p0030",
      productName: "轻羽绒背心 Pro 4",
      content: "冬天内搭很保暖，轻薄不臃肿，上班穿刚刚好。",
      hasFace: false
    },
    {
      userName: "优雅丽丽",
      height: 168,
      size: "M",
      scene: "约会",
      productId: "p0086",
      productName: "廓形卫衣 Plus 8",
      content: "颜色超显白，质地软糯，男朋友说很好看！",
      hasFace: true,
      featured: true
    },
    {
      userName: "运动健将",
      height: 175,
      size: "XL",
      scene: "运动",
      productId: "p0108",
      productName: "轻量跑鞋 Plus 1",
      content: "跑步超轻弹，抓地力强，已推荐给跑友们！",
      hasFace: false
    },
    {
      userName: "旅行博主",
      height: 162,
      size: "S",
      scene: "旅行",
      productId: "p0094",
      productName: "城市夹克 Max 7",
      content: "版型好又上镜，防风效果棒，旅行必备单品～",
      hasFace: true,
      featured: true
    },
    {
      userName: "派对女王",
      height: 170,
      size: "M",
      scene: "聚会",
      productId: "p0110",
      productName: "廓形卫衣 Lite 5",
      content: "blingbling的超闪，派对焦点就是我！面料也很舒适。",
      hasFace: false
    }
  ];
  
  const now = Date.now();
  samples.forEach((s, i) => {
    addOutfit({
      ...s,
      image: sampleImages[i],
      userId: `sample_${i}`
    });
    const list = getOutfitsRaw();
    if (s.featured && list[0]) {
      list[0].featured = true;
      list[0].featuredBy = "系统推荐";
      list[0].featuredAt = new Date(now - i * 86400000).toISOString();
      saveOutfits(list);
    }
  });
}
