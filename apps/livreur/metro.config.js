const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Le monorepo mélange React 19 (apps mobiles) et React 18 (dashboards web
// Pro/Admin). npm "remonte" (hoist) parfois des paquets partagés comme
// zustand vers le node_modules racine, où ils résolvent alors le React de
// la racine (celui du Pro/Admin) au lieu de celui de cette app,
// provoquant des erreurs "Invalid hook call". On force react/react-native
// vers la copie locale de cette app — et de la même façon react-dom /
// react-native-web (uniquement hoisté à la racine, donc résolvant vers le
// React 18 racine) pour l'export web, sinon deux copies de React
// cohabitent et l'app plante avec "ReactCurrentDispatcher" indéfini.
const FORCE_LOCAL = ["react", "react-native", "react-dom", "react-native-web"];
const localOrigin = path.join(__dirname, "package.json");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isForced = FORCE_LOCAL.some(
    (name) => moduleName === name || moduleName.startsWith(name + "/")
  );
  if (isForced) {
    return context.resolveRequest(
      { ...context, originModulePath: localOrigin },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
