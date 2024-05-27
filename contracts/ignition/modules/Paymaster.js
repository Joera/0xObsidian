const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("PM", (m) => {
 
  const pm  = m.contract("Paymaster", []);
  return { pm };
});
