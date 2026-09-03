import { VapPlayer } from "vapkit";

type GiftItem = {
  id: string;
  name: string;
  price: number;
  asset: string | null;
  emoji: string;
};

const gifts: GiftItem[] = [
  { id: "space_rabbit", name: "星际兔", price: 199, asset: "/gifts/user_246106.mp4", emoji: "🐰" },
  { id: "moon_jade_rabbit", name: "月下玉兔", price: 299, asset: "/gifts/user_245341.mp4", emoji: "🌙" },
  { id: "spark_fist", name: "热血一拳", price: 99, asset: "/gifts/user_2390.mp4", emoji: "✊" },
  { id: "glow_cheer", name: "星光应援", price: 520, asset: "/gifts/user_3123.mp4", emoji: "🌟" },
  { id: "love_petals", name: "告白花语", price: 199, asset: "/gifts/user_3179.mp4", emoji: "💗" },
  { id: "coming_rose", name: "星愿玫瑰", price: 99, asset: null, emoji: "🌹" },
  { id: "coming_car", name: "梦幻跑车", price: 520, asset: null, emoji: "🚗" },
  { id: "coming_castle", name: "水晶城堡", price: 1314, asset: null, emoji: "🏰" },
  { id: "coming_firework", name: "星河烟花", price: 299, asset: null, emoji: "🎆" },
  { id: "coming_crown", name: "加冕皇冠", price: 888, asset: null, emoji: "👑" },
  { id: "coming_rocket", name: "冲天火箭", price: 666, asset: null, emoji: "🚀" },
  { id: "coming_yacht", name: "海上游艇", price: 1888, asset: null, emoji: "🛥️" },
];

const canvas = document.querySelector<HTMLCanvasElement>("#gift")!;
const player = new VapPlayer({ canvas });
player.loop = false;

const commentsEl = document.querySelector("#comments")!;
const giftsEl = document.querySelector("#gifts")!;
const coinsEl = document.querySelector("#coins")!;
const sendEl = document.querySelector<HTMLButtonElement>("#send")!;
const errorEl = document.querySelector("#send-error")!;
const panelEl = document.querySelector("#panel")!;
const closeEl = document.querySelector("#close-panel")!;
const sideEl = document.querySelector("#side-actions")!;
const composerEl = document.querySelector("#composer")!;
const followEl = document.querySelector("#follow")!;
const likeCountEl = document.querySelector("#like-count")!;
const backgroundEl = document.querySelector<HTMLVideoElement>("#background")!;
const muteEl = document.querySelector<HTMLButtonElement>("#mute")!;

const seedComments = ["晚风  这首也太好听了", "阿年  滤镜好可爱", "小北  来了来了"];
let comments = [...seedComments];
let selected = gifts.find((gift) => gift.asset) ?? gifts[0];
let loadedId: string | null = null;
let panelOpen = true;
let following = false;
let coins = 8888;
let likes = 1284;
let bgMuted = true;

player.onStateChanged = (state) => {
  canvas.hidden = state !== "playing";
};

function renderComments(): void {
  commentsEl.innerHTML = comments
    .slice(-4)
    .map((line) => `<span>${line}</span>`)
    .join("");
}

function renderGifts(): void {
  giftsEl.innerHTML = gifts
    .map((gift) => {
      const ready = gift.asset != null;
      const selectedClass = gift.id === selected.id ? " selected" : "";
      const lockedClass = ready ? "" : " locked";
      return `
        <button type="button" class="gift-cell${selectedClass}${lockedClass}" data-id="${gift.id}">
          <div class="emoji">${ready ? gift.emoji : "🔒"}</div>
          <div class="name">${gift.name}</div>
          <div class="price">${ready ? gift.price : "待上架"}</div>
        </button>
      `;
    })
    .join("");
}

function renderChrome(): void {
  coinsEl.textContent = `✦ ${coins}`;
  followEl.textContent = following ? "已关注" : "关注";
  followEl.classList.toggle("following", following);
  likeCountEl.textContent = likes >= 10_000 ? `${(likes / 10_000).toFixed(1)}w` : String(likes);
  backgroundEl.muted = bgMuted;
  muteEl.textContent = bgMuted ? "🔇" : "🔊";
  muteEl.setAttribute("aria-label", bgMuted ? "打开声音" : "关闭声音");
  panelEl.classList.toggle("hidden", !panelOpen);
  closeEl.classList.toggle("hidden", !panelOpen);
  sideEl.classList.toggle("hidden", panelOpen);
  composerEl.classList.toggle("hidden", panelOpen);

  const ready = selected.asset != null;
  sendEl.disabled = !ready || coins < selected.price;
  sendEl.textContent = !ready ? "待上架" : coins < selected.price ? "金币不足" : "送给冬去春来";
}

async function preload(gift: GiftItem): Promise<void> {
  if (!gift.asset) {
    return;
  }
  await player.load(gift.asset);
  loadedId = gift.id;
  errorEl.classList.add("hidden");
}

async function send(): Promise<void> {
  if (!selected.asset) {
    return;
  }
  if (coins < selected.price) {
    errorEl.textContent = "金币不足";
    errorEl.classList.remove("hidden");
    return;
  }
  try {
    if (loadedId !== selected.id) {
      await player.load(selected.asset);
      loadedId = selected.id;
    }
    coins -= selected.price;
    player.loop = false;
    player.play();
    comments = [...comments, `我  送出 ${selected.name}`];
    errorEl.classList.add("hidden");
    panelOpen = false;
    renderComments();
    renderChrome();
  } catch (error) {
    console.error("gift send failed", error);
    errorEl.textContent = "礼物加载失败";
    errorEl.classList.remove("hidden");
  }
}

giftsEl.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-id]");
  if (!button) {
    return;
  }
  const gift = gifts.find((item) => item.id === button.dataset.id);
  if (!gift) {
    return;
  }
  selected = gift;
  renderGifts();
  renderChrome();
  void preload(gift).catch((error) => {
    console.error("gift preload failed", error);
    errorEl.textContent = "礼物加载失败";
    errorEl.classList.remove("hidden");
  });
});

sendEl.addEventListener("click", () => {
  void send();
});
closeEl.addEventListener("click", () => {
  panelOpen = false;
  renderChrome();
});
document.querySelector("#open-gifts-side")?.addEventListener("click", () => {
  panelOpen = true;
  renderChrome();
});
document.querySelector("#open-gifts-bar")?.addEventListener("click", () => {
  panelOpen = true;
  renderChrome();
});
followEl.addEventListener("click", () => {
  following = !following;
  renderChrome();
});
document.querySelector("#like")?.addEventListener("click", () => {
  likes += 1;
  renderChrome();
});
muteEl.addEventListener("click", () => {
  bgMuted = !bgMuted;
  void backgroundEl.play();
  renderChrome();
});

renderComments();
renderGifts();
renderChrome();
void preload(selected).catch((error) => {
  console.error("gift preload failed", error);
  errorEl.textContent = "礼物加载失败";
  errorEl.classList.remove("hidden");
});
