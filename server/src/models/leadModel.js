const db = require("../db");

module.exports = {
  create: db.createLeadWithOutbox,
  findByCode: db.getLeadByCode,
  findByPhone: db.listLeadsByPhone,
  list: db.listLeads,
  listOutbox: db.listOutboxJobs,
  updateStatus: db.updateLeadStatus,
  updateAssignment: db.updateLeadAssignment,
};
