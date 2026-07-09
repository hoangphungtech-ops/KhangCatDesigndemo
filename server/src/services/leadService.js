const leadModel = require("../models/leadModel");

const STATUS_LABELS = {
  new: "Mới tiếp nhận",
  contacted: "Đã liên hệ",
  survey: "Khảo sát",
  quoted: "Báo giá",
  design: "Thiết kế",
  construction: "Thi công",
  completed: "Hoàn thành",
};

const STATUS_PROGRESS = {
  new: 10,
  contacted: 20,
  survey: 35,
  quoted: 50,
  design: 65,
  construction: 85,
  completed: 100,
};

async function createLead(payload) {
  const safePayload = { ...payload };
  delete safePayload.code;
  return leadModel.create(safePayload);
}

async function listAdminLeads(filters) {
  return leadModel.list(filters);
}

async function updateStatus(code, status, actor) {
  return leadModel.updateStatus(code, status, actor);
}

async function updateAssignment(code, assignedTo, expectedDate, actor) {
  return leadModel.updateAssignment(code, assignedTo, expectedDate, actor);
}

function toPortalRecord(lead) {
  return {
    code: lead.code,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    project: lead.project,
    status: lead.status,
    statusLabel: STATUS_LABELS[lead.status] || lead.status,
    progress: STATUS_PROGRESS[lead.status] || 10,
    date: lead.date,
    assignee: lead.assignedTo || "Đang phân công",
    expectedDate: lead.expectedDate || "Đang cập nhật",
    quoteUrl: "",
    contractUrl: "",
    files: [],
    photos: [],
    videos: [],
    notifications: [],
  };
}

async function findClientRequests(phone) {
  const rows = await leadModel.findByPhone(phone);
  return rows.map(toPortalRecord);
}

module.exports = {
  STATUS_LABELS,
  STATUS_PROGRESS,
  createLead,
  listAdminLeads,
  updateStatus,
  updateAssignment,
  findClientRequests,
};
