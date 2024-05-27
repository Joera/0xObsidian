const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("AF", (m) => {
 
  const af = m.contract("AccountFactory", []);
  return { af };
});
