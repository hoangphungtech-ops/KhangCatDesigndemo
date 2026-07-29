const API_ENDPOINT = "/api/orders";

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").replace(/^84/, "0");
}

function saveLocalRequest(row) {
  const rows = JSON.parse(localStorage.getItem("khangcat_requests") || "[]");
  rows.unshift(row);
  localStorage.setItem("khangcat_requests", JSON.stringify(rows));
}

function nextLocalCode() {
  const seq = (Number(localStorage.getItem("khangcat_seq") || 0) + 1).toString().padStart(5, "0");
  localStorage.setItem("khangcat_seq", String(Number(seq)));
  return `KC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${seq}`;
}

export function initContactForms() {
  document.querySelectorAll("[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = form.querySelector("[data-form-status]");
      const button = form.querySelector("button[type='submit']");
      const data = Object.fromEntries(new FormData(form).entries());
      const payload = {
        name: String(data.name || "").trim(),
        phone: normalizePhone(data.phone),
        email: String(data.email || "").trim().toLowerCase(),
        project: String(data.project || data.projectType || "Tư vấn thiết kế").trim(),
        projectCode: String(data.projectCode || "").trim(),
        address: String(data.address || "").trim(),
        area: String(data.area || "").trim(),
        budget: String(data.budget || "").trim(),
        style: String(data.style || "").trim(),
        message: String(data.message || "").trim(),
        file: "",
        date: new Date().toISOString(),
        source: "website",
      };

      if (payload.name.length < 2 || payload.phone.length < 8 || !payload.email.includes("@") || payload.message.length < 5) {
        status.textContent = "Vui lòng nhập đủ họ tên, số điện thoại, email và nội dung nhu cầu.";
        return;
      }

      button.disabled = true;
      button.textContent = "Đang gửi...";
      status.textContent = "Đang ghi nhận yêu cầu và gửi thông báo tới admin.";
      try {
        if (location.protocol !== "file:") {
          const response = await fetch(API_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.success) throw new Error(result.message || "Không gửi được yêu cầu.");
          payload.code = result.code;
          payload.status = "Mới tiếp nhận";
        } else {
          payload.code = nextLocalCode();
          payload.status = "Mới tiếp nhận";
        }
        saveLocalRequest(payload);
        form.reset();
        status.innerHTML = `✓ Yêu cầu đã được gửi thành công.<br>Mã hồ sơ: <b>${payload.code}</b>`;
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
        button.textContent = "Gửi yêu cầu";
      }
    });
  });
}
