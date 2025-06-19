document.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("loggedUser") || null;
  const nav = document.querySelector("nav");

  // Темы оформления
  const THEMES = {
    light: { '--bg': '#fff', '--text': '#000' },
    dark: { '--bg': '#121212', '--text': '#eee' }
  };
  function applyTheme(t) {
    const theme = THEMES[t] || THEMES.light;
    Object.entries(theme).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  }
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);

  // Переключение темы
  const btn = document.createElement("button");
  btn.textContent = "🌓 Тема";
  btn.onclick = () => {
    const next = savedTheme === "light" ? "dark" : "light";
    localStorage.setItem("theme", next);
    location.reload();
  };
  nav?.appendChild(btn);

  // Регистрация
  const regForm = document.getElementById("register-form");
  regForm?.addEventListener("submit", e => {
    e.preventDefault();
    const { username, password } = regForm;
    let users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.find(u => u.username === username.value.trim())) return alert("Уже есть такой");
    users.push({ username: username.value.trim(), password: password.value });
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("loggedUser", username.value.trim());
    location.href = "index.html";
  });

  // Вход
  const loginForm = document.getElementById("login-form");
  loginForm?.addEventListener("submit", e => {
    e.preventDefault();
    const { username, password } = loginForm;
    let users = JSON.parse(localStorage.getItem("users") || "[]");
    const u = users.find(u => u.username === username.value.trim() && u.password === password.value);
    if (u) {
      localStorage.setItem("loggedUser", u.username);
      location.href = "index.html";
    } else alert("Неверно");
  });

  // Создание статьи
  const create = document.getElementById("create-post");
  if (create) {
    const draft = JSON.parse(localStorage.getItem("draft") || "{}");
    create.title.value = draft.title || "";
    create.content.value = draft.content || "";
    create.category.value = draft.category || "";
    create.tags.value = draft.tags || "";
    create.image.value = draft.image || "";

    create.addEventListener("input", () => {
      localStorage.setItem("draft", JSON.stringify({
        title: create.title.value,
        content: create.content.value,
        category: create.category.value,
        tags: create.tags.value,
        image: create.image.value
      }));
    });

    create.addEventListener("submit", e => {
      e.preventDefault();
      const posts = JSON.parse(localStorage.getItem("posts") || "[]");
      posts.push({
        id: Date.now(),
        title: create.title.value,
        content: create.content.value,
        category: create.category.value,
        tags: create.tags.value.split(',').map(t => t.trim()),
        image: create.image.value,
        likes: 0,
        author: user || "Гость",
        date: new Date().toLocaleString()
      });
      localStorage.removeItem("draft");
      localStorage.setItem("posts", JSON.stringify(posts));
      location.href = "index.html";
    });
  }

  // Отображение всех постов
  const postsContainer = document.getElementById("posts-container");
  if (postsContainer) {
    const posts = JSON.parse(localStorage.getItem("posts") || "[]").reverse();
    const cats = new Set(), tags = new Set();

    posts.forEach(p => {
      cats.add(p.category);
      p.tags.forEach(t => tags.add(t));
    });

    // Фильтры
    const filterCat = document.getElementById("filter-category");
    const filterTag = document.getElementById("filter-tag");
    cats.forEach(c => filterCat?.insertAdjacentHTML("beforeend", `<option>${c}</option>`));
    tags.forEach(t => filterTag?.insertAdjacentHTML("beforeend", `<option>${t}</option>`));

    function renderFiltered() {
      const selectedCat = filterCat?.value;
      const selectedTag = filterTag?.value;
      const query = (document.getElementById("search")?.value || "").toLowerCase();
      postsContainer.innerHTML = "";
      posts.forEach(p => {
        const match = (!selectedCat || p.category === selectedCat) &&
                      (!selectedTag || p.tags.includes(selectedTag)) &&
                      (p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query));
        if (match) {
          postsContainer.innerHTML += `
            <div class="article-preview">
              <h3><a href="post.html?id=${p.id}">${p.title}</a></h3>
              ${p.image ? `<img src="${p.image}" style="max-width:100%">` : ""}
              <p><small>${p.author} | ${p.date}</small></p>
              <p>${p.category} | ${p.tags.join(', ')}</p>
            </div>`;
        }
      });
    }

    filterCat?.addEventListener("change", renderFiltered);
    filterTag?.addEventListener("change", renderFiltered);
    document.getElementById("search")?.addEventListener("input", renderFiltered);
    renderFiltered();

    document.getElementById("random-post")?.addEventListener("click", () => {
      if (posts.length) {
        const rand = posts[Math.floor(Math.random() * posts.length)];
        location.href = `post.html?id=${rand.id}`;
      }
    });
  }

  // Одна статья
  const postView = document.getElementById("post-content");
  if (postView) {
    const id = new URLSearchParams(location.search).get("id");
    const posts = JSON.parse(localStorage.getItem("posts") || "[]");
    const post = posts.find(p => p.id == id);
    if (post) {
      const md = s => s.replace(/^### (.*$)/gim, '<h3>$1</h3>')
                       .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                       .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                       .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
                       .replace(/\*(.*)\*/gim, '<i>$1</i>')
                       .replace(/\`(.*?)\`/g, '<code>$1</code>')
                       .replace(/\n/g, "<br>");
      postView.innerHTML = `
        <h2>${post.title}</h2>
        ${post.image ? `<img src="${post.image}" style="max-width:100%">` : ""}
        <p><small>${post.author} | ${post.date}</small></p>
        <div>${md(post.content)}</div>
        <p><b>${post.category}</b> — <i>${post.tags.join(', ')}</i></p>
        <p><button onclick="likePost(${post.id})">❤️ ${post.likes || 0}</button></p>
        ${user === post.author ? `<button onclick="deletePost(${post.id})">Удалить</button>` : ""}
      `;
    }
  }

  // Комментарии
  const commentForm = document.getElementById("comment-form");
  const commentList = document.getElementById("comments-list");
  if (commentForm && commentList) {
    const postId = new URLSearchParams(location.search).get("id");
    const comments = JSON.parse(localStorage.getItem("comments") || "{}");
    const list = comments[postId] || [];
    commentList.innerHTML = list.map(c => `<p><b>${c.author}</b>: ${c.text}</p>`).join("");

    commentForm.addEventListener("submit", e => {
      e.preventDefault();
      const comment = commentForm.comment.value.trim();
      if (!comment) return;
      const entry = { author: user || "Гость", text: comment };
      const all = JSON.parse(localStorage.getItem("comments") || "{}");
      if (!all[postId]) all[postId] = [];
      all[postId].push(entry);
      localStorage.setItem("comments", JSON.stringify(all));
      location.reload();
    });
  }

  // Мои статьи
  const userPosts = document.getElementById("user-posts");
  if (userPosts && user) {
    const posts = JSON.parse(localStorage.getItem("posts") || "[]").reverse();
    const mine = posts.filter(p => p.author === user);
    userPosts.innerHTML = mine.map(p => `<div><a href="post.html?id=${p.id}">${p.title}</a></div>`).join("");
  }
});

function likePost(id) {
  const posts = JSON.parse(localStorage.getItem("posts") || "[]");
  const idx = posts.findIndex(p => p.id == id);
  if (idx >= 0) {
    posts[idx].likes = (posts[idx].likes || 0) + 1;
    localStorage.setItem("posts", JSON.stringify(posts));
    location.reload();
  }
}

function deletePost(id) {
  if (confirm("Удалить статью?")) {
    const posts = JSON.parse(localStorage.getItem("posts") || "[]");
    localStorage.setItem("posts", JSON.stringify(posts.filter(p => p.id != id)));
    location.href = "index.html";
  }
}
