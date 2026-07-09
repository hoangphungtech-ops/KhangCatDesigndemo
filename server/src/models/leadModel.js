const db = require("../db");

module.exports = {
  create: db.createLeadWithOutbox,
  findByCode: db.getLeadByCode,
  findByPhone: db.listLeadsByPhone,
  list: db.listLeads,
  updateStatus: db.updateLeadStatus,
  updateAssignment: db.updateLeadAssignment,
};
