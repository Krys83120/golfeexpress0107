const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Important : on applique withNativeWind AVANT notre propre correctif de
// résolution React, pour ne pas risquer d'écraser une config posée par
// NativeWind (transformer CSS, resolver, etc.) si on l'appliquait après.
let config = getDefaultConfig(__dirname);
config = withNativeWind(config, { input: "./global.css" });

// Le monorepo mélange React 19 (apps mobiles) et React 18 (dashboards web
// Pro/Admin). npm "remonte" (hoist) parfois des paquets partagés comme
// zustand vers le node_modules racine, où ils résolvent alors le React de
// la racine (celui du Pro/Admin) au lieu de celui de cette app,
// provoquant des erreurs "Invalid hook call". On intercepte la résolution
// via `resolveRequest` pour forcer react/react-native vers la copie
// locale de cette app.
const FORCE_LOCAL = ["react", "react-native"];
const localOrigin = path.join(__dirname, "package.json");
const defaultResolveRequest = config.resolver.resolveRequest;

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
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
