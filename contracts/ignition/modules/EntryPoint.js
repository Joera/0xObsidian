const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("EP", (m) => {
 
  const ep = m.contract("EntryPoint", []);
  return { ep };
});
