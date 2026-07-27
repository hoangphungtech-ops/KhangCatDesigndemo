const STATUS_FROM_API = {
  new: "Mới tiếp nhận",
  contacted: "Đã liên hệ",
  survey: "Khảo sát",
  quoted: "Báo giá",
  design: "Thiết kế",
  construction: "Thi công",
  completed: "Hoàn thành",
};

function getAdminApiKey() {
  let key = sessionStorage.getItem("khangcat_admin_key") || "";
  if (!key && location.protocol !== "file:") {
    key = prompt("Nhập mã quản trị:") || "";
    if (key) sessionStorage.setItem("khangcat_admin_key", key);
  }
  return key;
}

export function initAdminClient() {
  document.querySelector("[data-open-admin]")?.addEventListener("click", openAdmin);
  document.querySelector("[data-open-client]")?.addEventListener("click", () => document.querySelector("[data-client-panel]")?.showModal());
  document.querySelector("[data-admin-close]")?.addEventListener("click", () => document.querySelector("[data-admin-panel]")?.close());
  document.querySelector("[data-client-close]")?.addEventListener("click", () => document.querySelector("[data-client-panel]")?.close());
  document.querySelector("[data-client-form]")?.addEventListener("submit", lookupClient);
  document.querySelector("[data-test-mail]")?.addEventListener("click", testAdminEmail);
}

async function openAdmin() {
  const panel = document.querySelector("[data-admin-panel]");
  const body = document.querySelector("[data-admin-body]");
  panel?.showModal();
  body.innerHTML = "<p>Đang tải dashboard...</p>";
  try {
    const key = getAdminApiKey();
    if (!key) return;
    const response = await fetch("/api/admin/requests", { headers: { Authorization: `Bearer ${key}` } });
    if (!response.ok) throw new Error("Không mở được Dashboard. Kiểm tra mã admin.");
    const result = await response.json();
    const rows = result.requests || [];
    body.innerHTML = `
      <div class="dashboard-mini">
        <h3>Có ${rows.filter((item) => item.status === "new").length} yêu cầu mới</h3>
        <button class="btn btn-primary" data-test-mail type="button">Test mail admin</button>
      </div>
      <div class="admin-list">
        ${rows.map((item, idx) => `
          <article>
            <b>${String(idx + 1).padStart(2, "0")} — ${item.code}</b>
            <h4>${item.name}</h4>
            <p>${item.phone} / ${item.email}</p>
            <p>${item.project}</p>
            <small>${STATUS_FROM_API[item.status] || item.status} · ${new Date(item.date).toLocaleString("vi-VN")}</small>
          </article>
        `).join("") || "<p>Chưa có yêu cầu.</p>"}
      </div>
    `;
    body.querySelector("[data-test-mail]")?.addEventListener("click", testAdminEmail);
  } catch (error) {
    body.innerHTML = `<p>${error.message}</p>`;
  }
}

async function testAdminEmail() {
  const body = document.querySelector("[data-admin-body]");
  try {
    const key = getAdminApiKey();
    const response = await fetch("/api/admin/test-email", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "Không gửi được email test.");
    const delivered = result.result?.delivered?.map((item) => item.recipient).join(", ") || "OK";
    alert(`Resend đã nhận gửi tới admin: ${delivered}`);
  } catch (error) {
    alert(error.message);
    if (body) body.insertAdjacentHTML("afterbegin", `<p style="color:#9b6a46">${error.message}</p>`);
  }
}

async function lookupClient(event) {
  event.preventDefault();
  const phone = String(new FormData(event.currentTarget).get("phone") || "").replace(/\D/g, "").replace(/^84/, "0");
  const resultBox = document.querySelector("[data-client-result]");
  resultBox.textContent = "Đang kiểm tra...";
  try {
    let rows = [];
    if (location.protocol !== "file:") {
      const response = await fetch(`/api/client/requests?phone=${encodeURIComponent(phone)}`);
      const result = await response.json();
      rows = result.requests || [];
    } else {
      rows = JSON.parse(localStorage.getItem("khangcat_requests") || "[]").filter((item) => item.phone === phone);
    }
    resultBox.innerHTML = rows.map((item) => `
      <article>
        <b>${item.code}</b>
        <h4>${item.project}</h4>
        <p>Trạng thái: ${STATUS_FROM_API[item.status] || item.statusLabel || item.status}</p>
      </article>
    `).join("") || "Không tìm thấy hồ sơ với số điện thoại này.";
  } catch (error) {
    resultBox.textContent = error.message;
  }
}
