'use strict';

const articles = [
  {id:'useless',category:'哲学',title:'「无用之用」，是对生活的另一种回答',excerpt:'从庄子的一棵树出发，重新想象那些无法被效率衡量的事。',author:'墨愚编辑部',art:'philosophy',date:'创刊号',lead:'我们习惯问一件事有什么用，却很少问：是谁决定了「有用」的尺度？',paragraphs:[
    '一个空闲的下午，你读了几页书，然后望着窗外发呆。到了晚上，有人问你今天做了什么。你想了想，回答：「好像什么也没做。」可那几页书带来的疑问、窗外缓慢移动的云，真的什么都没有留下吗？',
    '庄子的文字里，树木的故事反复出现。某些树因为不适合被加工成器具，反而得以长久地生长。这里的启发，不是把「有用」简单翻转成坏事，而是提醒我们：一个对象的价值，不必被某一种用途完全定义。',
    '当学习只被看成通往职位的手段，当散步也要完成步数指标，我们当然可能变得更有效率。但效率回答的是「怎样更快到达」，而不是「为什么要去那里」。如果不为第二个问题保留位置，生活就容易成为一张不断更新、却从未被审视的待办清单。',
    '这并不意味着可以忽略生计、责任和现实限制。一个需要同时打几份工的人，未必拥有随意发呆的下午。谈论无用之美，也应当追问：谁拥有闲暇，谁的时间一直被占用？把慢生活当成个人选择，可能遮住了不同处境之间的距离。',
    '也许我们能做的，是先给生活留下一小块不必交代成果的地方。写一段不会发表的文字，听完一位朋友漫长的叙述，或者在回家的路上绕一点远。它们不需要立刻证明自己的意义。',
    '问题仍然开放：当一种美无法被量化，它是否就不值得被保留？而当我们开始保留它，又能否让更多人也拥有这份余地？'
  ]},
  {id:'city',category:'社会',title:'在一座城市里，如何成为「我们」？',excerpt:'从一条街道的日常，看见陌生人之间，那些微小而真实的联结。',author:'墨愚编辑部',art:'city',image:'assets/city.jpg',alt:'暮色中层叠的城市建筑与街灯',date:'创刊号',lead:'一座城市不只是楼房的集合，也是人与人之间，尚未被说出口的关系。',paragraphs:[
    '搬进一座新的城市，最先熟悉的往往不是地标，而是门口的小店、每天经过的路口，以及某个总在同一时间出现的人。地图告诉我们自己在哪里，重复的日常则慢慢告诉我们，自己与这里有什么关系。',
    '我们常用「归属感」描述这种关系。但归属不是一句可以立即确认的宣言，它更像一种逐渐形成的信任：遇到困难时，有没有人愿意停下来；提出意见时，会不会被认真听见；在公共空间里，能不能自在地待着。',
    '因此，讨论城市生活不能只看漂亮的天际线。一条路是否允许老人慢慢走，一处休息的地方是否必须消费，一张指示牌能否被不同的人读懂，都在决定谁能自然地参与日常。',
    '陌生人之间的联结，不一定从宏大的共同理想开始。有时只是为后来的人留一扇门，在雨天借出一把伞，或者在邻居说话时，不急着把对方归入某一类。',
    '当然，善意不能替代公共服务与公平的规则。把所有问题都交给个人温柔，也是一种偷懒。我们既需要彼此照看，也需要能够让照看不那么困难的制度和空间。',
    '当「这里」不再只是租住的地址，而成为一个可以共同提出问题、共同做出改变的地方，某种「我们」或许才刚刚开始。'
  ]},
  {id:'mountain',category:'文学',title:'山色不言，而万物自有回声',excerpt:'把脚步交给山野，把片刻还给自己。写给每一个偶尔想远行的人。',author:'墨愚编辑部',art:'mountain',image:'assets/mountains.jpg',alt:'云雾与浅雪之间静默的群山',date:'创刊号',lead:'离开熟悉的路，不一定为了抵达远方。有时，只是为了重新感觉脚下。',paragraphs:[
    '清晨的山路尚有水汽。鞋底踩在潮湿的石头上，发出很轻的声音。没有消息需要回复，也没有一块屏幕告诉我应该向哪里看。风经过树梢，树叶各自响着，像一封不着急读完的信。',
    '在城里，我们习惯为每一次出发安排目的。去哪里、多久到、能看见什么。可是山路的转弯并不因此缩短，云也不会为了配合行程而散开。走了一段，便渐渐放弃催促。',
    '有一棵树长在岩石的缝隙里。它没有名字，至少我不知道它的名字。站在树旁的那一刻，我忽然觉得，不知道也很好。不必立刻检索，不必马上理解，不必把一次相遇转成可被收藏的知识。',
    '所谓安静，并不是万籁俱寂。它也许是鸟鸣、流水和远处脚步同时存在，而我终于不再要求其中某一种声音盖过其余。世界没有变少，只是注意力不再那么拥挤。',
    '回程时，太阳已经越过山脊。我没有得到一个崭新的人生答案，只把一片落叶夹进书里。晚些时候，在拥挤的车厢中翻开它，纸页间仍仿佛有一点风。',
    '或许这就足够了。山色不言，却让我们重新听见，自己如何与万物一起呼吸。'
  ]},
  {id:'history',category:'历史',title:'一张旧照片，如何成为我们的历史？',excerpt:'在看见与理解之间，还有关于出处、记忆和讲述的漫长距离。',author:'墨愚编辑部',art:'history',image:'assets/history.webp',alt:'原始品牌参考图中的历史人物合影',date:'影像札记 001',lead:'照片保存了一个瞬间，却不会自动交代那个瞬间的全部。',paragraphs:[
    '看一张旧照片，我们很容易先被表情、服饰和光线吸引。它们与今天既遥远又相似。但一张图像能证明什么，不能证明什么，往往比第一眼的感受更值得停下来追问。',
    '是谁按下快门？照片拍摄于何地、何时？它最初被保存在哪里，又经过了怎样的复制与传播？如果这些信息尚未核实，我们就不应该凭画面风格，为它安上一个确定的事件名称。',
    '图像的标题同样会改变观看。当同一张照片被配上不同的文字，人物可能被讲述为主角，也可能只剩时代的背景。阅读历史影像，既是在看可见的内容，也是在辨认讲述者选择了哪些线索。',
    '因此，可靠的回望需要不止一类材料：档案、当时的记录、后来的研究，以及彼此可能冲突的个人记忆。它们不是简单拼成一个无缝的故事，而是帮助我们知道，哪些结论较为稳固，哪些仍应保留疑问。',
    '本页配图来自墨愚的品牌视觉参考，目前没有附带可核验的完整出处。我们保留它作为一次观看的起点，而不是把它当作某一具体历史事件的证据。',
    '尊重历史，有时正从一句「我们还不知道」开始。承认这点空白，不是拒绝理解，而是让理解拥有更诚实的基础。'
  ]},
  {id:'freedom',category:'哲学',title:'自由，是拥有选择，还是理解自己的选择？',excerpt:'当选项越来越多，我们是否也拥有了更多决定生活的力量？',author:'墨愚编辑部',art:'philosophy',date:'创刊号',lead:'选择很多，并不必然意味着我们知道自己为什么选择。',paragraphs:[
    '打开一个应用，会有成百上千的内容等待选择。选择的过程看似自由，却也可能被默认设置、排序和过去的习惯悄悄引导。拥有选项，只是讨论自由的起点。',
    '另一层问题在于，我们是否有能力理解选项。信息不完整、时间紧迫、代价无法承受，都可能让形式上的选择与实际上的自主相距甚远。',
    '人并不生活在真空中。我们的愿望由经验塑造，也被关系改变。理解这种影响，不是说个人没有意志，而是帮助我们更认真地辨认哪些愿望值得继续认可。',
    '也许自由包含这样一种练习：在习惯性的行动前停一小会儿，问问自己，这真的是我想要的吗？我能否说明原因，也允许自己在得到新信息后改变？',
    '这样的停顿不能消除所有限制，却可能让我们与限制之间，多出一点思考和协商的空间。'
  ]},
  {id:'podcast-slow',category:'听愚',title:'我们为什么，不敢慢下来？',excerpt:'从「有用」的焦虑，聊到无所事事的自由。',author:'听愚 · 节目策划',art:'philosophy',date:'EP.001 · 文字样稿',lead:'这是一份播客对谈的文字样稿，尚未录制音频。',paragraphs:[
    '开场｜你有没有过这样的经历：终于等到一个没有安排的周末，却突然觉得不安？不是有事没做，而是好像必须做点什么，才能证明这段时间没有被浪费。',
    '话题一｜慢下来，为什么会有负罪感？我们想从日常经验出发，讨论效率的语言如何进入休息。连休息也被描述为「为了更好地工作」，是否说明我们还没有真正允许自己休息？',
    '话题二｜谁有资格慢下来？同样是空闲，对有些人意味着放松，对另一些人可能意味着收入中断。讨论生活节奏时，应当让不同的劳动经验进入谈话。',
    '话题三｜有没有不需要成果的时间？试着回忆一件没有产生任何可展示结果、却让你觉得值得的事。那种值得，能不能用你自己的语言说出来？',
    '收束｜这次谈话不打算给出「慢生活的五个方法」。我们更希望为一个疑问留下位置：如果暂时不向别人证明时间的价值，你会怎样度过今天剩下的两个小时？'
  ]},
  {id:'podcast-city',category:'听愚',title:'在人群里，重新学习独处',excerpt:'一个人走路的时候，我们在想些什么？',author:'听愚 · 节目策划',art:'city',date:'EP.002 · 文字样稿',lead:'独处未必等于孤独，热闹也未必带来联结。',paragraphs:[
    '开场｜想象一条你经常独自经过的路。你会戴上耳机，还是听路边的声音？独自走路时，我们究竟是在离开人群，还是以另一种方式进入城市？',
    '话题一｜独处与孤独。一个人待着，有时让人感到自在，有时又让人觉得被遗落。我们想讨论这两种感受的边界，而不急着把其中一种浪漫化。',
    '话题二｜城市允许我们怎样独处？图书馆、公园、河岸和不必消费的长椅，给单独停留的人留下多少位置？空间的设计，也会改变我们理解自己的方式。',
    '话题三｜重新建立联结。真正的联结未必要填满每一分钟。允许朋友沉默，允许自己暂时不在线，可能也是一种关系中的信任。',
    '收束｜下一次一个人散步时，可以试着记住一个微小的细节。不是为了发布，只是为了在回想今天时，拥有一个属于自己的片刻。'
  ]}
];

