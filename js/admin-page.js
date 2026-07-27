const STATUS_FROM_API = {
  new: "Mới tiếp nhận",
  contacted: "Đã liên hệ",
  survey: "Khảo sát",
  quoted: "Báo giá",
  design: "Thiết kế",
  construction: "Thi công",
  completed: "Hoàn thành",
};

const STATUS_TO_API = Object.fromEntries(Object.entries(STATUS_FROM_API).map(([key, value]) => [value, key]));

function key() {
  let value = sessionStorage.getItem("khangcat_admin_key") || "";
  if (!value) {
    value = prompt("Nhập mã quản trị KHANGCAT:") || "";
    if (value) sessionStorage.setItem("khangcat_admin_key", value);
  }
  return value;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key()}`,
      ...(options.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Không thể kết nối Dashboard.");
  return result;
}

function rowTemplate(item, index) {
  return `
    <tr>
      <td>${index + 1}</td>
      <td><b>${item.code}</b></td>
      <td>${item.name}</td>
      <td><a href="tel:${item.phone}">${item.phone}</a></td>
      <td>${item.project}</td>
      <td>${new Date(item.date).toLocaleString("vi-VN")}</td>
      <td>
        <select data-code="${item.code}">
          ${Object.entries(STATUS_FROM_API).map(([apiStatus, label]) => `<option value="${apiStatus}" ${item.status === apiStatus ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </td>
    </tr>
  `;
}

async function load() {
  const body = document.querySelector("[data-admin-rows]");
  const stat = document.querySelector("[data-admin-stat]");
  body.innerHTML = `<tr><td colspan="7">Đang tải yêu cầu...</td></tr>`;
  try {
    const result = await api("/api/admin/requests");
    const rows = result.requests || [];
    stat.textContent = `${rows.filter((item) => item.status === "new").length} yêu cầu mới / ${rows.length} tổng yêu cầu`;
    body.innerHTML = rows.map(rowTemplate).join("") || `<tr><td colspan="7">Chưa có yêu cầu.</td></tr>`;
    body.querySelectorAll("select[data-code]").forEach((select) => {
      select.addEventListener("change", async () => {
        await api(`/api/admin/requests/${encodeURIComponent(select.dataset.code)}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: select.value }),
        });
        await load();
      });
    });
  } catch (error) {
    sessionStorage.removeItem("khangcat_admin_key");
    body.innerHTML = `<tr><td colspan="7">${error.message}</td></tr>`;
  }
}

async function testMail() {
  const status = document.querySelector("[data-mail-status]");
  status.textContent = "Đang gửi email test...";
  try {
    const result = await api("/api/admin/test-email", { method: "POST" });
    const delivered = result.result?.delivered?.map((item) => item.recipient).join(", ") || "OK";
    const failed = result.result?.failed?.map((item) => `${item.recipient}: ${item.error}`).join(" | ");
    status.textContent = failed ? `Đã gửi: ${delivered}. Lỗi: ${failed}` : `Resend đã nhận gửi tới: ${delivered}`;
  } catch (error) {
    status.textContent = error.message;
  }
}

document.querySelector("[data-refresh]")?.addEventListener("click", load);
document.querySelector("[data-test-mail]")?.addEventListener("click", testMail);
load();
