import { usePrefs } from "../components/pa/prefs";
import { SHOP_COPY } from "./strings";

/** Shop text in the visitor's chosen language. */
export const useShopCopy = () => SHOP_COPY[usePrefs().lang];