const $ = (selector) => document.querySelector(selector);
const all = (selector) => [...document.querySelectorAll(selector)];
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const storage = {
  read(key, fallback) { try { const value = localStorage.getItem(`moyu:${key}`); return value ? JSON.parse(value) : fallback; } catch { return fallback; } },
  write(key, value) { try { localStorage.setItem(`moyu:${key}`, JSON.stringify(value)); return true; } catch { return false; } }
};
const storedBookmarks = storage.read('bookmarks', []);
let bookmarks = new Set(Array.isArray(storedBookmarks) ? storedBookmarks.filter(id => articles.some(a => a.id === id)) : []);
let currentArticle = null;
let currentFilter = '全部';
let showAll = false;
let previousHash = '';
let readerUsesPush = false;
let toastTimer;

function notify(text) {
  $('#toast').textContent = text;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3200);
}
function articleArt(article, index) {
  if (article.image) return `<img src="${article.image}" alt="${article.alt}" width="720" height="440" loading="lazy"><span class="art-number">MOYU / 0${index + 1}</span>`;
  return `<div class="philosophy-art" aria-hidden="true"><span class="art-note">有无相生 · 思辨之间</span><span class="art-character">${article.id === 'freedom' ? '自由' : '无用'}</span><span class="art-number">MOYU / 0${index + 1}</span></div>`;
}
function renderArticles() {
  let list = articles.filter(a => a.category !== '听愚' && (currentFilter === '全部' || a.category === currentFilter));
  if (currentFilter === '全部' && !showAll) list = list.slice(0, 3);
  $('#article-grid').innerHTML = list.map((a, i) => `<article class="article-card"><a href="#article=${a.id}" class="article-visual ${a.art}" aria-label="阅读：${a.title}">${articleArt(a, i)}</a><div class="article-card-copy"><div class="article-meta"><span class="category">${a.category === '哲学' ? '哲学思辨' : a.category === '社会' ? '社会观察' : a.category === '文学' ? '文学随笔' : '历史回望'}</span><span> / </span><span>${a.date}</span></div><h3><a href="#article=${a.id}">${a.title}</a></h3><p class="excerpt">${a.excerpt}</p><div class="article-card-footer"><span>${a.author} · ${Math.max(2, Math.ceil(a.paragraphs.join('').length / 300))} 分钟阅读</span><a class="text-link" href="#article=${a.id}">阅读全文 ${icon('arrow')}</a></div></div></article>`).join('');
  $('#article-count').textContent = `${showAll ? '全部文章' : '本期选读'} · ${String(list.length).padStart(2, '0')} 篇`;
  $('#all-articles').innerHTML = `${showAll ? '返回本期选读' : '浏览全部文章'} ${icon('arrow')}`;
}
all('[data-filter]').forEach(button => button.addEventListener('click', () => {
  currentFilter = button.dataset.filter;
  all('[data-filter]').forEach(b => { const selected = b === button; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', selected); });
  renderArticles();
}));
$('#all-articles').addEventListener('click', () => {
  showAll = !showAll;
  currentFilter = '全部';
  all('[data-filter]').forEach(b => { const selected = b.dataset.filter === '全部'; b.classList.toggle('selected', selected); b.setAttribute('aria-pressed', selected); });
  renderArticles();
});

function renderResultLinks(list, emptyMessage) {
  return list.length ? list.map(a => `<a class="result-link" href="#article=${a.id}"><small>${a.category} / ${a.date}</small><h3>${a.title}</h3></a>`).join('') : `<p class="empty-state">${emptyMessage}</p>`;
}
function updateSearch() {
  const query = $('#search-input').value.trim().toLocaleLowerCase().slice(0, 120);
  const list = articles.filter(a => `${a.title} ${a.category} ${a.excerpt} ${a.paragraphs.join(' ')}`.toLocaleLowerCase().includes(query));
  $('#search-meta').textContent = query ? `找到 ${list.length} 篇相关内容` : '从一个问题开始，或浏览全部内容';
  $('#search-results').innerHTML = renderResultLinks(list, '还没有找到相关文字，换一个关键词试试。');
}
$('#search-open').addEventListener('click', () => { $('#search-dialog').showModal(); updateSearch(); $('#search-input').focus(); });
$('#search-input').addEventListener('input', updateSearch);
$('#shelf-open').addEventListener('click', () => {
  $('#shelf-results').innerHTML = renderResultLinks(articles.filter(a => bookmarks.has(a.id)), '书架还是空的。打开一篇文章，点击「加入书签」，就可以把它留在这里。');
  $('#shelf-dialog').showModal();
});
$('#credits-open').addEventListener('click', () => $('#credits-dialog').showModal());

function updateSaveButton() {
  const saved = currentArticle && bookmarks.has(currentArticle.id);
  $('#save-article span').textContent = saved ? '已收藏 · 移除书签' : '加入书签';
  $('#save-article').setAttribute('aria-pressed', Boolean(saved));
}
function openArticle(id) {
  const article = articles.find(a => a.id === id);
  if (!article) { notify('这篇文章暂不存在，请从阅读室重新选择。'); return; }
  for (const dialog of all('dialog[open]')) if (dialog.id !== 'reader-dialog') dialog.close();
  currentArticle = article;
  $('#reader-content').innerHTML = `<span class="eyebrow">${article.category} / ${article.date}</span><h1 id="reader-title">${article.title}</h1><p class="article-meta">${article.author} · 网站演示样稿</p><p class="reader-lead">${article.lead}</p><div class="reader-body">${article.paragraphs.map(p => `<p>${p}</p>`).join('')}<p class="reader-note">本文为墨愚官网原创演示样稿${article.category === '听愚' ? '，暂未录制音频' : ''}。思考可以继续，答案不必在此刻完成。</p></div>`;
  updateSaveButton();
  if (!$('#reader-dialog').open) $('#reader-dialog').showModal();
  $('#reader-dialog').scrollTop = 0;
  document.title = `${article.title} — 墨愚`;
}
function articleFromHash() {
  const match = location.hash.match(/^#article=([a-z-]+)$/);
  return match ? match[1] : null;
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#article="]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  previousHash = location.hash.startsWith('#article=') ? '' : location.hash;
  readerUsesPush = true;
  history.pushState(null, '', link.getAttribute('href'));
  openArticle(articleFromHash());
});
window.addEventListener('popstate', () => {
  const id = articleFromHash();
  if (id) openArticle(id);
  else if ($('#reader-dialog').open) $('#reader-dialog').close();
});
$('#reader-dialog').addEventListener('close', () => {
  document.title = '墨愚 — 于墨色之间，见思想之光';
  if (articleFromHash()) {
    if (readerUsesPush) history.back();
    else history.replaceState(null, '', `${location.pathname}${location.search}${previousHash}`);
  }
  readerUsesPush = false;
});
$('#save-article').addEventListener('click', () => {
  if (!currentArticle) return;
  const saved = bookmarks.has(currentArticle.id);
  if (saved) bookmarks.delete(currentArticle.id); else bookmarks.add(currentArticle.id);
  const persisted = storage.write('bookmarks', [...bookmarks]);
  updateSaveButton();
  $('#save-article span').textContent = persisted ? (saved ? '已移除书签' : '已收藏 · 移除书签') : '仅本次会话保存';
});
$('#copy-article').addEventListener('click', async () => {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    $('#copy-article').textContent = '文章链接已复制';
  } catch {
    $('#copy-article').textContent = '无法自动复制，请复制浏览器地址';
  }
  setTimeout(() => { $('#copy-article').innerHTML = `复制文章链接 ${icon('arrow')}`; }, 3000);
});
all('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const dialog = all('dialog[open]').at(-1);
  if (!dialog) return;
  event.preventDefault();
  if (dialog.id === 'intro') endIntro();
  else dialog.close();
});
all('dialog:not(.intro)').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));

