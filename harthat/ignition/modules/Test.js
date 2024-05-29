const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TST", (m) => {
 
  const tst = m.contract("Test", []);
  return { tst };
});
