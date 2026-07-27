const STATUS_FROM_API = {
  new: "Mới tiếp nhận",
  contacted: "Đã liên hệ",
  survey: "Khảo sát",
  quoted: "Báo giá",
  design: "Thiết kế",
  construction: "Thi công",
  completed: "Hoàn thành",
};

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").replace(/^84/, "0");
}

document.querySelector("[data-client-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const resultBox = document.querySelector("[data-client-result]");
  const phone = normalizePhone(new FormData(event.currentTarget).get("phone"));
  resultBox.textContent = "Đang kiểm tra hồ sơ...";
  try {
    const response = await fetch(`/api/client/requests?phone=${encodeURIComponent(phone)}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Không thể kiểm tra hồ sơ.");
    const rows = result.requests || [];
    resultBox.innerHTML = rows.map((item) => `
      <article class="client-record">
        <span>${item.code}</span>
        <h2>${item.project}</h2>
        <p>Trạng thái: <b>${STATUS_FROM_API[item.status] || item.statusLabel || item.status}</b></p>
        <div class="client-progress"><i style="width:${Number(item.progress || 10)}%"></i></div>
        <p>Người phụ trách: ${item.assignee || "Đang phân công"}</p>
        <p>Ngày dự kiến: ${item.expectedDate || "Đang cập nhật"}</p>
      </article>
    `).join("") || "Không tìm thấy hồ sơ với số điện thoại này.";
  } catch (error) {
    resultBox.textContent = error.message;
  }
});