const opinions = {need:'你为「意义不止一种尺度」留下了一票。',balance:'你选择继续寻找现实与理想的平衡。',thinking:'允许暂时没有答案，也是一种认真。'};
function applyOpinion(value, isNew = false) {
  if (!Object.hasOwn(opinions, value)) return;
  all('[data-opinion]').forEach(b => b.setAttribute('aria-pressed', b.dataset.opinion === value));
  $('#opinion-feedback').textContent = `${opinions[value]}${isNew ? '已保存在此设备，可随时更改。' : '这是你在此设备上留下的想法。'}`;
}
applyOpinion(storage.read('opinion', null));
all('[data-opinion]').forEach(button => button.addEventListener('click', () => {
  const value = button.dataset.opinion;
  const persisted = storage.write('opinion', value);
  applyOpinion(value, true);
  if (!persisted) $('#opinion-feedback').textContent = `${opinions[value]}浏览器阻止了存储，本次选择不会保留。`;
}));

$('#menu-toggle').addEventListener('click', () => {
  const open = $('#main-nav').classList.toggle('is-open');
  $('#menu-toggle').setAttribute('aria-expanded', open);
  $('#menu-toggle').setAttribute('aria-label', open ? '收起导航' : '展开导航');
});
function closeMenu() { $('#main-nav').classList.remove('is-open'); $('#menu-toggle').setAttribute('aria-expanded', 'false'); $('#menu-toggle').setAttribute('aria-label', '展开导航'); }
all('#main-nav a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#main-nav').classList.contains('is-open')) { closeMenu(); $('#menu-toggle').focus(); } });

$('#reading-list').addEventListener('click', () => $('#reading-list-dialog').showModal());
$('#download-reading-list').addEventListener('click', () => {
  const text = '墨愚 · 创刊号延伸书单\n\n1.《庄子》：从《逍遥游》《人间世》开始，理解“无用”的不同语境。\n2.《乡土中国》费孝通：从熟悉的关系出发，思考人与社会。\n3.《看不见的城市》伊塔洛·卡尔维诺：在文学的城市中，重新观察生活的城市。\n4.《瓦尔登湖》亨利·戴维·梭罗：关于独处、日常与生活方式的记录。\n\n这是阅读建议，不是书籍下载。请通过图书馆或正规书店获取原著。\n墨愚 — 保持好奇，允许未知。';
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], {type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url; link.download = '墨愚-创刊号延伸书单.txt';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  $('#download-feedback').textContent = '已发起文本下载。若浏览器拦截下载，也可直接选择并复制上方书单。';
});

let introTimer;
let introExitTimer;
let introLeaving = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function endIntro() {
  if (!$('#intro').open || introLeaving) return;
  introLeaving = true;
  clearTimeout(introTimer);
  $('#intro').classList.add('is-leaving');
  introExitTimer = setTimeout(() => {
    $('#intro').close();
    $('#intro').classList.remove('is-leaving');
    introLeaving = false;
    const id = articleFromHash();
    if (id) openArticle(id);
  }, reducedMotion.matches ? 0 : 550);
}
function playIntro() {
  clearTimeout(introTimer); clearTimeout(introExitTimer);
  introLeaving = false;
  $('#intro').classList.remove('is-leaving');
  if (!$('#intro').open) $('#intro').showModal();
  $('#skip-intro').focus({preventScroll:true});
  introTimer = setTimeout(endIntro, reducedMotion.matches ? 650 : 3600);
}
$('#skip-intro').addEventListener('click', endIntro);
$('#replay-intro').addEventListener('click', playIntro);
$('#intro').addEventListener('cancel', event => { event.preventDefault(); endIntro(); });
function enterHomepage() {
  const url = new URL(location.href);
  if (url.searchParams.get('accountReturn') === '1') {
    url.searchParams.delete('accountReturn');
    history.replaceState(history.state, '', url);
    clearTimeout(introTimer); clearTimeout(introExitTimer);
    if ($('#intro').open) $('#intro').close();
    $('#intro').classList.remove('is-leaving');
    introLeaving = false;
    const id = articleFromHash();
    if (id) openArticle(id);
    return;
  }
  playIntro();
}
window.addEventListener('pageshow', event => { if (event.persisted) enterHomepage(); });
$('#year').textContent = new Date().getFullYear();
renderArticles();
enterHomepage();